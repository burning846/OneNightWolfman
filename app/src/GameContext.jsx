import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const STORAGE_KEY = 'wolf-session-v1';
const AUTH_TOKEN_KEY = 'wolf-auth-v1';

const initial = {
  status: 'home',           // 'home' | 'connecting' | 'in_room' | 'auth' | 'profile'
  socketConnected: false,
  // 账号
  user: null,               // { id, email, nickname, avatar } 或 null
  // 房间
  roomCode: null,
  playerId: null,
  token: null,
  roomState: null,
  myRole: null,
  myPlayerIdx: null,
  // 夜晚
  nightStep: null,
  nightPrompt: null,
  pendingReveal: null,
  nightReveals: [],
  // 白天 / 投票 / 结果
  dayEndsAt: null,
  voteEndsAt: null,
  voteProgress: { count: 0, total: 0 },
  myVote: null,
  result: null,
  // 提示
  errorMessage: null,
};

function reducer(state, a) {
  switch (a.type) {
    case 'set_status':
      return { ...state, status: a.value };
    case 'set_socket_connected':
      return { ...state, socketConnected: a.value };
    case 'set_user':
      return { ...state, user: a.user };
    case 'set_room':
      return {
        ...state,
        status: 'in_room',
        roomCode: a.roomCode,
        playerId: a.playerId,
        token: a.token,
      };
    case 'reset':
      // 保留 user（登录态不应被重置），只清掉房间和游戏数据
      return { ...initial, status: 'home', user: state.user };
    case 'room_state': {
      const players = a.payload.players;
      const myIdx = state.playerId
        ? players.findIndex(p => p.id === state.playerId)
        : -1;
      const reset =
        a.payload.phase === 'lobby'
          ? {
              myRole: null,
              nightStep: null,
              nightPrompt: null,
              pendingReveal: null,
              nightReveals: [],
              dayEndsAt: null,
              voteEndsAt: null,
              voteProgress: { count: 0, total: 0 },
              myVote: null,
              result: null,
            }
          : {};
      const phaseSync = {};
      if (a.payload.dayEndsAt != null) phaseSync.dayEndsAt = a.payload.dayEndsAt;
      if (a.payload.voteEndsAt != null) phaseSync.voteEndsAt = a.payload.voteEndsAt;
      if (a.payload.voteProgress) phaseSync.voteProgress = a.payload.voteProgress;
      if (a.payload.result) phaseSync.result = a.payload.result;
      return {
        ...state,
        roomState: a.payload,
        myPlayerIdx: myIdx >= 0 ? myIdx : state.myPlayerIdx,
        ...reset,
        ...phaseSync,
      };
    }
    case 'your_role':
      return { ...state, myRole: a.payload.role, myPlayerIdx: a.payload.playerIdx };
    case 'night_step':
      return { ...state, nightStep: a.payload, nightPrompt: null, pendingReveal: null };
    case 'night_prompt':
      return { ...state, nightPrompt: a.payload };
    case 'night_reveal':
      return { ...state, pendingReveal: a.payload, nightReveals: [...state.nightReveals, a.payload] };
    case 'ack_reveal':
      return { ...state, pendingReveal: null, nightPrompt: null };
    case 'day_phase':
      return { ...state, dayEndsAt: a.payload.endsAt };
    case 'vote_phase':
      return { ...state, voteEndsAt: a.payload.endsAt, myVote: null };
    case 'vote_progress':
      return { ...state, voteProgress: a.payload };
    case 'set_my_vote':
      return { ...state, myVote: a.value };
    case 'result':
      return { ...state, result: a.payload };
    case 'set_error':
      return { ...state, errorMessage: a.message };
    case 'clear_error':
      return { ...state, errorMessage: null };
    default:
      return state;
  }
}

const Ctx = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const socketRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function ensureSocket() {
    if (socketRef.current) return socketRef.current;
    const sock = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      dispatch({ type: 'set_socket_connected', value: true });
      // 1) 尝试用 JWT 恢复登录态
      const authToken = loadAuthToken();
      if (authToken) {
        sock.emit('auth:verify', { token: authToken }, (res) => {
          if (res?.ok) dispatch({ type: 'set_user', user: res.user });
          else clearAuthToken();
        });
      }
      // 2) 尝试恢复房间会话
      const cur = stateRef.current;
      const saved = loadSession();
      if (saved && (cur.status === 'home' || cur.status === 'connecting')) {
        sock.emit('reconnect_room', saved, (res) => {
          if (res?.ok) {
            dispatch({
              type: 'set_room',
              roomCode: res.roomCode,
              playerId: res.playerId,
              token: res.token,
            });
          } else {
            clearSession();
            dispatch({ type: 'reset' });
          }
        });
      }
    });

    sock.on('disconnect', () => dispatch({ type: 'set_socket_connected', value: false }));
    sock.on('room_state', (p) => dispatch({ type: 'room_state', payload: p }));
    sock.on('your_role', (p) => dispatch({ type: 'your_role', payload: p }));
    sock.on('night_step', (p) => dispatch({ type: 'night_step', payload: p }));
    sock.on('night_prompt', (p) => dispatch({ type: 'night_prompt', payload: p }));
    sock.on('night_reveal', (p) => dispatch({ type: 'night_reveal', payload: p }));
    sock.on('day_phase', (p) => dispatch({ type: 'day_phase', payload: p }));
    sock.on('vote_phase', (p) => dispatch({ type: 'vote_phase', payload: p }));
    sock.on('vote_progress', (p) => dispatch({ type: 'vote_progress', payload: p }));
    sock.on('result', (p) => dispatch({ type: 'result', payload: p }));

    return sock;
  }

  useEffect(() => {
    const saved = loadSession();
    if (saved) dispatch({ type: 'set_status', value: 'connecting' });
    ensureSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useMemo(
    () => ({
      // ====== 账号 ======
      register: (email, password, nickname) =>
        new Promise((resolve) => {
          const sock = ensureSocket();
          sock.emit('auth:register', { email, password, nickname }, (res) => {
            if (res?.ok) {
              saveAuthToken(res.token);
              dispatch({ type: 'set_user', user: res.user });
              resolve({ ok: true });
            } else {
              dispatch({ type: 'set_error', message: res?.error || '注册失败' });
              resolve({ ok: false, error: res?.error });
            }
          });
        }),
      login: (email, password) =>
        new Promise((resolve) => {
          const sock = ensureSocket();
          sock.emit('auth:login', { email, password }, (res) => {
            if (res?.ok) {
              saveAuthToken(res.token);
              dispatch({ type: 'set_user', user: res.user });
              resolve({ ok: true });
            } else {
              dispatch({ type: 'set_error', message: res?.error || '登录失败' });
              resolve({ ok: false, error: res?.error });
            }
          });
        }),
      logout: () => {
        socketRef.current?.emit('auth:logout');
        clearAuthToken();
        dispatch({ type: 'set_user', user: null });
      },
      getProfile: () =>
        new Promise((resolve) => {
          socketRef.current?.emit('auth:profile', null, (res) => resolve(res));
        }),
      updateProfile: (data) =>
        new Promise((resolve) => {
          socketRef.current?.emit('auth:update', data, (res) => {
            if (res?.ok) dispatch({ type: 'set_user', user: res.user });
            else dispatch({ type: 'set_error', message: res?.error || '更新失败' });
            resolve(res);
          });
        }),

      // ====== 房间 ======
      createRoom: (nickname) =>
        new Promise((resolve) => {
          const sock = ensureSocket();
          sock.emit('create_room', { nickname }, (res) => {
            if (res?.ok) {
              saveSession({ roomCode: res.roomCode, playerId: res.playerId, token: res.token });
              dispatch({ type: 'set_room', roomCode: res.roomCode, playerId: res.playerId, token: res.token });
              resolve({ ok: true });
            } else {
              dispatch({ type: 'set_error', message: res?.error || '创建失败' });
              resolve({ ok: false, error: res?.error });
            }
          });
        }),
      joinRoom: (roomCode, nickname) =>
        new Promise((resolve) => {
          const sock = ensureSocket();
          sock.emit('join_room', { roomCode, nickname }, (res) => {
            if (res?.ok) {
              saveSession({ roomCode: res.roomCode, playerId: res.playerId, token: res.token });
              dispatch({ type: 'set_room', roomCode: res.roomCode, playerId: res.playerId, token: res.token });
              resolve({ ok: true });
            } else {
              dispatch({ type: 'set_error', message: res?.error || '加入失败' });
              resolve({ ok: false, error: res?.error });
            }
          });
        }),
      leaveRoom: () => {
        socketRef.current?.emit('leave_room');
        clearSession();
        dispatch({ type: 'reset' });
      },
      updateConfig: (selectedRoles, discussionSeconds) =>
        new Promise((resolve) => {
          socketRef.current?.emit('update_config', { selectedRoles, discussionSeconds }, (res) => {
            if (res && !res.ok) dispatch({ type: 'set_error', message: res.error });
            resolve(res);
          });
        }),
      startGame: () =>
        new Promise((resolve) => {
          socketRef.current?.emit('start_game', null, (res) => {
            if (res && !res.ok) dispatch({ type: 'set_error', message: res.error });
            resolve(res);
          });
        }),
      nightAction: (payload) =>
        new Promise((resolve) => {
          socketRef.current?.emit('night_action', payload, (res) => {
            if (res && !res.ok) dispatch({ type: 'set_error', message: '操作未被接受' });
            resolve(res);
          });
        }),
      nightDone: () => {
        socketRef.current?.emit('night_done');
        dispatch({ type: 'ack_reveal' });
      },
      castVote: (targetIdx) => {
        socketRef.current?.emit('cast_vote', { targetIdx });
        dispatch({ type: 'set_my_vote', value: targetIdx });
      },
      skipDay: () => socketRef.current?.emit('skip_day'),
      restartGame: () => socketRef.current?.emit('restart_game'),

      // ====== 导航 ======
      goAuth: () => dispatch({ type: 'set_status', value: 'auth' }),
      goProfile: () => dispatch({ type: 'set_status', value: 'profile' }),
      goHome: () => dispatch({ type: 'set_status', value: 'home' }),

      clearError: () => dispatch({ type: 'clear_error' }),
    }),
    []
  );

  return <Ctx.Provider value={{ state, api }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

function saveSession(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }
function loadSession()     { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearSession()    { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

function saveAuthToken(t)  { try { localStorage.setItem(AUTH_TOKEN_KEY, t); } catch {} }
function loadAuthToken()   { try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; } }
function clearAuthToken()  { try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {} }
