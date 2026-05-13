// 单局游戏的状态机
import {
  dealCards,
  generateNightSteps,
  resolveKilled,
  determineWinners,
} from './engine.js';
import { LOBBY_GRACE_MS } from './rooms.js';
import { saveGameRecord } from './auth.js';

const STEP_TIMEOUT_MS = 90 * 1000;
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
    this.result = null;
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
    this.nightSteps = generateNightSteps(initialPlayerRoles);
    this.stepIndex = -1;
    this.votes = {};
    this.result = null;

    this.room.players.forEach((p, idx) => {
      const payload = { role: this.initialRoles[idx], playerIdx: idx };
      p.privateLog.push({ event: 'your_role', payload });
      this.emitPrivate(p.id, 'your_role', payload);
    });

    this.room.phase = 'night';
    this.broadcastRoomState();

    setTimeout(() => this.nextStep(), 3000);
  }

  nextStep() {
    this.clearStepTimer();
    this.stepIndex += 1;
    this.completed = new Set();

    if (this.stepIndex >= this.nightSteps.length) {
      return this.startDay();
    }

    const step = this.nightSteps[this.stepIndex];

    this.io.to(this.room.code).emit('night_step', {
      stepIndex: this.stepIndex,
      totalSteps: this.nightSteps.length,
      role: step.role,
      kind: step.kind,
      actorCount: step.players.length,
    });

    for (const playerIdx of step.players) {
      const player = this.room.players[playerIdx];
      if (!player) continue;
      const msg = this.buildInitialPayload(step, playerIdx);
      if (msg) {
        player.privateLog.push(msg);
        this.emitPrivate(player.id, msg.event, msg.payload);
      }
    }

    this.stepTimer = setTimeout(() => this.nextStep(), STEP_TIMEOUT_MS);
  }

  buildInitialPayload(step, playerIdx) {
    switch (step.kind) {
      case 'werewolf_see': {
        const others = step.players
          .filter(i => i !== playerIdx)
          .map(i => ({ idx: i, nickname: this.room.players[i].nickname }));
        return { event: 'night_reveal', payload: { kind: 'werewolf_see', others } };
      }
      case 'lone_wolf_peek':
        return { event: 'night_prompt', payload: { kind: 'lone_wolf_peek' } };
      case 'minion_see': {
        const werewolves = this.findInitial('werewolf').map(i => ({
          idx: i, nickname: this.room.players[i].nickname,
        }));
        return { event: 'night_reveal', payload: { kind: 'minion_see', werewolves } };
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

  findInitial(roleId) {
    const r = [];
    this.initialRoles.forEach((role, i) => { if (role === roleId) r.push(i); });
    return r;
  }

  handleAction(playerIdx, payload) {
    const step = this.nightSteps[this.stepIndex];
    if (!step) return false;
    if (!step.players.includes(playerIdx)) return false;

    const N = this.room.players.length;
    const player = this.room.players[playerIdx];
    let reveal = null;

    switch (step.kind) {
      case 'lone_wolf_peek': {
        const c = payload?.centerIdx;
        if (typeof c !== 'number' || c < 0 || c > 2) return false;
        reveal = {
          kind: 'lone_wolf_peek_reveal',
          centerIdx: c,
          role: this.currentCenter[c],
        };
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

    player.privateLog.push({ event: 'night_reveal', payload: reveal });
    this.emitPrivate(player.id, 'night_reveal', reveal);
    return true;
  }

  handleDone(playerIdx) {
    const step = this.nightSteps[this.stepIndex];
    if (!step) return;
    if (!step.players.includes(playerIdx)) return;
    this.completed.add(playerIdx);
    if (this.completed.size >= step.players.length) {
      this.clearStepTimer();
      this.stepTimer = setTimeout(() => this.nextStep(), 800);
    }
  }

  startDay() {
    this.clearAllTimers();
    this.room.phase = 'day';
    this.dayEndsAt = Date.now() + this.room.config.discussionSeconds * 1000;
    this.io.to(this.room.code).emit('day_phase', { endsAt: this.dayEndsAt });
    this.broadcastRoomState();
    this.dayTimer = setTimeout(
      () => this.startVote(),
      this.room.config.discussionSeconds * 1000
    );
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
      setTimeout(() => this.endVote(), 1000);
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
    };

    this.result = payload;
    this.io.to(this.room.code).emit('result', payload);
    this.broadcastRoomState();

    // 异步存到数据库（不阻塞，失败不影响游戏）
    saveGameRecord({
      roomCode: this.room.code,
      config: this.room.config,
      players: this.room.players.map(p => ({ userId: p.userId, nickname: p.nickname })),
      result: payload,
    }).catch(e => console.error('[wolf] save game record failed', e));
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
