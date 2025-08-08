// src/config/api.js

// 根据环境确定API和WebSocket基础URL
const isDevelopment = process.env.NODE_ENV === 'development';

// 优先使用环境变量中的API基础URL，其次根据环境使用默认值
// 本地开发环境默认使用localhost，生产环境使用相对路径
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (isDevelopment ? 'http://localhost:8000' : '');

// WebSocket URL配置
// 本地开发环境使用ws://localhost:8000，生产环境使用相对路径并自动判断协议
const getWebSocketBaseURL = () => {
  if (isDevelopment) {
    return 'ws://localhost:8000';
  } else {
    // 在生产环境中，根据当前页面协议自动选择ws或wss
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 使用当前主机名
    return `${protocol}//${window.location.host}`;
  }
};

export const WS_BASE_URL = getWebSocketBaseURL();
export const API_URL = API_BASE_URL;

// 导出API路径
export const API_PATHS = {
  LOGIN: `${API_BASE_URL}/api/login/`,
  REGISTER: `${API_BASE_URL}/api/register/`,
  GOOGLE_LOGIN: `${API_BASE_URL}/api/google_login/`,
  SET_USERNAME: `${API_BASE_URL}/api/set_username/`,
  JOIN_ROOM: `${API_BASE_URL}/api/join_room/`,
  CREATE_ROOM: `${API_BASE_URL}/create_room/`,
  ROOM_INFO: (roomCode) => `${API_BASE_URL}/api/room/${roomCode}/`,
  INVITE_PLAYER: `${API_BASE_URL}/api/invite_player/`,
  KICK_PLAYER: `${API_BASE_URL}/api/kick_player/`,
  LEADERBOARD: `${API_BASE_URL}/api/leaderboard/`,
};

// 导出WebSocket路径
export const WS_PATHS = {
  GAME: (roomCode) => `${WS_BASE_URL}/ws/game/${roomCode}/`,
};