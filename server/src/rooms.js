// 房间注册表 + Room 类
import { generateRoomCode } from './engine.js';

const rooms = new Map();

export const LOBBY_GRACE_MS = 30 * 1000;

function genPlayerId() {
  return Math.random().toString(36).slice(2, 10);
}

function genToken() {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  ).slice(0, 24);
}

export class Room {
  constructor(code) {
    this.code = code;
    this.players = [];
    this.hostId = null;
    this.phase = 'lobby';
    this.config = {
      selectedRoles: { werewolf: 2, seer: 1, robber: 1, troublemaker: 1, villager: 1 },
      discussionSeconds: 300,
    };
    this.game = null;
    this.lastActivityAt = Date.now();
    this.removalTimers = new Map();
  }

  addPlayer(nickname, userId = null) {
    const player = {
      id: genPlayerId(),
      nickname,
      userId,
      token: genToken(),
      connected: true,
      lastSocketId: null,
      privateLog: [],
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.lastActivityAt = Date.now();
    return player;
  }

  removePlayer(id) {
    this.cancelRemoval(id);
    const idx = this.players.findIndex(p => p.id === id);
    if (idx < 0) return null;
    const player = this.players[idx];
    this.players.splice(idx, 1);
    if (this.hostId === id) {
      this.hostId = this.players[0]?.id || null;
    }
    this.lastActivityAt = Date.now();
    return player;
  }

  getPlayer(id) {
    return this.players.find(p => p.id === id) || null;
  }

  setConnected(id, connected, socketId = null) {
    const player = this.getPlayer(id);
    if (player) {
      player.connected = connected;
      if (socketId !== null) player.lastSocketId = socketId;
    }
  }

  scheduleRemoval(id, delayMs, onRemoved) {
    this.cancelRemoval(id);
    const t = setTimeout(() => {
      this.removalTimers.delete(id);
      if (this.phase !== 'lobby') return;
      const player = this.getPlayer(id);
      if (!player || player.connected) return;
      this.removePlayer(id);
      if (onRemoved) onRemoved(player);
    }, delayMs);
    this.removalTimers.set(id, t);
  }

  cancelRemoval(id) {
    const t = this.removalTimers.get(id);
    if (t) {
      clearTimeout(t);
      this.removalTimers.delete(id);
    }
  }

  cancelAllRemovals() {
    for (const t of this.removalTimers.values()) clearTimeout(t);
    this.removalTimers.clear();
  }

  toPublicState() {
    const base = {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      config: this.config,
      players: this.players.map((p, idx) => ({
        id: p.id,
        nickname: p.nickname,
        idx,
        isHost: p.id === this.hostId,
        connected: p.connected,
        isLoggedIn: !!p.userId,
      })),
    };
    if (!this.game) return base;
    return {
      ...base,
      dayEndsAt: this.game.dayEndsAt ?? null,
      voteEndsAt: this.game.voteEndsAt ?? null,
      voteProgress:
        this.phase === 'vote'
          ? {
              count: Object.keys(this.game.votes || {}).length,
              total: this.players.length,
            }
          : null,
      result: this.game.result ?? null,
    };
  }

  isEmpty() {
    return this.players.length === 0 || this.players.every(p => !p.connected);
  }
}

export function createRoom(nickname, userId = null) {
  let code = null;
  for (let i = 0; i < 200; i++) {
    const c = generateRoomCode();
    if (!rooms.has(c)) { code = c; break; }
  }
  if (!code) throw new Error('Cannot allocate room code');
  const room = new Room(code);
  rooms.set(code, room);
  const player = room.addPlayer(nickname, userId);
  return { room, player };
}

export function getRoom(code) {
  if (!code) return null;
  return rooms.get(String(code)) || null;
}

export function joinRoom(code, nickname, userId = null) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: '房间不存在' };
  if (room.phase !== 'lobby') return { ok: false, error: '游戏已开始，无法加入' };
  if (room.players.length >= 10) return { ok: false, error: '房间人数已满' };
  if (room.players.some(p => p.nickname === nickname)) return { ok: false, error: '此昵称已被使用' };
  const player = room.addPlayer(nickname, userId);
  return { ok: true, room, player };
}

export function reconnect(code, playerId, token) {
  const room = getRoom(code);
  if (!room) return { ok: false, error: '房间不存在' };
  const player = room.getPlayer(playerId);
  if (!player) return { ok: false, error: '玩家不存在' };
  if (player.token !== token) return { ok: false, error: 'token 无效' };
  room.cancelRemoval(playerId);
  player.connected = true;
  room.lastActivityAt = Date.now();
  return { ok: true, room, player };
}

export function deleteRoom(code) {
  const room = rooms.get(String(code));
  if (room) room.cancelAllRemovals();
  rooms.delete(String(code));
}

// .unref() 让这个定时器不阻止 Node 进程退出（测试时尤其重要）
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.isEmpty() && now - room.lastActivityAt > 60 * 60 * 1000) {
      room.cancelAllRemovals();
      rooms.delete(code);
      console.log('[wolf] cleaned empty room', code);
    }
  }
}, 5 * 60 * 1000).unref();
