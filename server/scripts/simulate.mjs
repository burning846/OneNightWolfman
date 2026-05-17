// 端到端模拟：人工跑一次看看游戏流程对不对
//   cd server && node scripts/simulate.mjs

import { Room } from '../src/rooms.js';
import { GameSession } from '../src/game.js';
import { resolveKilled, determineWinners } from '../src/engine.js';

const C = { reset: '\x1b[0m', dim: '\x1b[2m', cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', bold: '\x1b[1m' };
const c = (col, s) => C[col] + s + C.reset;

function makeMockIO() { return { to: () => ({ emit: () => {} }) }; }

function setupGame(roles, selectedRoles = null, names = null, center = ['villager','tanner','hunter']) {
  const sel = selectedRoles || roles.reduce((a, r) => { a[r] = (a[r]||0) + 1; return a; }, {});
  const room = new Room('TEST');
  room.config.selectedRoles = sel;
  for (let i = 0; i < roles.length; i++) room.addPlayer(names?.[i] || `P${i + 1}`);
  const game = new GameSession(room, makeMockIO());
  game.initialRoles = [...roles];
  game.initialCenter = [...center];
  game.currentRoles = [...roles];
  game.currentCenter = [...center];
  game.nightSteps = game.computeNightSteps();
  return { room, game };
}

function gotoStep(game, kind) {
  game.stepIndex = game.nightSteps.findIndex(s => s.kind === kind);
  return game.stepIndex >= 0;
}

function showRoles(label, game) {
  console.log(c('dim', `  [${label}] roles = [${game.currentRoles.join(', ')}] center = [${game.currentCenter.join(', ')}]`));
}

// ============================================================
console.log(c('bold', '\n========== 场景 1：基础 4 人局（双狼 + 预言 + 捣蛋鬼） ==========\n'));
{
  const { room, game } = setupGame(
    ['werewolf', 'werewolf', 'seer', 'troublemaker'],
    null,
    ['狼A', '狼B', '预言', '捣蛋']
  );
  console.log('初始：', room.players.map((p, i) => `#${i+1} ${p.nickname}=${game.initialRoles[i]}`).join(', '));
  console.log('夜晚步骤：', game.nightSteps.map(s => s.kind).join(' → '));

  gotoStep(game, 'seer_choose');
  room.players[2].privateLog = [];
  game.handleAction(2, { type: 'player', target: 0 });
  console.log(c('cyan', `预言看到 #1 = ${room.players[2].privateLog.pop().payload.results[0].role}`));

  gotoStep(game, 'troublemaker_choose');
  game.handleAction(3, { targets: [0, 2] });
  showRoles('夜晚后', game);

  const votes = { 0: 1, 1: 0, 2: 1, 3: 1 };
  const { killed, counts } = resolveKilled(votes, 4, game.currentRoles);
  const winners = determineWinners(game.currentRoles, killed);
  console.log(`票数=${JSON.stringify(counts)} 淘汰=${killed.map(i=>'#'+(i+1)).join(',') || '无'} 胜利=${c('green', winners.join(','))}`);
}

// ============================================================
console.log(c('bold', '\n========== 场景 2：化身幽灵复制狼人 ==========\n'));
{
  const { room, game } = setupGame(
    ['doppelganger', 'werewolf', 'seer', 'villager'],
    null,
    ['化身', '原狼', '预言', '村民']
  );
  console.log('初始步骤：', game.nightSteps.map(s => s.kind).join(' → '));

  gotoStep(game, 'doppelganger_choose');
  room.players[0].privateLog = [];
  game.handleAction(0, { target: 1 });
  const r = room.players[0].privateLog.pop();
  console.log(c('yellow', `化身复制了 ${r.payload.targetNickname}，变成 ${r.payload.copiedRole}`));
  console.log('重生成步骤：', game.nightSteps.map(s => s.kind).join(' → '));
  showRoles('化身后', game);

  const wolf = game.nightSteps.find(s => s.kind === 'werewolf_see');
  console.log('狼人参与:', wolf.players, wolf.players.includes(0) && wolf.players.includes(1) ? c('green', '✓ 化身并入') : c('red', '✗ 未并入'));
  const lone = game.nightSteps.find(s => s.kind === 'lone_wolf_peek');
  console.log('独狼参与:', lone.players, lone.players.length === 0 ? c('green', '✓ 双狼后空 timer') : c('red', '✗ 不该有人'));
}

// ============================================================
console.log(c('bold', '\n========== 场景 3：反作弊 - 狼在中央底牌，步骤照走 ==========\n'));
{
  const { game } = setupGame(
    ['seer', 'robber', 'villager', 'villager'],
    { werewolf: 1, seer: 1, robber: 1, villager: 4 },   // 配置选了狼但实际牌在中央
    ['预言', '盗', '村A', '村B'],
    ['werewolf', 'villager', 'villager']  // 狼在中央底牌
  );
  console.log('玩家手牌：', game.initialRoles.join(', '));
  console.log('中央底牌：', game.initialCenter.join(', '));
  console.log('夜晚步骤：', game.nightSteps.map(s => s.kind).join(' → '));
  const ww = game.nightSteps.find(s => s.kind === 'werewolf_see');
  console.log('狼人步骤存在?', !!ww ? c('green', '✓') : c('red', '✗'), '参与者:', ww?.players);
  console.log('独狼步骤存在?', !!game.nightSteps.find(s => s.kind === 'lone_wolf_peek') ? c('green', '✓') : c('red', '✗'));
  console.log(c('yellow', '→ 从外界观感看，与"狼在手"的局完全一样，无法推断底牌'));
}

// ============================================================
console.log(c('bold', '\n========== 场景 4：超时随机 - 系统替未行动玩家选 ==========\n'));
{
  const { game } = setupGame(
    ['robber', 'villager', 'villager'],
    null,
    ['盗', '村A', '村B']
  );
  game.room.config.nightStepSeconds = 1;   // 1 秒就到时
  gotoStep(game, 'robber_choose');
  console.log('强盗 (#1) 故意不行动...');
  console.log('roles before:', game.currentRoles.join(', '));
  // 直接调 handleStepTimeout 模拟超时（真实跑时是 setTimeout 触发）
  game.handleStepTimeout();
  console.log('roles after:',  game.currentRoles.join(', '));
  const stolen = game.currentRoles[0] !== 'robber';
  console.log(stolen ? c('green', '✓ 系统替强盗随机选择并交换') : c('red', '✗ 没生效'));
  if (game.stepTimer) clearTimeout(game.stepTimer);
}

// ============================================================
console.log(c('bold', '\n========== 场景 5：完整 8 人局步骤序列 ==========\n'));
{
  const { game } = setupGame(
    ['werewolf','werewolf','minion','seer','robber','troublemaker','drunk','insomniac'],
    null,
    ['狼A','狼B','爪','预言','盗','蛋','酒','失眠']
  );
  console.log('步骤：');
  game.nightSteps.forEach((s, i) => {
    console.log(`  ${i+1}. ${s.kind.padEnd(22)} 参与=${s.players.length}人`);
  });
}

console.log(c('bold', '\n========== 模拟完毕 ==========\n'));
process.exit(0);
