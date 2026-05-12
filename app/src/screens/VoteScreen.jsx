import { useEffect, useState } from 'react';
import { useGame } from '../GameContext.jsx';

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

export default function VoteScreen() {
  const { state, api } = useGame();
  const room = state.roomState;
  const remaining = useCountdown(state.voteEndsAt);
  const [picked, setPicked] = useState(state.myVote);

  const submitVote = () => {
    if (picked === null || picked === undefined) return;
    api.castVote(picked);
  };

  return (
    <div className="screen">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="kicker">🗳️ 投票阶段</span>
        <span className="text-muted">{remaining} 秒</span>
      </div>

      <div className="card col text-center" style={{ gap: 6 }}>
        <div className="kicker">投票进度</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>
          {state.voteProgress.count} / {state.voteProgress.total}
        </div>
        <div className="text-muted" style={{ fontSize: 12 }}>所有人投完即结算</div>
      </div>

      {state.myVote !== null ? (
        <div className="banner">
          <div style={{ fontSize: 28 }}>✓</div>
          <div className="h2" style={{ margin: 0 }}>
            你已投票给 {room.players[state.myVote]?.nickname}
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            等待其他玩家投票…
          </div>
        </div>
      ) : (
        <>
          <div className="card col">
            <h2 className="h2">投谁出局？</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
              得票最多者出局（≥2 票才会被淘汰）。投自己也可以。
            </p>
            <div className="grid grid-cols-3">
              {room.players.map((p, idx) => (
                <button
                  key={p.id}
                  className={`player-button ${picked === idx ? 'selected' : ''}`}
                  onClick={() => setPicked(idx)}
                >
                  <div>{p.nickname}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    #{idx + 1}{idx === state.myPlayerIdx ? ' · 我' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="fab-bar">
            <button
              className="btn btn-primary btn-block"
              disabled={picked === null}
              onClick={submitVote}
            >
              ✓ 确认投票
            </button>
          </div>
        </>
      )}
    </div>
  );
}
