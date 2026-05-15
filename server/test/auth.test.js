// 用户系统测试。
// auth.js 依赖 bcryptjs / jsonwebtoken，未 npm install 时整个 suite 自动 skip。
// 完整测试还需 DATABASE_URL（真实 Postgres）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

let authModule = null;
try {
  authModule = await import('../src/auth.js');
} catch (e) {
  // 缺依赖；下面用 skip 包住
}

const DEPS_OK = !!authModule;
const HAS_DB  = DEPS_OK && !!process.env.DATABASE_URL;

test('verifyToken 拒绝乱码 token', { skip: !DEPS_OK }, () => {
  assert.equal(authModule.verifyToken('definitely-not-a-token'), null);
  assert.equal(authModule.verifyToken(''), null);
  assert.equal(authModule.verifyToken(null), null);
});

test('完整账号链路（需要 DATABASE_URL）', { skip: !HAS_DB }, async () => {
  const { initDb } = await import('../src/db.js');
  const { registerUser, loginUser, getUserById, verifyToken } = authModule;
  const ok = await initDb();
  assert.ok(ok, 'DB init 应成功');

  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const reg = await registerUser({ email, password: 'pw12345', nickname: 'tester' });
  assert.ok(reg.ok);
  assert.equal(reg.user.email, email);
  assert.ok(reg.token);

  const dup = await registerUser({ email, password: 'pw12345', nickname: 'tester2' });
  assert.equal(dup.ok, false);

  const login = await loginUser({ email, password: 'pw12345' });
  assert.ok(login.ok);

  const wrong = await loginUser({ email, password: 'wrong' });
  assert.equal(wrong.ok, false);

  const decoded = verifyToken(login.token);
  assert.ok(decoded && decoded.uid);
  const me = await getUserById(decoded.uid);
  assert.equal(me.email, email);
});
