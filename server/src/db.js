// Postgres 连接池 + 自动迁移
// 没设 DATABASE_URL 时不启用，整套用户系统都被跳过（保持匿名玩法）
import pg from 'pg';

const { Pool } = pg;

let pool = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  avatar        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id           SERIAL PRIMARY KEY,
  room_code    TEXT,
  player_count INT,
  config       JSONB,
  result       JSONB,
  played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
  id           SERIAL PRIMARY KEY,
  game_id      INT REFERENCES games(id) ON DELETE CASCADE,
  user_id      INT REFERENCES users(id) ON DELETE SET NULL,
  nickname     TEXT NOT NULL,
  initial_role TEXT,
  final_role   TEXT,
  was_killed   BOOLEAN,
  did_win      BOOLEAN,
  team         TEXT
);

CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at DESC);
`;

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('[wolf] DATABASE_URL not set → user system disabled, anonymous play still works');
    return false;
  }
  // Neon / Supabase / Render Postgres 都默认走 TLS；本地 Postgres 可以 DATABASE_SSL=false
  const useSSL = process.env.DATABASE_SSL !== 'false';
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
  });
  try {
    await pool.query(SCHEMA);
    console.log('[wolf] DB connected, schema ready');
    return true;
  } catch (e) {
    console.error('[wolf] DB init failed:', e.message);
    pool = null;
    return false;
  }
}

export function isDbReady() { return !!pool; }

export async function query(text, params) {
  if (!pool) throw new Error('DB not initialized');
  return pool.query(text, params);
}
