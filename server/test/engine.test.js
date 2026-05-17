// 纯函数引擎测试
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dealCards,
  generateNightSteps,
  randomActionFor,
  resolveKilled,
  determineWinners,
  validateConfig,
  generateRoomCode,
} from '../src/engine.js';

test('generateRoomCode 4 位数字', () => {
  for (let i = 0; i < 30; i++) assert.ok(/^\d{4}$/.test(generateRoomCode()));
});

test('dealCards 数量 + 守恒', () => {
  const cfg = { werewolf: 2, seer: 1, robber: 1, troublemaker: 1, villager: 2 };
  const { initialPlayerRoles, initialCenter } = dealCards(cfg, 4);
  assert.equal(initialPlayerRoles.length, 4);
  assert.equal(initialCenter.length, 3);
  const counts = {};
  for (const r of [...initialPlayerRoles, ...initialCenter]) counts[r] = (counts[r] || 0) + 1;
  assert.deepEqual(counts, cfg);
});

test('dealCards 数量不对抛错', () => {
  assert.throws(() => dealCards({ werewolf: 1, villager: 1 }, 4));
});

// ============================================================
// 反作弊改造测试：步骤基于 selectedRoles 配置生成
// ============================================================

test('generateNightSteps 基于配置：狼选了即使没人是狼 步骤照生成', () => {
  // 配置选了狼人，但实际玩家都是村民（狼在中央底牌）
  const selectedRoles = { werewolf: 1, villager: 3 };
  const currentRoles = ['villager', 'villager', 'villager', 'villager'];
  const steps = generateNightSteps(selectedRoles, currentRoles);
  assert.ok(steps.find(s => s.kind === 'werewolf_see'), '狼人步骤应存在');
  assert.ok(steps.find(s => s.kind === 'lone_wolf_peek'), '独狼步骤应存在');
  // 但实际无人参与
  const wolfStep = steps.find(s => s.kind === 'werewolf_see');
  assert.deepEqual(wolfStep.players, []);
});

test('generateNightSteps 基于配置：没选爪牙 → 无 minion_see 步骤', () => {
  const selectedRoles = { werewolf: 2, villager: 5 };
  const currentRoles = ['werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'];
  const steps = generateNightSteps(selectedRoles, currentRoles);
  assert.ok(!steps.some(s => s.kind === 'minion_see'));
});

test('generateNightSteps 配置选爪牙但牌在中央 → 步骤照走，无参与者', () => {
  const selectedRoles = { werewolf: 2, minion: 1, villager: 1 };
  const currentRoles = ['werewolf', 'werewolf', 'villager', 'villager'];
  // 4 玩家 + 3 中央 = 7 张；配置共 4 角色 不匹配，但 generateNightSteps 只看 currentRoles
  // 在测试里我们只关注步骤生成逻辑
  const steps = generateNightSteps(selectedRoles, currentRoles);
  const minion = steps.find(s => s.kind === 'minion_see');
  assert.ok(minion, '配置选了爪牙 步骤应存在');
  assert.deepEqual(minion.players, []);
});

test('generateNightSteps 单狼有 lone_wolf_peek 且 players 非空', () => {
  const sel = { werewolf: 1, seer: 1, villager: 5 };
  const cur = ['werewolf', 'seer', 'villager', 'villager'];
  const steps = generateNightSteps(sel, cur);
  const lone = steps.find(s => s.kind === 'lone_wolf_peek');
  assert.ok(lone);
  assert.deepEqual(lone.players, [0]);
});

test('generateNightSteps 双狼时 lone_wolf_peek 仍存在但 players 为空', () => {
  const sel = { werewolf: 2, villager: 5 };
  const cur = ['werewolf', 'werewolf', 'villager', 'villager'];
  const steps = generateNightSteps(sel, cur);
  const lone = steps.find(s => s.kind === 'lone_wolf_peek');
  assert.ok(lone, '步骤照存在');
  assert.deepEqual(lone.players, [], '没有当事人 → 跑空 timer');
});

test('generateNightSteps 全开角色顺序正确', () => {
  const sel = { werewolf: 2, minion: 1, mason: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1 };
  const cur = ['werewolf','werewolf','minion','mason','mason','seer','robber','troublemaker','drunk','insomniac'];
  const steps = generateNightSteps(sel, cur);
  const order = steps.map(s => s.kind);
  assert.deepEqual(order, [
    'werewolf_see', 'lone_wolf_peek',
    'minion_see', 'mason_see', 'seer_choose',
    'robber_choose', 'troublemaker_choose', 'drunk_choose', 'insomniac_see',
  ]);
});

// ============================================================
// 随机动作生成（超时随机）
// ============================================================

test('randomActionFor doppelganger/robber 返回合法 target', () => {
  for (let i = 0; i < 20; i++) {
    const a = randomActionFor('robber_choose', 0, 5);
    assert.ok(typeof a.target === 'number');
    assert.ok(a.target !== 0 && a.target >= 0 && a.target < 5);
  }
});

test('randomActionFor lone_wolf_peek/drunk 返回 0-2 之间的 centerIdx', () => {
  for (let i = 0; i < 20; i++) {
    const a = randomActionFor('drunk_choose', 0, 5);
    assert.ok([0,1,2].includes(a.centerIdx));
  }
});

test('randomActionFor seer 是 player 或 center 之一', () => {
  let sawPlayer = false, sawCenter = false;
  for (let i = 0; i < 100; i++) {
    const a = randomActionFor('seer_choose', 0, 5);
    if (a.type === 'player') {
      sawPlayer = true;
      assert.ok(a.target !== 0);
    } else {
      sawCenter = true;
      assert.equal(a.targets.length, 2);
      assert.notEqual(a.targets[0], a.targets[1]);
    }
  }
  assert.ok(sawPlayer && sawCenter, '应该两种模式都出现过');
});

test('randomActionFor troublemaker 返回 2 个不同的非自己玩家', () => {
  for (let i = 0; i < 20; i++) {
    const a = randomActionFor('troublemaker_choose', 0, 5);
    assert.equal(a.targets.length, 2);
    assert.notEqual(a.targets[0], a.targets[1]);
    assert.ok(a.targets[0] !== 0 && a.targets[1] !== 0);
  }
});

test('randomActionFor 纯展示步骤返回 null', () => {
  assert.equal(randomActionFor('werewolf_see', 0, 5), null);
  assert.equal(randomActionFor('minion_see', 0, 5), null);
  assert.equal(randomActionFor('mason_see', 0, 5), null);
  assert.equal(randomActionFor('insomniac_see', 0, 5), null);
});

// ============================================================
// 计票 / 胜负 / 配置校验
// ============================================================

test('resolveKilled 1 票不淘汰', () => {
  const r = resolveKilled({ 0: 1, 1: 2, 2: 0 }, 3, ['v','v','v']);
  assert.deepEqual(r.killed, []);
});

test('resolveKilled 2 票淘汰', () => {
  const r = resolveKilled({ 0: 1, 1: 2, 2: 1 }, 3, ['v','w','v']);
  assert.deepEqual(r.killed, [1]);
});

test('resolveKilled 平票全淘汰', () => {
  const r = resolveKilled({ 0: 1, 1: 0, 2: 1, 3: 0 }, 4, ['v','v','v','v']);
  assert.deepEqual(r.killed.sort(), [0, 1]);
});

test('resolveKilled 猎人连带', () => {
  const r = resolveKilled({ 0: 2, 1: 0, 2: 0, 3: 1 }, 4, ['hunter','villager','werewolf','villager']);
  assert.deepEqual(r.killed.sort(), [0, 2]);
  assert.deepEqual(r.hunterChain, [2]);
});

test('determineWinners 各种胜负组合', () => {
  assert.deepEqual(determineWinners(['werewolf','villager','seer'], [0]), ['village']);
  assert.deepEqual(determineWinners(['werewolf','villager','seer'], []), ['werewolf']);
  assert.deepEqual(determineWinners(['villager','villager','seer'], []), ['village']);
  assert.deepEqual(determineWinners(['villager','seer','robber'], [0]), []);
  assert.deepEqual(determineWinners(['tanner','werewolf','villager'], [0]), ['tanner']);
  assert.deepEqual(determineWinners(['tanner','werewolf','villager'], [0, 1]).sort(), ['tanner','village']);
});

test('validateConfig', () => {
  assert.equal(validateConfig({ werewolf: 2, seer: 1, robber: 1, troublemaker: 1, villager: 2 }, 4), null);
  assert.match(validateConfig({ werewolf: 1, villager: 1 }, 4), /需要 7/);
  assert.match(validateConfig({ villager: 7 }, 4), /狼人/);
  assert.match(validateConfig({ werewolf: 1, mason: 1, villager: 5 }, 4), /守夜人/);
});
