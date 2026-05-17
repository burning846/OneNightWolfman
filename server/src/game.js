// 单局游戏的状态机
import {
  dealCards,
  generateNightSteps,
  randomActionFor,
  resolveKilled,
  determineWinners,
} from './engine.js';
import { LOBBY_GRACE_MS } from './rooms.js';

async function trySaveGameRecord(payload) {
  try {
    const { saveGameRecord } = await import('./auth.js');
    await saveGameRecord(payload);
  } catch (e) {
    if (e?.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error('[wolf] save game record failed', e);
    }
  }
}

const DEFAULT_NIGHT_STEP_SECONDS = 25;
const VOTE_TIMEOUT_MS = 60 * 1000;

export class GameSession {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.initialRoles = [];
    this.initialCenter = [];
    this.currentRoles = [];
    this.currentCenter = [];
    this.nightSteps = [];
    this.stepIndex = -1;
    this.completed = new Set();
    this.stepTimer = null;
    this.dayTimer = null;
    this.voteTimer = null;
    this.votes = {};
    this.dayEndsAt = null;
    this.voteEndsAt = null;
    this.stepEndsAt = null;
    this.result = null;
    this.doppelgangerCopies = {};
  }

  nightStepMs() {
    const s = Number(this.room.config?.nightStepSeconds) || DEFAULT_NIGHT_STEP_SECONDS;
    return Math.max(5, Math.min(120, s)) * 1000;
  }

  start() {
    this.room.cancelAllRemovals();
    const { initialPlayerRoles, initialCenter } = dealCards(
      this.room.config.selectedRoles,
      this.room.players.length
    );
    this.initialRoles = initialPlayerRoles;
    this.initialCenter = initialCenter;
    this.currentRoles = [...initialPlayerRoles];
    this.currentCenter = [...initialCenter];
    this.nightSteps = this.computeNightSteps();
    this.stepIndex = -1;
    this.votes = {};
    this.result = null;
    this.doppelgangerCopies = {};

    this.room.players.forEach((p, idx) => {
      const payload = { role: this.initialRoles[idx], playerIdx: idx };
      p.privateLog.push({ event: 'your_role', payload });
      this.emitPrivate(p.id, 'your_role', payload);
    });

    this.room.phase = 'night';
    this.broadcastRoomState();
    setTimeout(() => this.nextStep(), 3000).unref();
  }

  computeNightSteps() {
    const steps = [];
    // 化身幽灵：只要选了就有步骤，即使牌在中央底牌也走这一阶段
    const doppelgangerSelected = (this.room.config.selectedRoles?.doppelganger || 0) > 0;
    if (doppelgangerSelected) {
      const players = [];
      this.initialRoles.forEach((r, i) => { if (r === 'doppelganger') players.push(i); });
      steps.push({ kind: 'doppelganger_choose', role: 'doppelganger', players });
    }
    steps.push(...generateNightSteps(this.room.config.selectedRoles, this.currentRoles));
    return steps;
  }

  regenerateRemainingSteps() {
    const before = this.nightSteps.slice(0, this.stepIndex + 1);
    const after = generateNightSteps(this.room.config.selectedRoles, this.currentRoles);
    this.nightSteps = [...before, ...after];
  }

  nextStep() {
    this.clearStepTimer();
    this.stepIndex += 1;
    this.completed = new Set();

    if (this.stepIndex >= this.nightSteps.length) {
      this.stepEndsAt = null;
      return this.startDay();
    }

    const step = this.nightSteps[this.stepIndex];
    const ms = this.nightStepMs();
    this.stepEndsAt = Date.now() + ms;

    // 公开广播：不暴露 actorCount，所有步骤对外观感一致（反作弊）
    this.io.to(this.room.code).emit('night_step', {
      stepIndex: this.stepIndex,
      totalSteps: this.nightSteps.length,
      role: step.role,
      kind: step.kind,
      endsAt: this.stepEndsAt,
    });
    this.broadcastRoomState();

    // 私发提示/揭示给真正的当事人
    for (const playerIdx of step.players) {
      const player = this.room.players[playerIdx];
      if (!player) continue;
      const msg = this.buildInitialPayload(step, playerIdx);
      if (msg) {
        player.privateLog.push(msg);
        this.emitPrivate(player.id, msg.event, msg.payload);
      }
    }

    // 时间到 → 给未完成的当事人随机分配动作 → 推进下一步
    this.stepTimer = setTimeout(() => this.handleStepTimeout(), ms);
    this.stepTimer.unref?.();
  }

  handleStepTimeout() {
    const step = this.nightSteps[this.stepIndex];
    if (!step) return this.nextStep();
    const N = this.room.players.length;
    let regenerateNeeded = false;
    for (const playerIdx of step.players) {
      if (this.completed.has(playerIdx)) continue;
      const action = randomActionFor(step.kind, playerIdx, N);
      if (action !== null) {
        // 用 handleAction 走相同的副作用（修改 currentRoles、发 reveal、必要时重生成步骤）
        const ok = this.handleAction(playerIdx, action, /*skipReveal*/ false);
        if (ok && step.kind === 'doppelganger_choose') regenerateNeeded = true;
      }
    }
    // 给前端一点点时间渲染最后的 reveal 再推进
    setTimeout(() => this.nextStep(), 500).unref();
  }

  buildInitialPayload(step, playerIdx) {
    switch (step.kind) {
      case 'doppelganger_choose':
        return { event: 'night_prompt', payload: { kind: 'doppelganger_choose' } };
      case 'werewolf_see': {
        const others = step.players
          .filter(i => i !== playerIdx)
          .map(i => ({ idx: i, nickname: this.room.players[i].nickname }));
        return { event: 'night_reveal', payload: { kind: 'werewolf_see', others } };
      }
      case 'lone_wolf_peek':
        return { event: 'night_prompt', payload: { kind: 'lone_wolf_peek' } };
      case 'minion_see': {
        const werewolves = [];
        this.currentRoles.forEach((r, i) => { if (r === 'werewolf') werewolves.push(i); });
        const list = werewolves.map(i => ({ idx: i, nickname: this.room.players[i].nickname }));
        return { event: 'night_reveal', payload: { kind: 'minion_see', werewolves: list } };
      }
      case 'mason_see': {
        const others = step.players
          .filter(i => i !== playerIdx)
          .map(i => ({ idx: i, nickname: this.room.players[i].nickname }));
        return { event: 'night_reveal', payload: { kind: 'mason_see', others } };
      }
      case 'seer_choose':
      case 'robber_choose':
      case 'troublemaker_choose':
      case 'drunk_choose':
        return { event: 'night_prompt', payload: { kind: step.kind } };
      case 'insomniac_see':
        return {
          event: 'night_reveal',
          payload: { kind: 'insomniac_see', currentRole: this.currentRoles[playerIdx] },
        };
      default:
        return null;
    }
  }

  // skipReveal: 内部超时随机调用时也走 reveal（玩家会知道系统帮他选了什么）
  handleAction(playerIdx, payload, skipReveal = false) {
    const step = this.nightSteps[this.stepIndex];
    if (!step) return false;
    if (!step.players.includes(playerIdx)) return false;
    if (this.completed.has(playerIdx)) return false;  // 不能重复行动
    const N = this.room.players.length;
    const player = this.room.players[playerIdx];
    let reveal = null;
    let needRegenerate = false;

    switch (step.kind) {
      case 'doppelganger_choose': {
        const t = payload?.target;
        if (typeof t !== 'number' || t === playerIdx || t < 0 || t >= N) return false;
        const copiedRole = this.currentRoles[t];
        this.currentRoles[playerIdx] = copiedRole;
        this.doppelgangerCopies[playerIdx] = copiedRole;
        reveal = {
          kind: 'doppelganger_reveal',
          target: t,
          targetNickname: this.room.players[t].nickname,
          copiedRole,
        };
        needRegenerate = true;
        break;
      }
      case 'lone_wolf_peek': {
        const c = payload?.centerIdx;
        if (typeof c !== 'number' || c < 0 || c > 2) return false;
        reveal = { kind: 'lone_wolf_peek_reveal', centerIdx: c, role: this.currentCenter[c] };
        break;
      }
      case 'seer_choose': {
        if (payload?.type === 'player') {
          const t = payload.target;
          if (typeof t !== 'number' || t === playerIdx || t < 0 || t >= N) return false;
          reveal = {
            kind: 'seer_reveal',
            type: 'player',
            results: [{ idx: t, role: this.currentRoles[t] }],
          };
        } else if (payload?.type === 'center') {
          const ts = payload.targets;
          if (!Array.isArray(ts) || ts.length !== 2) return false;
          if (ts.some(t => typeof t !== 'number' || t < 0 || t > 2)) return false;
          if (ts[0] === ts[1]) return false;
          reveal = {
            kind: 'seer_reveal',
            type: 'center',
            results: ts.map(t => ({ centerIdx: t, role: this.currentCenter[t] })),
          };
        } else return false;
        break;
      }
      case 'robber_choose': {
        const t = payload?.target;
        if (typeof t !== 'number' || t === playerIdx || t < 0 || t >= N) return false;
        [this.currentRoles[playerIdx], this.currentRoles[t]] =
          [this.currentRoles[t], this.currentRoles[playerIdx]];
        reveal = {
          kind: 'robber_reveal',
          target: t,
          targetNickname: this.room.players[t].nickname,
          newRole: this.currentRoles[playerIdx],
        };
        break;
      }
      case 'troublemaker_choose': {
        const ts = payload?.targets;
        if (!Array.isArray(ts) || ts.length !== 2) return false;
        if (ts[0] === ts[1]) return false;
        if (ts.some(t => typeof t !== 'number' || t === playerIdx || t < 0 || t >= N)) return false;
        [this.currentRoles[ts[0]], this.currentRoles[ts[1]]] =
          [this.currentRoles[ts[1]], this.currentRoles[ts[0]]];
        reveal = {
          kind: 'troublemaker_done',
          targets: ts,
          targetNicknames: ts.map(i => this.room.players[i].nickname),
        };
        break;
      }
      case 'drunk_choose': {
        const c = payload?.centerIdx;
        if (typeof c !== 'number' || c < 0 || c > 2) return false;
        [this.currentRoles[playerIdx], this.currentCenter[c]] =
          [this.currentCenter[c], this.currentRoles[playerIdx]];
        reveal = { kind: 'drunk_done', centerIdx: c };
        break;
      }
      default:
        return false;
    }

    this.completed.add(playerIdx);  // 标记已完成（防重）
    if (!skipReveal) {
      player.privateLog.push({ event: 'night_reveal', payload: reveal });
      this.emitPrivate(player.id, 'night_reveal', reveal);
    }
    if (needRegenerate) this.regenerateRemainingSteps();
    return true;
  }

  // 玩家点"我已知晓"。仅作为标记，不会提前推进（反作弊：所有步骤同长）
  handleDone(playerIdx) {
    const step = this.nightSteps[this.stepIndex];
    if (!step) return;
    if (!step.players.includes(playerIdx)) return;
    // 纯展示性步骤（无 action）也可以通过 handleDone 标记完成
    this.completed.add(playerIdx);
  }

  startDay() {
    this.clearAllTimers();
    this.room.phase = 'day';
    this.dayEndsAt = Date.now() + this.room.config.discussionSeconds * 1000;
    this.stepEndsAt = null;
    this.io.to(this.room.code).emit('day_phase', { endsAt: this.dayEndsAt });
    this.broadcastRoomState();
    this.dayTimer = setTimeout(
      () => this.startVote(),
      this.room.config.discussionSeconds * 1000
    );
    this.dayTimer.unref?.();
  }

  skipToVote() {
    if (this.room.phase === 'day') this.startVote();
  }

  startVote() {
    this.clearAllTimers();
    this.room.phase = 'vote';
    this.voteEndsAt = Date.now() + VOTE_TIMEOUT_MS;
    this.votes = {};
    this.io.to(this.room.code).emit('vote_phase', { endsAt: this.voteEndsAt });
    this.broadcastRoomState();
    this.voteTimer = setTimeout(() => this.endVote(), VOTE_TIMEOUT_MS);
    this.voteTimer.unref?.();
  }

  handleVote(playerIdx, targetIdx) {
    if (this.room.phase !== 'vote') return false;
    const N = this.room.players.length;
    if (typeof targetIdx !== 'number' || targetIdx < 0 || targetIdx >= N) return false;
    this.votes[playerIdx] = targetIdx;
    this.io.to(this.room.code).emit('vote_progress', {
      count: Object.keys(this.votes).length,
      total: N,
    });
    if (Object.keys(this.votes).length >= N) {
      this.clearAllTimers();
      setTimeout(() => this.endVote(), 1000).unref();
    }
    return true;
  }

  endVote() {
    this.clearAllTimers();
    const N = this.room.players.length;
    const { killed, counts, hunterChain } = resolveKilled(this.votes, N, this.currentRoles);
    const winners = determineWinners(this.currentRoles, killed);
    this.room.phase = 'result';

    const payload = {
      initialRoles: this.initialRoles,
      finalRoles: this.currentRoles,
      initialCenter: this.initialCenter,
      centerCards: this.currentCenter,
      votes: this.votes,
      counts,
      killed,
      hunterChain,
      winners,
      doppelgangerCopies: this.doppelgangerCopies,
    };

    this.result = payload;
    this.io.to(this.room.code).emit('result', payload);
    this.broadcastRoomState();

    trySaveGameRecord({
      roomCode: this.room.code,
      config: this.room.config,
      players: this.room.players.map(p => ({ userId: p.userId, nickname: p.nickname })),
      result: payload,
    });
  }

  resetToLobby() {
    this.clearAllTimers();
    this.room.phase = 'lobby';
    this.room.players.forEach(p => { p.privateLog = []; });
    this.room.game = null;
    for (const p of this.room.players) {
      if (!p.connected) {
        this.room.scheduleRemoval(p.id, LOBBY_GRACE_MS, () => {
          this.io.to(this.room.code).emit('room_state', this.room.toPublicState());
        });
      }
    }
    this.broadcastRoomState();
  }

  broadcastRoomState() {
    this.io.to(this.room.code).emit('room_state', this.room.toPublicState());
  }

  emitPrivate(playerId, event, payload) {
    this.io.to(playerId).emit(event, payload);
  }

  clearStepTimer() {
    if (this.stepTimer) { clearTimeout(this.stepTimer); this.stepTimer = null; }
  }

  clearAllTimers() {
    this.clearStepTimer();
    if (this.dayTimer) { clearTimeout(this.dayTimer); this.dayTimer = null; }
    if (this.voteTimer) { clearTimeout(this.voteTimer); this.voteTimer = null; }
  }
}
