// 纯函数游戏逻辑：洗牌、发牌、夜晚步骤生成、计票、胜负判定、随机动作
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

// 生成夜晚步骤队列
// - selectedRoles: 房间配置（决定"哪些步骤存在"，即使角色被埋在中央底牌也照走）
// - currentRoles: 玩家当前角色（决定"谁在这个步骤里行动"）
export function generateNightSteps(selectedRoles, currentRoles) {
  const steps = [];
  const byRole = {};
  currentRoles.forEach((r, i) => { (byRole[r] ||= []).push(i); });

  const has = (id) => (selectedRoles[id] || 0) > 0;
  const players = (id) => byRole[id] || [];

  // 注意：化身幽灵步骤由 game.js 处理（需要在所有步骤之前，且会触发步骤重算）
  if (has('werewolf')) {
    steps.push({ kind: 'werewolf_see', role: 'werewolf', players: players('werewolf') });
    // 独狼只有恰好 1 个狼人时才有真实当事人；2+ 狼或 0 狼都跑空 timer
    const lone = players('werewolf').length === 1 ? players('werewolf') : [];
    steps.push({ kind: 'lone_wolf_peek', role: 'werewolf', players: lone });
  }
  if (has('minion'))       steps.push({ kind: 'minion_see',          role: 'minion',       players: players('minion') });
  if (has('mason'))        steps.push({ kind: 'mason_see',           role: 'mason',        players: players('mason') });
  if (has('seer'))         steps.push({ kind: 'seer_choose',         role: 'seer',         players: players('seer') });
  if (has('robber'))       steps.push({ kind: 'robber_choose',       role: 'robber',       players: players('robber') });
  if (has('troublemaker')) steps.push({ kind: 'troublemaker_choose', role: 'troublemaker', players: players('troublemaker') });
  if (has('drunk'))        steps.push({ kind: 'drunk_choose',        role: 'drunk',        players: players('drunk') });
  if (has('insomniac'))    steps.push({ kind: 'insomniac_see',       role: 'insomniac',    players: players('insomniac') });

  return steps;
}

// 超时未行动时由服务端代生成的随机动作
// kind: 步骤类型；playerIdx: 当事人；N: 玩家总数
export function randomActionFor(kind, playerIdx, N) {
  const others = [];
  for (let i = 0; i < N; i++) if (i !== playerIdx) others.push(i);
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickTwo = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return [a[0], a[1]];
  };

  switch (kind) {
    case 'doppelganger_choose':
    case 'robber_choose':
      return { target: pickOne(others) };
    case 'lone_wolf_peek':
    case 'drunk_choose':
      return { centerIdx: pickOne([0, 1, 2]) };
    case 'seer_choose':
      if (Math.random() < 0.5) return { type: 'player', target: pickOne(others) };
      return { type: 'center', targets: pickTwo([0, 1, 2]) };
    case 'troublemaker_choose':
      return { targets: pickTwo(others) };
    default:
      // 纯展示性步骤（werewolf_see / minion_see / mason_see / insomniac_see）无需动作
      return null;
  }
}

export function tallyVotes(votes, playerCount) {
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
