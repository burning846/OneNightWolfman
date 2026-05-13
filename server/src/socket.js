// Socket.IO 事件分发
import {
  createRoom,
  joinRoom,
  reconnect,
  getRoom,
  deleteRoom,
  LOBBY_GRACE_MS,
} from './rooms.js';
import { GameSession } from './game.js';
import { validateConfig } from './engine.js';
import {
  registerUser,
  loginUser,
  verifyToken,
  getUserById,
  updateProfile,
  getUserStats,
  getRecentGames,
} from './auth.js';

const ack = (cb, payload) => { try { cb && cb(payload); } catch {} };
const ackError = (cb, error) => ack(cb, { ok: false, error });
const ackOk = (cb, extra = {}) => ack(cb, { ok: true, ...extra });

function bindSocket(socket, room, player) {
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  player.lastSocketId = socket.id;
  player.connected = true;
  socket.join(room.code);
  socket.join(player.id);
}

function unbindSocket(socket) {
  if (socket.data.roomCode) socket.leave(socket.data.roomCode);
  if (socket.data.playerId) socket.leave(socket.data.playerId);
  socket.data.roomCode = null;
  socket.data.playerId = null;
}

export function handleConnection(io, socket) {
  socket.data = { roomCode: null, playerId: null, userId: null, userNickname: null };

  // ============================================================
  // 账号相关
  // ============================================================
  socket.on('auth:register', async (data, cb) => {
    const r = await registerUser(data || {});
    if (r.ok) {
      socket.data.userId = r.user.id;
      socket.data.userNickname = r.user.nickname;
    }
    ack(cb, r);
  });

  socket.on('auth:login', async (data, cb) => {
    const r = await loginUser(data || {});
    if (r.ok) {
      socket.data.userId = r.user.id;
      socket.data.userNickname = r.user.nickname;
    }
    ack(cb, r);
  });

  socket.on('auth:verify', async ({ token } = {}, cb) => {
    const decoded = token && verifyToken(token);
    if (!decoded) return ackError(cb, 'token 无效');
    const user = await getUserById(decoded.uid);
    if (!user) return ackError(cb, '用户不存在');
    socket.data.userId = user.id;
    socket.data.userNickname = user.nickname;
    ackOk(cb, { user });
  });

  socket.on('auth:logout', (_payload, cb) => {
    socket.data.userId = null;
    socket.data.userNickname = null;
    ackOk(cb);
  });

  socket.on('auth:profile', async (_payload, cb) => {
    if (!socket.data.userId) return ackError(cb, '未登录');
    const user = await getUserById(socket.data.userId);
    const stats = await getUserStats(socket.data.userId);
    const recent = await getRecentGames(socket.data.userId);
    ackOk(cb, { user, stats, recent });
  });

  socket.on('auth:update', async (data, cb) => {
    if (!socket.data.userId) return ackError(cb, '未登录');
    const r = await updateProfile(socket.data.userId, data || {});
    if (r.ok) socket.data.userNickname = r.user.nickname;
    ack(cb, r);
  });

  // ============================================================
  // 房间相关
  // ============================================================
  socket.on('create_room', ({ nickname } = {}, cb) => {
    nickname = String(nickname || socket.data.userNickname || '').trim();
    if (!nickname) return ackError(cb, '请输入昵称');
    if (nickname.length > 12) return ackError(cb, '昵称最多 12 个字符');
    try {
      const { room, player } = createRoom(nickname, socket.data.userId);
      bindSocket(socket, room, player);
      ackOk(cb, { roomCode: room.code, playerId: player.id, token: player.token });
      io.to(room.code).emit('room_state', room.toPublicState());
    } catch (e) {
      console.error('create_room error', e);
      ackError(cb, '创建房间失败');
    }
  });

  socket.on('join_room', ({ roomCode, nickname } = {}, cb) => {
    roomCode = String(roomCode || '').trim();
    nickname = String(nickname || socket.data.userNickname || '').trim();
    if (!roomCode) return ackError(cb, '请输入房间号');
    if (!nickname) return ackError(cb, '请输入昵称');
    if (nickname.length > 12) return ackError(cb, '昵称最多 12 个字符');
    const result = joinRoom(roomCode, nickname, socket.data.userId);
    if (!result.ok) return ackError(cb, result.error);
    bindSocket(socket, result.room, result.player);
    ackOk(cb, {
      roomCode: result.room.code,
      playerId: result.player.id,
      token: result.player.token,
    });
    io.to(result.room.code).emit('room_state', result.room.toPublicState());
  });

  socket.on('reconnect_room', ({ roomCode, playerId, token } = {}, cb) => {
    const result = reconnect(roomCode, playerId, token);
    if (!result.ok) return ackError(cb, result.error);
    bindSocket(socket, result.room, result.player);
    ackOk(cb, {
      roomCode: result.room.code,
      playerId: result.player.id,
      token: result.player.token,
    });
    socket.emit('room_state', result.room.toPublicState());
    for (const item of result.player.privateLog) {
      socket.emit(item.event, item.payload);
    }
    io.to(result.room.code).emit('room_state', result.room.toPublicState());
  });

  socket.on('update_config', ({ selectedRoles, discussionSeconds } = {}, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return ackError(cb, '房间不存在');
    if (room.hostId !== socket.data.playerId) return ackError(cb, '只有房主可以修改');
    if (room.phase !== 'lobby') return ackError(cb, '游戏进行中');
    if (selectedRoles && typeof selectedRoles === 'object') {
      const clean = {};
      for (const [k, v] of Object.entries(selectedRoles)) {
        const n = Math.max(0, Math.min(10, Number(v) || 0));
        if (n > 0) clean[k] = n;
      }
      room.config.selectedRoles = clean;
    }
    if (typeof discussionSeconds === 'number') {
      room.config.discussionSeconds = Math.max(60, Math.min(900, Math.floor(discussionSeconds)));
    }
    io.to(room.code).emit('room_state', room.toPublicState());
    ackOk(cb);
  });

  socket.on('start_game', (_payload, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return ackError(cb, '房间不存在');
    if (room.hostId !== socket.data.playerId) return ackError(cb, '只有房主可以开始');
    if (room.phase !== 'lobby') return ackError(cb, '游戏已开始');
    if (room.players.length < 3) return ackError(cb, '至少需要 3 名玩家');

    const err = validateConfig(room.config.selectedRoles, room.players.length);
    if (err) return ackError(cb, err);

    room.game = new GameSession(room, io);
    room.game.start();
    ackOk(cb);
  });

  socket.on('night_action', (payload, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.game) return ackError(cb, '游戏未进行');
    const idx = room.players.findIndex(p => p.id === socket.data.playerId);
    if (idx < 0) return ackError(cb, '玩家不存在');
    const ok = room.game.handleAction(idx, payload);
    ack(cb, { ok });
  });

  socket.on('night_done', (_payload, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.game) return ackError(cb, '游戏未进行');
    const idx = room.players.findIndex(p => p.id === socket.data.playerId);
    if (idx < 0) return ackError(cb, '玩家不存在');
    room.game.handleDone(idx);
    ackOk(cb);
  });

  socket.on('skip_day', (_payload, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.game) return ackError(cb, '游戏未进行');
    if (room.hostId !== socket.data.playerId) return ackError(cb, '只有房主可以跳过讨论');
    room.game.skipToVote();
    ackOk(cb);
  });

  socket.on('cast_vote', ({ targetIdx } = {}, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || !room.game) return ackError(cb, '游戏未进行');
    const idx = room.players.findIndex(p => p.id === socket.data.playerId);
    if (idx < 0) return ackError(cb, '玩家不存在');
    const ok = room.game.handleVote(idx, targetIdx);
    ack(cb, { ok });
  });

  socket.on('restart_game', (_payload, cb) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return ackError(cb, '房间不存在');
    if (room.hostId !== socket.data.playerId) return ackError(cb, '只有房主可以');
    if (room.game) {
      room.game.resetToLobby();
    } else {
      room.phase = 'lobby';
      io.to(room.code).emit('room_state', room.toPublicState());
    }
    ackOk(cb);
  });

  socket.on('leave_room', (_payload, cb) => {
    leaveCurrentRoom(io, socket);
    ackOk(cb);
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (!code || !playerId) return;
    const room = getRoom(code);
    if (!room) return;

    room.setConnected(playerId, false);
    io.to(code).emit('room_state', room.toPublicState());

    if (room.phase === 'lobby') {
      room.scheduleRemoval(playerId, LOBBY_GRACE_MS, () => {
        if (room.players.length === 0) {
          deleteRoom(code);
        } else {
          io.to(code).emit('room_state', room.toPublicState());
        }
      });
    }
  });
}

function leaveCurrentRoom(io, socket) {
  const code = socket.data.roomCode;
  const playerId = socket.data.playerId;
  if (!code || !playerId) return;
  const room = getRoom(code);
  if (!room) {
    unbindSocket(socket);
    return;
  }
  if (room.phase === 'lobby') {
    room.removePlayer(playerId);
    unbindSocket(socket);
    if (room.players.length === 0) {
      deleteRoom(code);
    } else {
      io.to(code).emit('room_state', room.toPublicState());
    }
  } else {
    room.setConnected(playerId, false);
    unbindSocket(socket);
    io.to(code).emit('room_state', room.toPublicState());
  }
}
