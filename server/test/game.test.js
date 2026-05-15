// 游戏状态机测试：用 mockIO 抓取所有 emit 事件，断言流程正确
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/rooms.js';
import { GameSession } from '../src/game.js';

// 模拟 socket.io 的 server 对象，记录所有 emit
function makeMockIO() {
  const log = [];  // [{ target, event, payload }]
  const io = {
    to(target) {
      return {
        emit(event, payload) {
          log.push({ target, event, payload });
        },
      };
    },
  };
  return { io, log };
}

function setupRoom(roleArr) {
  // roleArr 决定每位玩家的初始角色（顺序就是 idx）
  const { io, log } = makeMockIO();
  const room = new Room('1234');
  for (let i = 0; i < roleArr.length; i++) {
    room.addPlayer(`P${i + 1}`);
  }
  // 让我们手动注入角色，跳过随机洗牌
  const game = new GameSession(room, io);
  game.initialRoles = [...roleArr];
  game.initialCenter = ['villager', 'villager', 'villager'];  // 占位
  game.currentRoles = [...roleArr];
  game.currentCenter = [...game.initialCenter];
  game.nightSteps = game.computeNightSteps();
  return { room, game, io, log };
}

test('GameSession.computeNightSteps：有化身时第一步是 doppelganger_choose', () => {
  const { game } = setupRoom(['doppelganger', 'werewolf', 'villager', 'villager']);
  assert.equal(game.nightSteps[0].kind, 'doppelganger_choose');
  assert.deepEqual(game.nightSteps[0].players, [0]);
});

test('GameSession.computeNightSteps：无化身时无 doppelganger_choose', () => {
  const { game } = setupRoom(['werewolf', 'werewolf', 'villager']);
  assert.ok(!game.nightSteps.some(s => s.kind === 'doppelganger_choose'));
});

test('handleAction doppelganger：复制狼人后 currentRoles 更新 + 重生成步骤', () => {
  const { game } = setupRoom(['doppelganger', 'werewolf', 'villager', 'villager']);
  game.stepIndex = 0;  // 当前在 doppelganger_choose
  const ok = game.handleAction(0, { target: 1 });   // 化身复制玩家 1 (狼人)
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  assert.equal(game.doppelgangerCopies[0], 'werewolf');
  // 重新生成的后续步骤里，狼人步骤应包含化身 + 原狼人
  const wolfStep = game.nightSteps.find(s => s.kind === 'werewolf_see');
  assert.ok(wolfStep);
  assert.deepEqual(wolfStep.players.sort(), [0, 1]);
  // 双狼后不该再有 lone_wolf_peek
  assert.ok(!game.nightSteps.some(s => s.kind === 'lone_wolf_peek'));
});

test('handleAction doppelganger：复制村民 → 无后续夜晚动作但阵营 = village', () => {
  const { game } = setupRoom(['doppelganger', 'villager', 'werewolf', 'seer']);
  game.stepIndex = 0;
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'villager');
  // 重生成后没有专属步骤，但其他角色步骤仍存在
  assert.ok(game.nightSteps.some(s => s.kind === 'werewolf_see'));
  assert.ok(game.nightSteps.some(s => s.kind === 'seer_choose'));
});

test('handleAction robber：互换角色 + 私发新角色', () => {
  const { game } = setupRoom(['robber', 'werewolf', 'villager']);
  const stepIdx = game.nightSteps.findIndex(s => s.kind === 'robber_choose');
  game.stepIndex = stepIdx;
  const ok = game.handleAction(0, { target: 1 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');  // 强盗变成狼了
  assert.equal(game.currentRoles[1], 'robber');     // 被偷的变成强盗
});

test('handleAction robber：拒绝自己偷自己', () => {
  const { game } = setupRoom(['robber', 'villager', 'villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'robber_choose');
  const ok = game.handleAction(0, { target: 0 });
  assert.equal(ok, false);
});

test('handleAction troublemaker：互换两人 + 不暴露牌', () => {
  const { game } = setupRoom(['troublemaker', 'werewolf', 'villager', 'seer']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'troublemaker_choose');
  const ok = game.handleAction(0, { targets: [1, 2] });
  assert.ok(ok);
  assert.equal(game.currentRoles[1], 'villager');
  assert.equal(game.currentRoles[2], 'werewolf');
});

test('handleAction troublemaker：不能包含自己', () => {
  const { game } = setupRoom(['troublemaker', 'werewolf', 'villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'troublemaker_choose');
  const ok = game.handleAction(0, { targets: [0, 1] });
  assert.equal(ok, false);
});

test('handleAction drunk：与中央底牌交换', () => {
  const { game } = setupRoom(['drunk', 'villager', 'villager']);
  // 设置个有特征的中央牌
  game.initialCenter = ['werewolf', 'seer', 'tanner'];
  game.currentCenter = [...game.initialCenter];
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'drunk_choose');
  const ok = game.handleAction(0, { centerIdx: 0 });
  assert.ok(ok);
  assert.equal(game.currentRoles[0], 'werewolf');
  assert.equal(game.currentCenter[0], 'drunk');
});

test('handleAction seer 玩家版：返回正确角色', () => {
  const { game } = setupRoom(['seer', 'werewolf', 'villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'seer_choose');
  // mock player 加 privateLog
  game.room.players[0].privateLog = [];
  game.io = {
    to: () => ({ emit: () => {} }),
  };
  const ok = game.handleAction(0, { type: 'player', target: 1 });
  assert.ok(ok);
  const last = game.room.players[0].privateLog.pop();
  assert.equal(last.event, 'night_reveal');
  assert.equal(last.payload.kind, 'seer_reveal');
  assert.equal(last.payload.results[0].role, 'werewolf');
});

test('handleAction seer 中央版：返回 2 张底牌', () => {
  const { game } = setupRoom(['seer', 'villager', 'villager']);
  game.initialCenter = ['werewolf', 'tanner', 'hunter'];
  game.currentCenter = [...game.initialCenter];
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'seer_choose');
  game.room.players[0].privateLog = [];
  game.io = { to: () => ({ emit: () => {} }) };
  const ok = game.handleAction(0, { type: 'center', targets: [0, 2] });
  assert.ok(ok);
  const last = game.room.players[0].privateLog.pop();
  assert.equal(last.payload.kind, 'seer_reveal');
  assert.equal(last.payload.results.length, 2);
  assert.equal(last.payload.results[0].role, 'werewolf');
  assert.equal(last.payload.results[1].role, 'hunter');
});

test('handleAction seer 中央版：拒绝重复底牌', () => {
  const { game } = setupRoom(['seer', 'villager', 'villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'seer_choose');
  const ok = game.handleAction(0, { type: 'center', targets: [0, 0] });
  assert.equal(ok, false);
});

test('handleAction lone_wolf_peek：返回查看的中央牌', () => {
  const { game } = setupRoom(['werewolf', 'villager', 'seer']);  // 单狼
  game.initialCenter = ['tanner', 'hunter', 'villager'];
  game.currentCenter = [...game.initialCenter];
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'lone_wolf_peek');
  game.room.players[0].privateLog = [];
  game.io = { to: () => ({ emit: () => {} }) };
  const ok = game.handleAction(0, { centerIdx: 1 });
  assert.ok(ok);
  const last = game.room.players[0].privateLog.pop();
  assert.equal(last.payload.role, 'hunter');
});

test('handleDone 收齐所有当事人时 stepTimer 重置', () => {
  const { game } = setupRoom(['werewolf', 'werewolf', 'villager']);
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === 'werewolf_see');
  game.handleDone(0);
  assert.equal(game.completed.size, 1);
  game.handleDone(1);
  assert.equal(game.completed.size, 2);
  // 此时 stepTimer 应该被重置为下一步的 timer（不为 null）
  assert.ok(game.stepTimer);
  clearTimeout(game.stepTimer);
});

test('handleVote 累加投票 + 满员触发结算', () => {
  const { game } = setupRoom(['werewolf', 'villager', 'villager']);
  game.room.phase = 'vote';
  game.io = { to: () => ({ emit: () => {} }) };
  assert.ok(game.handleVote(0, 1));
  assert.ok(game.handleVote(1, 0));
  assert.ok(game.handleVote(2, 0));
  assert.equal(Object.keys(game.votes).length, 3);
  // 应安排了 endVote 定时器
  // 清理避免污染其他测试
  if (game.voteTimer) clearTimeout(game.voteTimer);
});

test('handleVote 拒绝非 vote 阶段', () => {
  const { game } = setupRoom(['werewolf', 'villager', 'villager']);
  game.room.phase = 'night';
  assert.equal(game.handleVote(0, 1), false);
});

test('handleVote 同一玩家可以改投', () => {
  const { game } = setupRoom(['werewolf', 'villager', 'villager']);
  game.room.phase = 'vote';
  game.io = { to: () => ({ emit: () => {} }) };
  game.handleVote(0, 1);
  game.handleVote(0, 2);  // 改投
  assert.equal(game.votes[0], 2);
  if (game.voteTimer) clearTimeout(game.voteTimer);
});
