// 纯函数游戏逻辑：洗牌、发牌、夜晚步骤生成、计票、胜负判定
import { ROLES } from './roles.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function buildDeck(selectedRoles) {
  const deck = [];
  for (const [roleId, count] of Object.entries(selectedRoles)) {
    if (!ROLES[roleId]) continue;
    for (let i = 0; i < count; i++) deck.push(roleId);
  }
  return deck;
}

function deckSize(selectedRoles) {
  return Object.values(selectedRoles).reduce((s, n) => s + (Number(n) || 0), 0);
}

export function dealCards(selectedRoles, playerCount) {
  const deck = shuffle(buildDeck(selectedRoles));
  if (deck.length !== playerCount + 3) {
    throw new Error(`Deck size ${deck.length} != ${playerCount + 3}`);
  }
  return {
    initialPlayerRoles: deck.slice(0, playerCount),
    initialCenter: deck.slice(playerCount, playerCount + 3),
  };
}

// 生成夜晚步骤队列。kind 决定客户端会渲染什么样的私密 UI。
export function generateNightSteps(initialRoles) {
  const steps = [];
  const byRole = {};
  initialRoles.forEach((r, i) => { (byRole[r] ||= []).push(i); });

  const push = (kind, role, extra = {}) => {
    steps.push({ kind, role, players: byRole[role] || [], ...extra });
  };

  if (byRole.werewolf?.length) {
    push('werewolf_see', 'werewolf');
    if (byRole.werewolf.length === 1) push('lone_wolf_peek', 'werewolf');
  }
  if (byRole.minion?.length) push('minion_see', 'minion');
  if (byRole.mason?.length) push('mason_see', 'mason');
  if (byRole.seer?.length) push('seer_choose', 'seer');
  if (byRole.robber?.length) push('robber_choose', 'robber');
  if (byRole.troublemaker?.length) push('troublemaker_choose', 'troublemaker');
  if (byRole.drunk?.length) push('drunk_choose', 'drunk');
  if (byRole.insomniac?.length) push('insomniac_see', 'insomniac');

  return steps;
}

function tallyVotes(votes, playerCount) {
  const counts = new Array(playerCount).fill(0);
  for (const v of Object.values(votes)) {
    if (typeof v === 'number' && v >= 0 && v < playerCount) counts[v]++;
  }
  return counts;
}

export function resolveKilled(votes, playerCount, finalRoles) {
  const counts = tallyVotes(votes, playerCount);
  const max = Math.max(0, ...counts);
  let killed = [];

  if (max >= 2) {
    counts.forEach((c, i) => { if (c === max) killed.push(i); });
  }

  const hunterChain = [];
  for (const p of killed) {
    if (finalRoles[p] === 'hunter') {
      const t = votes[p];
      if (typeof t === 'number' && !killed.includes(t) && !hunterChain.includes(t)) {
        hunterChain.push(t);
      }
    }
  }
  killed = [...killed, ...hunterChain];
  return { killed, counts, hunterChain };
}

export function determineWinners(finalRoles, killed) {
  const hasWerewolf = finalRoles.some(r => r === 'werewolf');
  const killedRoles = killed.map(p => finalRoles[p]);
  const werewolfKilled = killedRoles.includes('werewolf');
  const tannerKilled = killedRoles.includes('tanner');

  const winners = new Set();
  if (tannerKilled) winners.add('tanner');

  if (hasWerewolf) {
    if (werewolfKilled) winners.add('village');
    else if (killed.length === 0) winners.add('werewolf');
    else if (!tannerKilled) winners.add('werewolf');
  } else {
    if (killed.length === 0) winners.add('village');
  }

  return Array.from(winners);
}

export function validateConfig(selectedRoles, playerCount) {
  const required = playerCount + 3;
  const sz = deckSize(selectedRoles);
  if (sz !== required) return `角色数量 ${sz}，需要 ${required}`;
  if (!selectedRoles.werewolf || selectedRoles.werewolf < 1) return '至少需要 1 个狼人';
  if (selectedRoles.mason === 1) return '守夜人必须为 0 或 2';
  return null;
}
