// 端到端模拟：人工跑一次看看游戏流程对不对
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

function listSteps(game) {
  return game.nightSteps.map(s => `${s.kind}(${s.players.length})`).join(' → ');
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
  console.log('夜晚步骤：', listSteps(game));

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
console.log(c('bold', '\n========== 场景 2：化身复制狼人 ==========\n'));
{
  const { room, game } = setupGame(
    ['doppelganger', 'werewolf', 'seer', 'villager'],
    null,
    ['化身', '原狼', '预言', '村民']
  );
  console.log('初始步骤：', listSteps(game));
  gotoStep(game, 'doppelganger_choose');
  room.players[0].privateLog = [];
  game.handleAction(0, { target: 1 });
  const r = room.players[0].privateLog.pop();
  console.log(c('yellow', `化身复制了 ${r.payload.targetNickname}，变成 ${r.payload.copiedRole}`));
  console.log('重生成步骤：', listSteps(game));
  showRoles('化身后', game);

  const wolf = game.nightSteps.find(s => s.kind === 'werewolf_see');
  console.log(wolf.players.includes(0) && wolf.players.includes(1) ? c('green', '✓ 化身并入狼人步骤') : c('red', '✗ 未并入'));
  const lone = game.nightSteps.find(s => s.kind === 'lone_wolf_peek');
  console.log(lone.players.length === 0 ? c('green', '✓ 双狼后独狼步骤空跑') : c('red', '✗ 不该有人'));
}

// ============================================================
console.log(c('bold', '\n========== 场景 3：反作弊 - 配置里有化身但牌在中央 ==========\n'));
{
  const sel = { doppelganger: 1, werewolf: 1, seer: 1, villager: 4 };
  // 场景 A：化身在玩家手里
  const a = setupGame(['doppelganger','werewolf','seer','villager'], sel, ['化身','狼','预言','村']);
  // 场景 B：化身在中央底牌（玩家是村+狼+预言+村，化身被埋）
  const b = setupGame(['werewolf','seer','villager','villager'], sel, ['狼','预言','村A','村B'], ['doppelganger','villager','villager']);

  console.log('场景 A (化身在手) 步骤：', listSteps(a.game));
  console.log('场景 B (化身在中央) 步骤：', listSteps(b.game));

  const sameKinds = a.game.nightSteps.map(s => s.kind).join(',') === b.game.nightSteps.map(s => s.kind).join(',');
  console.log(sameKinds ? c('green', '✓ 两场景步骤序列完全相同 - 外部无法分辨') : c('red', '✗ 步骤不同会泄漏底牌'));
  console.log('  场景 A doppelganger_choose 当事人:', a.game.nightSteps.find(s=>s.kind==='doppelganger_choose').players);
  console.log('  场景 B doppelganger_choose 当事人:', b.game.nightSteps.find(s=>s.kind==='doppelganger_choose').players);
}

// ============================================================
console.log(c('bold', '\n========== 场景 4：超时随机 - 化身玩家不行动 ==========\n'));
{
  const { game } = setupGame(
    ['doppelganger', 'werewolf', 'seer', 'villager'],
    null,
    ['化身懒鬼', '狼', '预言', '村']
  );
  game.room.config.nightStepSeconds = 1;
  gotoStep(game, 'doppelganger_choose');
  console.log('化身不行动 → 触发 handleStepTimeout');
  console.log('前 currentRoles:', game.currentRoles.join(', '));
  game.handleStepTimeout();
  console.log('后 currentRoles:', game.currentRoles.join(', '));
  if (game.currentRoles[0] !== 'doppelganger') {
    console.log(c('green', `✓ 系统随机替化身复制了 ${game.currentRoles[0]}`));
  } else {
    console.log(c('red', '✗ 化身未被替换'));
  }
  console.log('重生成步骤：', listSteps(game));
  if (game.stepTimer) clearTimeout(game.stepTimer);
}

// ============================================================
console.log(c('bold', '\n========== 场景 5：超时随机 - 强盗不行动 ==========\n'));
{
  const { game } = setupGame(
    ['robber', 'villager', 'seer'],
    null,
    ['盗', '村', '预言']
  );
  gotoStep(game, 'robber_choose');
  console.log('前 roles:', game.currentRoles.join(', '));
  game.handleStepTimeout();
  console.log('后 roles:', game.currentRoles.join(', '));
  console.log(game.currentRoles[0] !== 'robber' ? c('green', '✓ 系统替强盗随机偷了一人') : c('red', '✗ 没生效'));
  if (game.stepTimer) clearTimeout(game.stepTimer);
}

// ============================================================
console.log(c('bold', '\n========== 场景 6：完整 8 人局步骤序列 ==========\n'));
{
  const sel = { werewolf: 2, minion: 1, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, doppelganger: 1, villager: 2 };
  const { game } = setupGame(
    ['werewolf','werewolf','minion','seer','robber','troublemaker','drunk','insomniac'],
    sel,
    ['狼A','狼B','爪','预言','盗','蛋','酒','失眠']
  );
  console.log('步骤序列（参与数）：');
  game.nightSteps.forEach((s, i) => {
    const flag = s.players.length === 0 ? c('yellow', '←空跑') : '';
    console.log(`  ${(i+1).toString().padStart(2)}. ${s.kind.padEnd(22)} 参与=${s.players.length}人 ${flag}`);
  });
  console.log(c('dim', '(化身在中央底牌时，doppelganger_choose 步骤照在但 0 参与，timer 跑满)'));
}

console.log(c('bold', '\n========== 模拟完毕 ==========\n'));
process.exit(0);
