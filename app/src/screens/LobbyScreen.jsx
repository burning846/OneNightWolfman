import { useMemo, useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { ROLES } from '../game/roles.js';
import { deckSize, validateConfig } from '../game/engine.js';

export default function LobbyScreen() {
  const { state, api } = useGame();
  const room = state.roomState;
  if (!room) return null;

  const iAmHost = room.hostId === state.playerId;
  const playerCount = room.players.length;
  const required = playerCount + 3;
  const totalDeck = useMemo(() => deckSize(room.config.selectedRoles), [room.config.selectedRoles]);
  const error = validateConfig(room.config.selectedRoles, playerCount);
  const [copied, setCopied] = useState(false);

  const setCount = (roleId, n) => {
    if (!iAmHost) return;
    const next = { ...room.config.selectedRoles };
    const v = Math.max(0, Math.min(10, n));
    if (v === 0) delete next[roleId];
    else next[roleId] = v;
    api.updateConfig(next, undefined, undefined);
  };

  const setDiscussion = (sec) => {
    if (!iAmHost) return;
    api.updateConfig(undefined, sec, undefined);
  };

  const setNightStep = (sec) => {
    if (!iAmHost) return;
    api.updateConfig(undefined, undefined, sec);
  };

  const start = async () => {
    if (!iAmHost) return;
    await api.startGame();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="screen">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => api.leaveRoom()}>← 离开</button>
        <span className="kicker">房间大厅</span>
        <span style={{ width: 60 }} />
      </div>

      <div className="card col text-center" style={{ gap: 8 }}>
        <div className="kicker">房间号</div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: 6 }}>{room.code}</div>
        <button className="btn btn-ghost" onClick={copyCode}>
          {copied ? '✓ 已复制' : '复制房间号'}
        </button>
      </div>

      <div className="card col">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="h2">玩家 ({playerCount}/10)</h2>
          {iAmHost && <span className="text-muted" style={{ fontSize: 12 }}>你是房主</span>}
        </div>
        <div className="col" style={{ gap: 8 }}>
          {room.players.map((p) => (
            <div key={p.id} className="list-item">
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span className="dot" style={{ background: p.connected ? 'var(--success)' : 'var(--text-3)' }} />
                <span style={{ fontWeight: 600 }}>{p.nickname}</span>
                {p.isHost && <span className="tag">房主</span>}
                {p.id === state.playerId && <span className="tag">我</span>}
              </div>
              {!p.connected && <span className="text-muted" style={{ fontSize: 12 }}>离线</span>}
            </div>
          ))}
        </div>
        {playerCount < 3 && (
          <div className="text-muted" style={{ fontSize: 13 }}>至少需要 3 名玩家才能开始</div>
        )}
      </div>

      <div className="card col">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="h2">角色配置</h2>
          <span className={totalDeck === required ? 'text-success' : 'text-danger'}>
            {totalDeck} / {required}
          </span>
        </div>

        <div className="grid grid-cols-2">
          {Object.values(ROLES).map((r) => {
            const cnt = room.config.selectedRoles[r.id] || 0;
            return (
              <div key={r.id} className="role-card">
                <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="emoji">{r.emoji}</span>
                  <div className="counter">
                    <button onClick={() => setCount(r.id, cnt - 1)} disabled={!iAmHost || cnt <= 0}>−</button>
                    <span className="value">{cnt}</span>
                    <button onClick={() => setCount(r.id, cnt + 1)} disabled={!iAmHost}>+</button>
                  </div>
                </div>
                <div className="role-name">{r.name}</div>
                <div className="role-desc">{r.desc}</div>
              </div>
            );
          })}
        </div>

        {!iAmHost && (
          <div className="text-muted" style={{ fontSize: 13 }}>仅房主可以调整配置</div>
        )}
      </div>

      <div className="card col">
        <h2 className="h2">讨论时长</h2>
        <div className="grid grid-cols-3">
          {[180, 300, 480].map((s) => (
            <button
              key={s}
              className={`btn ${room.config.discussionSeconds === s ? 'btn-primary' : ''}`}
              disabled={!iAmHost}
              onClick={() => setDiscussion(s)}
            >
              {s / 60} 分钟
            </button>
          ))}
        </div>
      </div>

      <div className="card col">
        <h2 className="h2">夜晚每步时长</h2>
        <div className="text-muted" style={{ fontSize: 12 }}>
          每个角色阶段固定走这么久，反作弊（防止从跳过环节推断中央底牌）。
          超时未行动 → 系统随机替你选。
        </div>
        <div className="grid grid-cols-3">
          {[15, 25, 40].map((s) => (
            <button
              key={s}
              className={`btn ${(room.config.nightStepSeconds || 25) === s ? 'btn-primary' : ''}`}
              disabled={!iAmHost}
              onClick={() => setNightStep(s)}
            >
              {s} 秒
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="banner banner-danger">
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      )}

      <div className="fab-bar">
        {iAmHost ? (
          <button
            className="btn btn-primary btn-block"
            disabled={!!error || playerCount < 3}
            onClick={start}
          >
            🌙 开始游戏
          </button>
        ) : (
          <div className="btn btn-block" style={{ opacity: 0.7 }}>等待房主开始游戏…</div>
        )}
      </div>
    </div>
  );
}
