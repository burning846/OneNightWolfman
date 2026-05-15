// 纯函数引擎测试：洗牌 / 发牌 / 夜晚步骤生成 / 计票 / 胜负 / 配置校验
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dealCards,
  generateNightSteps,
  resolveKilled,
  determineWinners,
  validateConfig,
  generateRoomCode,
} from '../src/engine.js';

test('generateRoomCode 输出 4 位数字字符串', () => {
  for (let i = 0; i < 50; i++) {
    const c = generateRoomCode();
    assert.equal(typeof c, 'string');
    assert.equal(c.length, 4);
    assert.ok(/^\d{4}$/.test(c));
  }
});

test('dealCards 数量正确 + 牌库平衡', () => {
  const cfg = { werewolf: 2, seer: 1, robber: 1, troublemaker: 1, villager: 2 };  // 7 张
  const { initialPlayerRoles, initialCenter } = dealCards(cfg, 4);
  assert.equal(initialPlayerRoles.length, 4);
  assert.equal(initialCenter.length, 3);

  // 总牌数应等于配置总和
  const all = [...initialPlayerRoles, ...initialCenter];
  const counts = {};
  for (const r of all) counts[r] = (counts[r] || 0) + 1;
  assert.deepEqual(counts, cfg);
});

test('dealCards 牌数对不上时抛错', () => {
  const cfg = { werewolf: 1, villager: 1 }; // 2 张但需要 4+3=7
  assert.throws(() => dealCards(cfg, 4));
});

test('generateNightSteps 单狼时附带 lone_wolf_peek', () => {
  const steps = generateNightSteps(['werewolf', 'villager', 'seer']);
  const kinds = steps.map(s => s.kind);
  assert.ok(kinds.includes('werewolf_see'));
  assert.ok(kinds.includes('lone_wolf_peek'));
  assert.ok(kinds.includes('seer_choose'));
});

test('generateNightSteps 双狼无 lone_wolf_peek', () => {
  const steps = generateNightSteps(['werewolf', 'werewolf', 'villager']);
  assert.ok(!steps.some(s => s.kind === 'lone_wolf_peek'));
});

test('generateNightSteps 守夜人独行也生成步骤（玩家自己看到没有同伴）', () => {
  const steps = generateNightSteps(['mason', 'villager', 'werewolf']);
  assert.ok(steps.some(s => s.kind === 'mason_see'));
});

test('generateNightSteps 没有任何夜晚角色 → 空步骤', () => {
  const steps = generateNightSteps(['villager', 'villager', 'hunter']);
  assert.equal(steps.length, 0);
});

test('generateNightSteps 步骤顺序：狼 → 爪牙 → 守夜 → 预言 → 强盗 → 捣蛋 → 酒鬼 → 失眠', () => {
  const steps = generateNightSteps([
    'werewolf','werewolf','minion','mason','mason','seer','robber','troublemaker','drunk','insomniac',
  ]);
  const order = steps.map(s => s.kind);
  const expected = [
    'werewolf_see',
    'minion_see',
    'mason_see',
    'seer_choose',
    'robber_choose',
    'troublemaker_choose',
    'drunk_choose',
    'insomniac_see',
  ];
  assert.deepEqual(order, expected);
});

test('resolveKilled 多数票：1 票不淘汰', () => {
  const r = resolveKilled({ 0: 1, 1: 2, 2: 0 }, 3, ['villager','villager','villager']);
  assert.deepEqual(r.killed, []);
});

test('resolveKilled 2 票淘汰', () => {
  const r = resolveKilled({ 0: 1, 1: 2, 2: 1 }, 3, ['villager','werewolf','villager']);
  assert.deepEqual(r.killed, [1]);
});

test('resolveKilled 平票，全部淘汰', () => {
  const r = resolveKilled({ 0: 1, 1: 0, 2: 1, 3: 0 }, 4, ['v','v','v','v']);
  assert.deepEqual(r.killed.sort(), [0, 1]);
});

test('resolveKilled 猎人连带带走投票目标', () => {
  // 玩家 0 (猎人) 投玩家 2 (狼)。0 和 1 都获 2 票。0 死后带走 2。
  const r = resolveKilled(
    { 0: 2, 1: 0, 2: 0, 3: 1 },
    4,
    ['hunter','villager','werewolf','villager']
  );
  // counts: [2(from 1,2), 1(from 3), 1(from 0), 0]
  // max=2, 只 0 死亡 → hunter chain 把 2 也带走
  assert.deepEqual(r.killed.sort(), [0, 2]);
  assert.deepEqual(r.hunterChain, [2]);
});

test('determineWinners 狼人死 → 村庄赢', () => {
  const w = determineWinners(['werewolf','villager','seer'], [0]);
  assert.deepEqual(w, ['village']);
});

test('determineWinners 牌中有狼但没人死 → 狼人赢', () => {
  const w = determineWinners(['werewolf','villager','seer'], []);
  assert.deepEqual(w, ['werewolf']);
});

test('determineWinners 牌中无狼且没人死 → 村庄赢', () => {
  const w = determineWinners(['villager','villager','seer'], []);
  assert.deepEqual(w, ['village']);
});

test('determineWinners 牌中无狼但死了人 → 无人赢', () => {
  const w = determineWinners(['villager','seer','robber'], [0]);
  assert.deepEqual(w, []);
});

test('determineWinners 皮匠死 → 皮匠赢', () => {
  const w = determineWinners(['tanner','werewolf','villager'], [0]);
  assert.deepEqual(w, ['tanner']);
});

test('determineWinners 皮匠+狼一起死 → 皮匠 + 村庄都赢', () => {
  const w = determineWinners(['tanner','werewolf','villager'], [0, 1]);
  assert.deepEqual(w.sort(), ['tanner', 'village']);
});

test('determineWinners 皮匠死但狼没死 → 只皮匠赢（狼不赢）', () => {
  const w = determineWinners(['tanner','werewolf','villager'], [0]);
  assert.deepEqual(w, ['tanner']);
});

test('validateConfig 合法配置返回 null', () => {
  const err = validateConfig(
    { werewolf: 2, seer: 1, robber: 1, troublemaker: 1, villager: 2 },
    4
  );
  assert.equal(err, null);
});

test('validateConfig 牌数不够', () => {
  const err = validateConfig({ werewolf: 1, villager: 1 }, 4);
  assert.ok(err && err.includes('需要 7'));
});

test('validateConfig 无狼', () => {
  const err = validateConfig({ villager: 7 }, 4);
  assert.ok(err && err.includes('狼人'));
});

test('validateConfig 守夜人只有 1', () => {
  const err = validateConfig({ werewolf: 1, mason: 1, villager: 5 }, 4);
  assert.ok(err && err.includes('守夜人'));
});
