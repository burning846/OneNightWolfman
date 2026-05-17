// 游戏状态机集成测试（mock io + 注入角色）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/rooms.js';
import { GameSession } from '../src/game.js';

function makeMockIO() { return { to: () => ({ emit: () => {} }) }; }

function setup(roleArr, selectedRoles = null, center = ['villager', 'villager', 'villager']) {
  const sel = selectedRoles || roleArr.reduce((acc, r) => { acc[r] = (acc[r]||0) + 1; return acc; }, {});
  const room = new Room('TEST');
  room.config.selectedRoles = sel;
  roleArr.forEach((_, i) => room.addPlayer(`P${i + 1}`));
  const game = new GameSession(room, makeMockIO());
  game.initialRoles = [...roleArr];
  game.initialCenter = [...center];
  game.currentRoles = [...roleArr];
  game.currentCenter = [...game.initialCenter];
  game.nightSteps = game.computeNightSteps();
  return { room, game };
}

function stepIdx(game, kind) {
  return game.nightSteps.findIndex(s => s.kind === kind);
}

// ============================================================
// 化身幽灵 - 步骤生成
// ============================================================

test('computeNightSteps 配置选了化身但牌在中央 → doppelganger_choose 步骤照在 + 无人参与', () => {
  const { game } = setup(['werewolf','werewolf','villager','villager'], {
    doppelganger: 1, werewolf: 2, villager: 4,
  });
  const dop = game.nightSteps.find(s => s.kind === 'doppelganger_choose');
  assert.ok(dop, '步骤照存在');
  assert.deepEqual(dop.players, [], '无人参与（化身在中央底牌）');
});

test('computeNightSteps 化身在玩家手里 → 有 doppelganger_choose', () => {
  const { game } = setup(['doppelganger','werewolf','villager','villager'], {
    doppelganger: 1, werewolf: 1, villager: 5,
  });
  assert.equal(game.nightSteps[0].kind, 'doppelganger_choose');
  assert.deepEqual(game.nightSteps[0].players, [0]);
});

test('computeNightSteps 没选化身 → 不应有 doppelganger_choose 步骤', () => {
  const { game } = setup(['werewolf','werewolf','seer','villager'], {
    werewolf: 2, seer: 1, villager: 4,
  });
  assert.ok(!game.nightSteps.some(s => s.kind === 'doppelganger_choose'));
});

// ============================================================
// 化身幽灵 - 时长一致性（反作弊核心）
// ============================================================

test('nightStepMs 对 doppelganger_choose 和其他所有步骤一视同仁', () => {
  const { game } = setup(['doppelganger','werewolf','seer','villager'], {
    doppelganger: 1, werewolf: 1, seer: 1, villager: 4,
  });
  game.room.config.nightStepSeconds = 25;
  // 所有步骤共享同一个 timer 长度
  const ms = game.nightStepMs();
  assert.equal(ms, 25000);
  // 确认所有步骤都不会因为化身在中央等原因而被 "跳过"（即步骤数等于配置）
  assert.ok(game.nightSteps.length >= 4); // doppelganger + werewolf + lone_wolf_peek + seer
});

test('化身在中央时步骤数与化身在手时一致（外部无法分辨）', () => {
  const sel = { doppelganger: 1, werewolf: 1, seer: 1, villager: 4 };

  // 场景 A：化身在玩家手里
  const a = setup(['doppelganger','werewolf','seer','villager'], sel);
  const stepsA = a.game.nightSteps.map(s => s.kind);

  // 场景 B：化身在中央
  const b = setup(['werewolf','seer','villager','villager'], sel);
  const stepsB = b.game.nightSteps.map(s => s.kind);

  assert.deepEqual(stepsA, stepsB, '两种场景的步骤序列必须完全相同');
});

// ============================================================
// 化身幽灵 - 行为正确性
// ============================================================

test('化身复制狼后重生成步骤 + 双狼合并 + 取消独狼参与', () => {
  const { game } = setup(['doppelganger','werewolf','villager','villager'], {
    doppelganger: 1, werewolf: 1, villager: 5,
  });
  game.stepIndex = stepIdx(game, 'doppelganger_choose');
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  const wolfStep = game.nightSteps.find(s => s.kind === 'werewolf_see');
  assert.deepEqual(wolfStep.players.sort(), [0, 1]);
  const lone = game.nightSteps.find(s => s.kind === 'lone_wolf_peek');
  assert.ok(lone);
  assert.deepEqual(lone.players, [], '双狼后没人独狼');
});

test('化身复制村民 → 没有额外步骤但 currentRoles 变成村民', () => {
  const { game } = setup(['doppelganger','villager','werewolf','seer'], {
    doppelganger: 1, werewolf: 1, seer: 1, villager: 4,
  });
  game.stepIndex = stepIdx(game, 'doppelganger_choose');
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'villager');
  // 化身阵营算村民，不需要专属夜晚步骤
  const wolfStep = game.nightSteps.find(s => s.kind === 'werewolf_see');
  assert.deepEqual(wolfStep.players, [2], '只有原狼参与狼步骤');
});

test('化身复制皮匠 → 阵营变 tanner', () => {
  const { game } = setup(['doppelganger','tanner','werewolf','villager'], {
    doppelganger: 1, tanner: 1, werewolf: 1, villager: 4,
  });
  game.stepIndex = stepIdx(game, 'doppelganger_choose');
  game.handleAction(0, { target: 1 });
  assert.equal(game.currentRoles[0], 'tanner');
});

// ============================================================
// 化身幽灵 - 超时随机
// ============================================================

test('化身玩家超时未行动 → 系统随机替他复制其他玩家', () => {
  const { game } = setup(['doppelganger','werewolf','seer','villager'], {
    doppelganger: 1, werewolf: 1, seer: 1, villager: 4,
  });
  game.stepIndex = stepIdx(game, 'doppelganger_choose');
  game.handleStepTimeout();
  // 化身被随机复制成某个其他玩家的角色（不是自己原来的）
  assert.notEqual(game.currentRoles[0], 'doppelganger');
  assert.ok(['werewolf', 'seer', 'villager'].includes(game.currentRoles[0]));
});

test('化身在中央底牌时超时安全（players 为空，不报错）', () => {
  const { game } = setup(['werewolf','seer','villager','villager'], {
    doppelganger: 1, werewolf: 1, seer: 1, villager: 4,
  });
  game.stepIndex = stepIdx(game, 'doppelganger_choose');
  assert.doesNotThrow(() => game.handleStepTimeout());
});

// ============================================================
// 其他原有测试
// ============================================================

test('handleAction robber 互换', () => {
  const { game } = setup(['robber','werewolf','villager']);
  game.stepIndex = stepIdx(game, 'robber_choose');
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  assert.equal(game.currentRoles[1], 'robber');
});

test('handleAction robber 自偷被拒绝', () => {
  const { game } = setup(['robber','villager','villager']);
  game.stepIndex = stepIdx(game, 'robber_choose');
  assert.equal(game.handleAction(0, { target: 0 }), false);
});

test('handleAction troublemaker 互换两人', () => {
  const { game } = setup(['troublemaker','werewolf','villager','seer']);
  game.stepIndex = stepIdx(game, 'troublemaker_choose');
  const ok = game.handleAction(0, { targets: [1, 2] });
  assert.ok(ok);
  assert.equal(game.currentRoles[1], 'villager');
  assert.equal(game.currentRoles[2], 'werewolf');
});

test('handleAction drunk 与中央互换', () => {
  const { game } = setup(['drunk','villager','villager'], null, ['werewolf','seer','tanner']);
  game.stepIndex = stepIdx(game, 'drunk_choose');
  const ok = game.handleAction(0, { centerIdx: 0 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  assert.equal(game.currentCenter[0], 'drunk');
});

test('handleAction seer 玩家版', () => {
  const { room, game } = setup(['seer','werewolf','villager']);
  game.stepIndex = stepIdx(game, 'seer_choose');
  room.players[0].privateLog = [];
  game.handleAction(0, { type: 'player', target: 1 });
  const r = room.players[0].privateLog.pop();
  assert.equal(r.payload.results[0].role, 'werewolf');
});

test('handleAction seer 中央版', () => {
  const { room, game } = setup(['seer','villager','villager'], null, ['werewolf','tanner','hunter']);
  game.stepIndex = stepIdx(game, 'seer_choose');
  room.players[0].privateLog = [];
  game.handleAction(0, { type: 'center', targets: [0, 2] });
  const r = room.players[0].privateLog.pop();
  assert.equal(r.payload.results.length, 2);
  assert.equal(r.payload.results[0].role, 'werewolf');
  assert.equal(r.payload.results[1].role, 'hunter');
});

test('handleAction seer 拒绝相同两张中央', () => {
  const { game } = setup(['seer','villager','villager']);
  game.stepIndex = stepIdx(game, 'seer_choose');
  assert.equal(game.handleAction(0, { type: 'center', targets: [0, 0] }), false);
});

test('handleAction lone_wolf_peek 返回中央牌', () => {
  const { room, game } = setup(['werewolf','villager','seer'], null, ['tanner','hunter','villager']);
  game.stepIndex = stepIdx(game, 'lone_wolf_peek');
  room.players[0].privateLog = [];
  game.handleAction(0, { centerIdx: 1 });
  const r = room.players[0].privateLog.pop();
  assert.equal(r.payload.role, 'hunter');
});

test('handleDone 标记完成但不触发推进', () => {
  const { game } = setup(['werewolf','werewolf','villager']);
  game.stepIndex = stepIdx(game, 'werewolf_see');
  game.handleDone(0);
  game.handleDone(1);
  assert.ok(game.completed.has(0) && game.completed.has(1));
  assert.equal(game.stepTimer, null);
});

test('handleAction 不能重复行动', () => {
  const { game } = setup(['robber','villager','villager']);
  game.stepIndex = stepIdx(game, 'robber_choose');
  assert.ok(game.handleAction(0, { target: 1 }));
  assert.equal(game.handleAction(0, { target: 2 }), false);
});

test('handleVote 累加 + 改投 + 非 vote 阶段拒绝', () => {
  const { game } = setup(['werewolf','villager','villager']);
  game.room.phase = 'night';
  assert.equal(game.handleVote(0, 1), false);

  game.room.phase = 'vote';
  game.handleVote(0, 1);
  game.handleVote(0, 2);
  assert.equal(game.votes[0], 2);
  if (game.voteTimer) clearTimeout(game.voteTimer);
});

test('nightStepMs 钳位 5-120 秒', () => {
  const { game } = setup(['werewolf','villager','villager']);
  game.room.config.nightStepSeconds = 25;
  assert.equal(game.nightStepMs(), 25000);
  game.room.config.nightStepSeconds = 1;
  assert.equal(game.nightStepMs(), 5000);
  game.room.config.nightStepSeconds = 999;
  assert.equal(game.nightStepMs(), 120000);
});

// ============================================================
// 超时随机
// ============================================================

test('handleStepTimeout 强盗未行动 → 随机替他偷', () => {
  const { game } = setup(['robber','villager','seer']);
  game.stepIndex = stepIdx(game, 'robber_choose');
  game.handleStepTimeout();
  // 强盗角色已经被换走
  assert.notEqual(game.currentRoles[0], 'robber');
});

test('handleStepTimeout 捣蛋鬼未行动 → 随机互换两人', () => {
  const { game } = setup(['troublemaker','werewolf','seer','villager']);
  game.stepIndex = stepIdx(game, 'troublemaker_choose');
  const before = [...game.currentRoles];
  game.handleStepTimeout();
  // 捣蛋鬼本身不变，但有两个非自己玩家被互换
  assert.equal(game.currentRoles[0], before[0]);
  const swapped = game.currentRoles.slice(1).filter((r, i) => r !== before[i + 1]).length;
  assert.equal(swapped, 2, '应该有两个玩家的牌被互换');
});

test('handleStepTimeout 纯展示步骤（如 werewolf_see）不出错', () => {
  const { game } = setup(['werewolf','werewolf','villager']);
  game.stepIndex = stepIdx(game, 'werewolf_see');
  // 纯展示步骤没有 random action（kind 不在 switch 里），handleStepTimeout 直接推进
  assert.doesNotThrow(() => game.handleStepTimeout());
});
