// 游戏状态机集成测试（mock io + 注入角色）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/rooms.js';
import { GameSession } from '../src/game.js';

function makeMockIO() {
  return { to: () => ({ emit: () => {} }) };
}

function setup(roleArr, selectedRoles = null) {
  // 默认 selectedRoles 由 roleArr 推断（每种角色至少 1）
  const sel = selectedRoles || roleArr.reduce((acc, r) => { acc[r] = (acc[r]||0) + 1; return acc; }, {});
  const room = new Room('TEST');
  room.config.selectedRoles = sel;
  roleArr.forEach((_, i) => room.addPlayer(`P${i + 1}`));
  const game = new GameSession(room, makeMockIO());
  game.initialRoles = [...roleArr];
  game.initialCenter = ['villager', 'villager', 'villager'];
  game.currentRoles = [...roleArr];
  game.currentCenter = [...game.initialCenter];
  game.nightSteps = game.computeNightSteps();
  return { room, game };
}

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

test('handleAction doppelganger 复制狼后重生成步骤 + 双狼合并 + 取消独狼', () => {
  const { game } = setup(['doppelganger','werewolf','villager','villager'], {
    doppelganger: 1, werewolf: 1, villager: 5,
  });
  game.stepIndex = 0;
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  const wolfStep = game.nightSteps.find(s => s.kind === 'werewolf_see');
  assert.deepEqual(wolfStep.players.sort(), [0, 1]);
  // 双狼后 lone_wolf_peek 步骤里没人参与
  const lone = game.nightSteps.find(s => s.kind === 'lone_wolf_peek');
  assert.ok(lone);
  assert.deepEqual(lone.players, []);
});

test('handleAction robber 互换', () => {
  const { game } = setup(['robber','werewolf','villager']);
  const idx = game.nightSteps.findIndex(s => s.kind === 'robber_choose');
  game.stepIndex = idx;
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  assert.equal(game.currentRoles[1], 'robber');
});

test('handleAction robber 自偷被拒绝', () => {
  const { game } = setup(['robber','villager','villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'robber_choose');
  assert.equal(game.handleAction(0, { target: 0 }), false);
});

test('handleAction troublemaker 互换两人', () => {
  const { game } = setup(['troublemaker','werewolf','villager','seer']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'troublemaker_choose');
  const ok = game.handleAction(0, { targets: [1, 2] });
  assert.ok(ok);
  assert.equal(game.currentRoles[1], 'villager');
  assert.equal(game.currentRoles[2], 'werewolf');
});

test('handleAction drunk 与中央互换', () => {
  const { game } = setup(['drunk','villager','villager']);
  game.initialCenter = ['werewolf', 'seer', 'tanner'];
  game.currentCenter = [...game.initialCenter];
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'drunk_choose');
  const ok = game.handleAction(0, { centerIdx: 0 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  assert.equal(game.currentCenter[0], 'drunk');
});

test('handleAction seer 玩家版返回正确角色', () => {
  const { room, game } = setup(['seer','werewolf','villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'seer_choose');
  room.players[0].privateLog = [];
  const ok = game.handleAction(0, { type: 'player', target: 1 });
  assert.ok(ok);
  const r = room.players[0].privateLog.pop();
  assert.equal(r.payload.results[0].role, 'werewolf');
});

test('handleAction seer 中央版返回 2 张底牌', () => {
  const { room, game } = setup(['seer','villager','villager']);
  game.initialCenter = ['werewolf','tanner','hunter'];
  game.currentCenter = [...game.initialCenter];
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'seer_choose');
  room.players[0].privateLog = [];
  const ok = game.handleAction(0, { type: 'center', targets: [0, 2] });
  assert.ok(ok);
  const r = room.players[0].privateLog.pop();
  assert.equal(r.payload.results.length, 2);
  assert.equal(r.payload.results[0].role, 'werewolf');
  assert.equal(r.payload.results[1].role, 'hunter');
});

test('handleAction seer 拒绝相同的两张中央', () => {
  const { game } = setup(['seer','villager','villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'seer_choose');
  assert.equal(game.handleAction(0, { type: 'center', targets: [0, 0] }), false);
});

test('handleAction lone_wolf_peek 返回中央牌', () => {
  const { room, game } = setup(['werewolf','villager','seer']);
  game.initialCenter = ['tanner','hunter','villager'];
  game.currentCenter = [...game.initialCenter];
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'lone_wolf_peek');
  room.players[0].privateLog = [];
  const ok = game.handleAction(0, { centerIdx: 1 });
  assert.ok(ok);
  const r = room.players[0].privateLog.pop();
  assert.equal(r.payload.role, 'hunter');
});

test('handleDone 标记完成但不触发推进（反作弊：步骤固定时长）', () => {
  const { game } = setup(['werewolf','werewolf','villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'werewolf_see');
  game.handleDone(0);
  assert.ok(game.completed.has(0));
  game.handleDone(1);
  assert.ok(game.completed.has(1));
  // 不应该有任何 timer 被重置
  assert.equal(game.stepTimer, null);
});

test('handleAction 不能重复行动', () => {
  const { game } = setup(['robber','villager','villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'robber_choose');
  assert.ok(game.handleAction(0, { target: 1 }));
  assert.equal(game.handleAction(0, { target: 2 }), false, '第二次应被拒绝');
});

test('handleVote 累加投票', () => {
  const { game } = setup(['werewolf','villager','villager']);
  game.room.phase = 'vote';
  assert.ok(game.handleVote(0, 1));
  assert.ok(game.handleVote(1, 0));
  assert.ok(game.handleVote(2, 0));
  assert.equal(Object.keys(game.votes).length, 3);
  if (game.voteTimer) clearTimeout(game.voteTimer);
});

test('handleVote 拒绝非 vote 阶段', () => {
  const { game } = setup(['werewolf','villager','villager']);
  game.room.phase = 'night';
  assert.equal(game.handleVote(0, 1), false);
});

test('handleVote 可以改投', () => {
  const { game } = setup(['werewolf','villager','villager']);
  game.room.phase = 'vote';
  game.handleVote(0, 1);
  game.handleVote(0, 2);
  assert.equal(game.votes[0], 2);
  if (game.voteTimer) clearTimeout(game.voteTimer);
});

test('nightStepMs 返回毫秒，受配置约束', () => {
  const { game } = setup(['werewolf','villager','villager']);
  game.room.config.nightStepSeconds = 25;
  assert.equal(game.nightStepMs(), 25000);
  game.room.config.nightStepSeconds = 1;     // 太短
  assert.equal(game.nightStepMs(), 5000, '<5 被钳到 5');
  game.room.config.nightStepSeconds = 999;   // 太长
  assert.equal(game.nightStepMs(), 120000, '>120 被钳到 120');
});
