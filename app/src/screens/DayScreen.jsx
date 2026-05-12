import { useEffect, useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { roleEmoji, roleName } from '../game/engine.js';

function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, Math.floor((endsAt - Date.now()) / 1000)) : 0
  );
  useEffect(() => {
    if (!endsAt) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

function formatMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DayScreen() {
  const { state, api } = useGame();
  const remaining = useCountdown(state.dayEndsAt);
  const room = state.roomState;
  const iAmHost = room?.hostId === state.playerId;

  return (
    <div className="screen">
      <div className="kicker">☀️ 白天 · 自由讨论</div>

      <div className="card col text-center" style={{ gap: 8 }}>
        <div className="kicker">剩余时间</div>
        <div className="timer-display">{formatMMSS(remaining)}</div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          自由互相发问、分享线索、施压试探
        </div>
      </div>

      <div className="card col">
        <div className="kicker text-center">你的初始身份</div>
        <div className="row" style={{ alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{roleEmoji(state.myRole)}</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{roleName(state.myRole)}</span>
        </div>
        <div className="text-muted text-center" style={{ fontSize: 12 }}>
          夜里可能已发生身份变化，最终结算见结果页
        </div>
      </div>

      {state.nightReveals.length > 0 && (
        <div className="card col">
          <h2 className="h2">你的夜晚记录</h2>
          <div className="col" style={{ gap: 8 }}>
            {state.nightReveals.map((r, i) => (
              <RevealSummary key={i} reveal={r} />
            ))}
          </div>
        </div>
      )}

      <div className="card col">
        <h2 className="h2">在场玩家</h2>
        <div className="grid grid-cols-3">
          {room?.players.map((p, idx) => (
            <div key={p.id} className="player-button" style={{ opacity: p.connected ? 1 : 0.5 }}>
              <div>{p.nickname}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>#{idx + 1}{idx === state.myPlayerIdx ? ' · 我' : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {iAmHost && (
        <div className="fab-bar">
          <button className="btn btn-danger btn-block" onClick={api.skipDay}>
            ⏭ 跳过讨论，立即投票
          </button>
        </div>
      )}
    </div>
  );
}

function RevealSummary({ reveal }) {
  const r = reveal;
  if (r.kind === 'werewolf_see') {
    const names = r.others.map(o => o.nickname).join('、');
    return <div className="list-item"><span>🐺 同伴狼人</span><span className="text-muted">{names || '独狼'}</span></div>;
  }
  if (r.kind === 'lone_wolf_peek_reveal') {
    return <div className="list-item"><span>🐺 中央 {r.centerIdx + 1}</span><span>{roleEmoji(r.role)} {roleName(r.role)}</span></div>;
  }
  if (r.kind === 'minion_see') {
    const names = r.werewolves.map(o => o.nickname).join('、');
    return <div className="list-item"><span>😈 狼人是</span><span className="text-muted">{names || '无狼'}</span></div>;
  }
  if (r.kind === 'mason_see') {
    const names = r.others.map(o => o.nickname).join('、');
    return <div className="list-item"><span>🛡️ 同伴守夜人</span><span className="text-muted">{names || '只有你一名'}</span></div>;
  }
  if (r.kind === 'seer_reveal') {
    return (
      <div className="list-item">
        <span>🔮 预言</span>
        <span>
          {r.results.map((x, i) => (
            <span key={i} style={{ marginLeft: 6 }}>
              {x.idx !== undefined ? `#${x.idx + 1}` : `中央${x.centerIdx + 1}`}={roleName(x.role)}
            </span>
          ))}
        </span>
      </div>
    );
  }
  if (r.kind === 'robber_reveal') {
    return <div className="list-item"><span>🦹 偷自 {r.targetNickname}</span><span>{roleEmoji(r.newRole)} {roleName(r.newRole)}</span></div>;
  }
  if (r.kind === 'troublemaker_done') {
    return <div className="list-item"><span>👹 已互换</span><span className="text-muted">{r.targetNicknames.join(' ⇄ ')}</span></div>;
  }
  if (r.kind === 'drunk_done') {
    return <div className="list-item"><span>🍺 已与中央 {r.centerIdx + 1} 交换</span><span className="text-muted">未知</span></div>;
  }
  if (r.kind === 'insomniac_see') {
    return <div className="list-item"><span>👁️ 最终身份</span><span>{roleEmoji(r.currentRole)} {roleName(r.currentRole)}</span></div>;
  }
  return null;
}
