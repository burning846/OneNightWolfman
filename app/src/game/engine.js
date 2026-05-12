// 前端只需要少量工具；游戏权威逻辑全在服务端。
import { ROLES } from './roles.js';

export function deckSize(selectedRoles) {
  return Object.values(selectedRoles).reduce((s, n) => s + (Number(n) || 0), 0);
}

export function validateConfig(selectedRoles, playerCount) {
  const required = playerCount + 3;
  const sz = deckSize(selectedRoles);
  if (sz !== required) return `角色数量 ${sz}，需要 ${required}`;
  if (!selectedRoles.werewolf || selectedRoles.werewolf < 1) return '至少需要 1 个狼人';
  if (selectedRoles.mason === 1) return '守夜人必须为 0 或 2';
  return null;
}

export function roleName(id) { return ROLES[id]?.name || id; }
export function roleEmoji(id) { return ROLES[id]?.emoji || '❔'; }
export function roleTeam(id) { return ROLES[id]?.team || 'village'; }
