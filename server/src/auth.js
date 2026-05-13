// 注册 / 登录 / token / 个人资料 / 战绩
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, isDbReady } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || ('dev-insecure-' + Math.random().toString(36).slice(2));
const JWT_EXPIRES = '30d';
const BCRYPT_ROUNDS = 10;

function publicUser(row) {
  return { id: row.id, email: row.email, nickname: row.nickname, avatar: row.avatar };
}

function signToken(user) {
  return jwt.sign({ uid: user.id, nick: user.nickname }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

export async function registerUser({ email, password, nickname }) {
  if (!isDbReady()) return { ok: false, error: '用户系统未启用' };
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  nickname = String(nickname || '').trim();

  if (!email || !email.includes('@')) return { ok: false, error: '邮箱格式不正确' };
  if (email.length > 64) return { ok: false, error: '邮箱太长' };
  if (password.length < 6) return { ok: false, error: '密码至少 6 位' };
  if (password.length > 64) return { ok: false, error: '密码太长' };
  if (!nickname) return { ok: false, error: '昵称不能为空' };
  if (nickname.length > 12) return { ok: false, error: '昵称最多 12 个字符' };

  const existing = await query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rows.length > 0) return { ok: false, error: '邮箱已注册' };

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const r = await query(
    'INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname, avatar',
    [email, hash, nickname]
  );
  const user = publicUser(r.rows[0]);
  return { ok: true, user, token: signToken(user) };
}

export async function loginUser({ email, password }) {
  if (!isDbReady()) return { ok: false, error: '用户系统未启用' };
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  if (!email || !password) return { ok: false, error: '请输入邮箱和密码' };

  const r = await query(
    'SELECT id, email, password_hash, nickname, avatar FROM users WHERE email=$1',
    [email]
  );
  if (r.rows.length === 0) return { ok: false, error: '邮箱或密码错误' };
  const row = r.rows[0];
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return { ok: false, error: '邮箱或密码错误' };
  const user = publicUser(row);
  return { ok: true, user, token: signToken(user) };
}

export async function getUserById(id) {
  if (!isDbReady()) return null;
  const r = await query('SELECT id, email, nickname, avatar FROM users WHERE id=$1', [id]);
  return r.rows[0] ? publicUser(r.rows[0]) : null;
}

export async function updateProfile(id, { nickname, avatar }) {
  if (!isDbReady()) return { ok: false, error: '用户系统未启用' };
  const sets = [];
  const params = [];
  if (typeof nickname === 'string') {
    const n = nickname.trim();
    if (!n) return { ok: false, error: '昵称不能为空' };
    if (n.length > 12) return { ok: false, error: '昵称最多 12 个字符' };
    params.push(n);
    sets.push(`nickname=$${params.length}`);
  }
  if (typeof avatar === 'string') {
    if (avatar.length > 512) return { ok: false, error: '头像数据过长' };
    params.push(avatar);
    sets.push(`avatar=$${params.length}`);
  }
  if (sets.length === 0) return { ok: false, error: '没有要更新的字段' };
  params.push(id);
  const r = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING id, email, nickname, avatar`,
    params
  );
  return { ok: true, user: publicUser(r.rows[0]) };
}

export async function getUserStats(userId) {
  if (!isDbReady()) return null;
  const total = await query('SELECT COUNT(*)::int AS c FROM game_players WHERE user_id=$1', [userId]);
  const wins  = await query('SELECT COUNT(*)::int AS c FROM game_players WHERE user_id=$1 AND did_win=true', [userId]);
  const byTeam = await query(
    `SELECT team, COUNT(*)::int AS games, SUM(CASE WHEN did_win THEN 1 ELSE 0 END)::int AS wins
       FROM game_players WHERE user_id=$1 AND team IS NOT NULL GROUP BY team`,
    [userId]
  );
  return {
    total: total.rows[0].c,
    wins:  wins.rows[0].c,
    byTeam: byTeam.rows,
  };
}

export async function getRecentGames(userId, limit = 20) {
  if (!isDbReady()) return [];
  const r = await query(
    `SELECT g.id, g.played_at, g.player_count, g.result,
            gp.initial_role, gp.final_role, gp.was_killed, gp.did_win, gp.team
       FROM game_players gp
       JOIN games g ON g.id = gp.game_id
      WHERE gp.user_id = $1
      ORDER BY g.played_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return r.rows;
}

const TEAM_OF = { werewolf: 'werewolf', minion: 'werewolf', tanner: 'tanner' };
function teamOf(role) { return TEAM_OF[role] || 'village'; }

function didWin(idx, role, result) {
  if (role === 'tanner') return result.killed.includes(idx);
  return result.winners.includes(teamOf(role));
}

// 一局结束时调用：roomCode, 玩家列表（含 userId/nickname/initialRole/finalRole）, 结果
export async function saveGameRecord({ roomCode, config, players, result }) {
  if (!isDbReady()) return;
  try {
    const r = await query(
      `INSERT INTO games (room_code, player_count, config, result, played_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [roomCode, players.length, JSON.stringify(config), JSON.stringify(result)]
    );
    const gameId = r.rows[0].id;
    for (let idx = 0; idx < players.length; idx++) {
      const p = players[idx];
      const initRole  = result.initialRoles[idx];
      const finalRole = result.finalRoles[idx];
      const wasKilled = result.killed.includes(idx);
      const team = teamOf(finalRole);
      const win  = didWin(idx, finalRole, result);
      await query(
        `INSERT INTO game_players
           (game_id, user_id, nickname, initial_role, final_role, was_killed, did_win, team)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [gameId, p.userId || null, p.nickname, initRole, finalRole, wasKilled, win, team]
      );
    }
  } catch (e) {
    console.error('[wolf] saveGameRecord failed:', e.message);
  }
}
