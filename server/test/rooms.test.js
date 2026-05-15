// 房间管理测试：增删玩家、host 转移、断线 grace timer、toPublicState
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room, LOBBY_GRACE_MS, createRoom, joinRoom, reconnect } from '../src/rooms.js';

test('LOBBY_GRACE_MS 是 30 秒', () => {
  assert.equal(LOBBY_GRACE_MS, 30000);
});

test('addPlayer：第一名变房主，发 token', () => {
  const r = new Room('1234');
  const p = r.addPlayer('alice');
  assert.equal(p.nickname, 'alice');
  assert.equal(p.userId, null);
  assert.ok(p.id && typeof p.id === 'string');
  assert.ok(p.token && p.token.length >= 16);
  assert.equal(r.hostId, p.id);
});

test('addPlayer with userId 关联账号', () => {
  const r = new Room('1234');
  const p = r.addPlayer('bob', 42);
  assert.equal(p.userId, 42);
});

test('removePlayer：移除房主时 host 自动转给下一位', () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  const b = r.addPlayer('b');
  r.removePlayer(a.id);
  assert.equal(r.hostId, b.id);
  assert.equal(r.players.length, 1);
});

test('removePlayer：所有人都走 host=null', () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  r.removePlayer(a.id);
  assert.equal(r.hostId, null);
});

test('scheduleRemoval：取消后回调不触发', async () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  r.setConnected(a.id, false);
  let fired = false;
  r.scheduleRemoval(a.id, 50, () => { fired = true; });
  r.cancelRemoval(a.id);
  await new Promise(res => setTimeout(res, 80));
  assert.equal(fired, false);
  assert.ok(r.getPlayer(a.id));  // 玩家还在
});

test('scheduleRemoval：宽限期到期则触发 + 玩家被移除', async () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  const b = r.addPlayer('b');
  r.setConnected(a.id, false);
  let fired = false;
  r.scheduleRemoval(a.id, 30, () => { fired = true; });
  await new Promise(res => setTimeout(res, 80));
  assert.equal(fired, true);
  assert.equal(r.getPlayer(a.id), null);
  assert.equal(r.hostId, b.id);
});

test('scheduleRemoval：phase !== lobby 时不会踢人', async () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  r.phase = 'night';   // 已开局
  r.setConnected(a.id, false);
  let fired = false;
  r.scheduleRemoval(a.id, 30, () => { fired = true; });
  await new Promise(res => setTimeout(res, 80));
  assert.equal(fired, false);
  assert.ok(r.getPlayer(a.id));
});

test('scheduleRemoval：玩家又回来上线则不踢', async () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  r.setConnected(a.id, false);
  let fired = false;
  r.scheduleRemoval(a.id, 30, () => { fired = true; });
  // 30ms 之内重新上线
  await new Promise(res => setTimeout(res, 10));
  r.setConnected(a.id, true);
  r.cancelRemoval(a.id);
  await new Promise(res => setTimeout(res, 80));
  assert.equal(fired, false);
  assert.ok(r.getPlayer(a.id));
});

test('cancelAllRemovals 清掉所有 timer', async () => {
  const r = new Room('1234');
  const a = r.addPlayer('a');
  const b = r.addPlayer('b');
  r.setConnected(a.id, false);
  r.setConnected(b.id, false);
  let fired = 0;
  r.scheduleRemoval(a.id, 30, () => { fired++; });
  r.scheduleRemoval(b.id, 30, () => { fired++; });
  r.cancelAllRemovals();
  await new Promise(res => setTimeout(res, 80));
  assert.equal(fired, 0);
});

test('toPublicState lobby 阶段不包含 game 字段', () => {
  const r = new Room('1234');
  r.addPlayer('a');
  const s = r.toPublicState();
  assert.equal(s.dayEndsAt, undefined);
  assert.equal(s.voteProgress, undefined);
  assert.equal(s.result, undefined);
});

test('toPublicState day 阶段透传 dayEndsAt', () => {
  const r = new Room('1234');
  r.addPlayer('a');
  r.phase = 'day';
  r.game = { dayEndsAt: 99999, voteEndsAt: null, votes: {}, result: null };
  const s = r.toPublicState();
  assert.equal(s.dayEndsAt, 99999);
});

test('toPublicState vote 阶段透传 voteProgress', () => {
  const r = new Room('1234');
  r.addPlayer('a');
  r.addPlayer('b');
  r.addPlayer('c');
  r.phase = 'vote';
  r.game = { dayEndsAt: null, voteEndsAt: 99999, votes: { 0: 1, 1: 2 }, result: null };
  const s = r.toPublicState();
  assert.deepEqual(s.voteProgress, { count: 2, total: 3 });
});

test('toPublicState result 阶段透传 result', () => {
  const r = new Room('1234');
  r.addPlayer('a');
  r.phase = 'result';
  r.game = { dayEndsAt: null, voteEndsAt: null, votes: {}, result: { winners: ['village'] } };
  const s = r.toPublicState();
  assert.deepEqual(s.result, { winners: ['village'] });
});

test('toPublicState 玩家公开字段含 isLoggedIn', () => {
  const r = new Room('1234');
  const a = r.addPlayer('a', 42);  // 已登录
  const b = r.addPlayer('b');       // 匿名
  const s = r.toPublicState();
  const ap = s.players.find(p => p.id === a.id);
  const bp = s.players.find(p => p.id === b.id);
  assert.equal(ap.isLoggedIn, true);
  assert.equal(bp.isLoggedIn, false);
});

test('isEmpty: 没人或所有人都离线', () => {
  const r = new Room('1234');
  assert.ok(r.isEmpty());  // 空
  const a = r.addPlayer('a');
  assert.ok(!r.isEmpty());
  r.setConnected(a.id, false);
  assert.ok(r.isEmpty());   // 全离线
});

test('createRoom + joinRoom + reconnect 全流程', () => {
  const { room, player } = createRoom('alice');
  assert.ok(room.code);
  assert.equal(player.nickname, 'alice');

  const joined = joinRoom(room.code, 'bob');
  assert.ok(joined.ok);
  assert.equal(joined.room.players.length, 2);

  // 重复昵称应失败
  const dup = joinRoom(room.code, 'alice');
  assert.equal(dup.ok, false);

  // token 正确才能重连
  const recon = reconnect(room.code, player.id, player.token);
  assert.ok(recon.ok);
  const wrong = reconnect(room.code, player.id, 'wrong-token');
  assert.equal(wrong.ok, false);
});

test('joinRoom: 房间不存在', () => {
  const r = joinRoom('9999', 'x');
  assert.equal(r.ok, false);
  assert.match(r.error, /房间不存在/);
});

test('joinRoom: 游戏进行中不能加入', () => {
  const { room } = createRoom('a');
  room.phase = 'night';
  const r = joinRoom(room.code, 'b');
  assert.equal(r.ok, false);
});
