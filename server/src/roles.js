// 角色定义（与前端 app/src/game/roles.js 保持一致）
export const ROLES = {
  doppelganger: { id: 'doppelganger', name: '化身幽灵', team: 'village',  wakeOrder: 0,  emoji: '👻' },
  werewolf:     { id: 'werewolf',     name: '狼人',     team: 'werewolf', wakeOrder: 1,  emoji: '🐺' },
  minion:       { id: 'minion',       name: '爪牙',     team: 'werewolf', wakeOrder: 2,  emoji: '😈' },
  mason:        { id: 'mason',        name: '守夜人',   team: 'village',  wakeOrder: 3,  emoji: '🛡️' },
  seer:         { id: 'seer',         name: '预言家',   team: 'village',  wakeOrder: 4,  emoji: '🔮' },
  robber:       { id: 'robber',       name: '强盗',     team: 'village',  wakeOrder: 5,  emoji: '🦹' },
  troublemaker: { id: 'troublemaker', name: '捣蛋鬼',   team: 'village',  wakeOrder: 6,  emoji: '👹' },
  drunk:        { id: 'drunk',        name: '酒鬼',     team: 'village',  wakeOrder: 7,  emoji: '🍺' },
  insomniac:    { id: 'insomniac',    name: '失眠者',   team: 'village',  wakeOrder: 8,  emoji: '👁️' },
  villager:     { id: 'villager',     name: '村民',     team: 'village',  wakeOrder: 99, emoji: '🧑‍🌾' },
  hunter:       { id: 'hunter',       name: '猎人',     team: 'village',  wakeOrder: 99, emoji: '🏹' },
  tanner:       { id: 'tanner',       name: '皮匠',     team: 'tanner',   wakeOrder: 99, emoji: '🥁' },
};
