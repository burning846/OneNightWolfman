// 端到端模拟：人工跑一次看看游戏流程对不对
// 不在 npm test 里跑（输出太多），用作开发时手动验证：
//   cd server && node scripts/simulate.mjs

import { Room } from '../src/rooms.js';
import { GameSession } from '../src/game.js';
import { resolveKilled, determineWinners } from '../src/engine.js';

const C = { reset: '\x1b[0m', dim: '\x1b[2m', cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', bold: '\x1b[1m' };
const c = (col, s) => C[col] + s + C.reset;

function makeMockIO() {
  return { to: () => ({ emit: () => {} }) };
}

function setupGame(roles, names = null, center = ['villager', 'tanner', 'hunter']) {
  const room = new Room('TEST');
  for (let i = 0; i < roles.length; i++) {
    room.addPlayer(names?.[i] || `P${i + 1}`);
  }
  const game = new GameSession(room, makeMockIO());
  game.initialRoles = [...roles];
  game.initialCenter = [...center];
  game.currentRoles = [...roles];
  game.currentCenter = [...center];
  game.nightSteps = game.computeNightSteps();
  return { room, game };
}

function showRoles(label, game) {
  console.log(c('dim', `  [${label}] roles = [${game.currentRoles.join(', ')}] center = [${game.currentCenter.join(', ')}]`));
}

// ============================================================
console.log(c('bold', '\n========== 场景 1：基础 4 人局（双狼 + 预言 + 捣蛋鬼） ==========\n'));
{
  const { room, game } = setupGame(
    ['werewolf', 'werewolf', 'seer', 'troublemaker'],
    ['狼A', '狼B', '预言', '捣蛋']
  );
  console.log('初始：', room.players.map((p, i) => `#${i+1} ${p.nickname}=${game.initialRoles[i]}`).join(', '));
  console.log('夜晚步骤：', game.nightSteps.map(s => s.kind).join(' → '));

  game.stepIndex = 0; game.handleDone(0); game.handleDone(1);
  game.stepIndex = 1;
  room.players[2].privateLog = [];
  game.handleAction(2, { type: 'player', target: 0 });
  console.log(c('cyan', `预言看到 #1 = ${room.players[2].privateLog.pop().payload.results[0].role}`));

  game.stepIndex = 2;
  game.handleAction(3, { targets: [0, 2] });
  showRoles('夜晚后', game);

  const votes = { 0: 1, 1: 0, 2: 1, 3: 1 };
  const { killed, counts } = resolveKilled(votes, 4, game.currentRoles);
  const winners = determineWinners(game.currentRoles, killed);
  console.log(`票数=${JSON.stringify(counts)} 淘汰=${killed.map(i=>'#'+(i+1)).join(',')} 胜利阵营=${c('green', winners.join(','))}`);
}

// ============================================================
console.log(c('bold', '\n========== 场景 2：化身幽灵复制狼人 ==========\n'));
{
  const { room, game } = setupGame(
    ['doppelganger', 'werewolf', 'seer', 'villager'],
    ['化身', '原狼', '预言', '村民']
  );
  console.log('初始步骤：', game.nightSteps.map(s => s.kind).join(' → '));

  game.stepIndex = 0;
  room.players[0].privateLog = [];
  game.handleAction(0, { target: 1 });
  const r = room.players[0].privateLog.pop();
  console.log(c('yellow', `化身复制了 ${r.payload.targetNickname}，变成 ${r.payload.copiedRole}`));
  console.log('重生成步骤：', game.nightSteps.map(s => s.kind).join(' → '));
  showRoles('化身后', game);

  const wolf = game.nightSteps.find(s => s.kind === 'werewolf_see');
  console.log('狼人步骤参与者：', wolf.players, wolf.players.includes(0) && wolf.players.includes(1) ? c('green', '✓ 化身并入') : c('red', '✗ 未并入'));
  console.log('lone_wolf_peek：', game.nightSteps.some(s => s.kind === 'lone_wolf_peek') ? c('red', '✗ 仍存在') : c('green', '✓ 已取消'));
}

// ============================================================
console.log(c('bold', '\n========== 场景 3：单狼查中央底牌 ==========\n'));
{
  const { room, game } = setupGame(
    ['werewolf', 'seer', 'robber', 'villager'],
    ['独狼', '预言', '强盗', '村'],
    ['tanner', 'hunter', 'minion']
  );
  console.log('夜晚步骤：', game.nightSteps.map(s => s.kind).join(' → '));

  game.stepIndex = 1;
  room.players[0].privateLog = [];
  game.handleAction(0, { centerIdx: 1 });
  const peek = room.players[0].privateLog.pop();
  console.log(c('cyan', `独狼看到中央 #${peek.payload.centerIdx+1} = ${peek.payload.role}`));
}

// ============================================================
console.log(c('bold', '\n========== 场景 4：猎人 + 平票，猎人连带带走目标 ==========\n'));
{
  // 配置：让猎人单独被淘汰、且他投的目标不在 killed 里
  const finalRoles = ['hunter', 'villager', 'werewolf', 'villager'];
  // 猎人(0)投狼(2)。0 票2,村1投0,村3投0,狼投1 → counts=[2,1,1,0] killed=[0] → 猎人连带带走 2
  const votes = { 0: 2, 1: 0, 2: 1, 3: 0 };
  const { killed, counts, hunterChain } = resolveKilled(votes, 4, finalRoles);
  const winners = determineWinners(finalRoles, killed);
  console.log(`投票=${JSON.stringify(votes)}`);
  console.log(`票数=${JSON.stringify(counts)} 淘汰=${killed.map(i=>'#'+(i+1)+'('+finalRoles[i]+')').join(',')}`);
  console.log(`猎人连带=${hunterChain.map(i=>'#'+(i+1)+'('+finalRoles[i]+')').join(',') || '无'}`);
  console.log('胜利阵营=', c('green', winners.join(', ')));
}

// ============================================================
console.log(c('bold', '\n========== 场景 5：皮匠单独获胜 ==========\n'));
{
  const finalRoles = ['tanner', 'werewolf', 'villager', 'villager'];
  const votes = { 0: 1, 1: 0, 2: 0, 3: 0 };  // 三人投狼，狼投皮匠 → 平票2-1
  const { killed } = resolveKilled(votes, 4, finalRoles);
  const winners = determineWinners(finalRoles, killed);
  console.log(`淘汰=${killed.map(i=>'#'+(i+1)+'('+finalRoles[i]+')').join(',')}`);
  console.log('胜利阵营=', c('green', winners.join(', ')));
  if (winners.includes('tanner') && !winners.includes('werewolf')) {
    console.log(c('green', '✓ 皮匠胜，狼人不胜'));
  }
}

// ============================================================
console.log(c('bold', '\n========== 场景 6：所有角色全开 8 人局完整流程 ==========\n'));
{
  const { room, game } = setupGame(
    ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac'],
    ['狼A','狼B','爪','预言','盗','蛋','酒','失眠']
  );
  console.log('步骤：', game.nightSteps.map(s => s.kind).join(' → '));
  console.log('参与人数：', game.nightSteps.map(s => `${s.kind}:${s.players.length}`).join(' '));
}

console.log(c('bold', '\n========== 模拟完毕 ==========\n'));
process.exit(0);
