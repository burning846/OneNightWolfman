import { useGame } from '../GameContext.jsx';
import { roleEmoji, roleName, roleTeam } from '../game/engine.js';

export default function ResultScreen() {
  const { state, api } = useGame();
  const room = state.roomState;
  const result = state.result;

  if (!result) {
    return (
      <div className="screen">
        <div className="banner">
          <div className="h2" style={{ margin: 0 }}>等待结算…</div>
        </div>
      </div>
    );
  }

  const iAmHost = room.hostId === state.playerId;
  const myFinalRole = result.finalRoles[state.myPlayerIdx];
  const iWon = didIWin(myFinalRole, state.myPlayerIdx, result);

  const handleLeave = () => {
    if (window.confirm('确定要退出房间吗？')) {
      api.leaveRoom();
    }
  };

  return (
    <div className="screen">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleLeave}>× 退出</button>
        <span className="kicker">🎬 真相揭晓</span>
        <span style={{ width: 60 }} />
      </div>

      <div className={`banner ${iWon ? '' : 'banner-danger'}`}>
        <div style={{ fontSize: 36 }}>{iWon ? '🏆' : '😢'}</div>
        <div className="h2" style={{ margin: 0 }}>
          {iWon ? '你赢了！' : '你输了'}
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          胜利阵营：{result.winners.map(w => teamCnLabel(w)).join('、') || '无人胜利'}
        </div>
      </div>

      <div className="card col">
        <h2 className="h2">所有玩家的最终身份</h2>
        <div className="col" style={{ gap: 8 }}>
          {room.players.map((p, idx) => {
            const initRole = result.initialRoles[idx];
            const finalRole = result.finalRoles[idx];
            const changed = initRole !== finalRole;
            const killed = result.killed.includes(idx);
            const voteCount = result.counts[idx] || 0;
            return (
              <div key={p.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ gap: 4, alignItems: 'flex-start' }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{p.nickname}</span>
                    <span className="text-muted" style={{ fontSize: 11 }}>#{idx + 1}</span>
                    {killed && <span className="tag tag-werewolf">出局</span>}
                  </div>
                  <div className="row" style={{ gap: 6, alignItems: 'center', fontSize: 13 }}>
                    <span>{roleEmoji(finalRole)} {roleName(finalRole)}</span>
                    {changed && (
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        （原：{roleName(initRole)}）
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {voteCount} 票
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card col">
        <h2 className="h2">中央底牌</h2>
        <div className="grid grid-cols-3">
          {result.centerCards.map((role, i) => (
            <div key={i} className="center-card">
              <div className="col" style={{ gap: 4, alignItems: 'center' }}>
                <div className="label">中央 {i + 1}</div>
                <div style={{ fontSize: 28 }}>{roleEmoji(role)}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{roleName(role)}</div>
                {result.initialCenter[i] !== role && (
                  <div className="text-muted" style={{ fontSize: 10 }}>
                    原：{roleName(result.initialCenter[i])}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card col">
        <h2 className="h2">投票详情</h2>
        <div className="col" style={{ gap: 6 }}>
          {Object.entries(result.votes).map(([voter, target]) => (
            <div key={voter} className="list-item" style={{ padding: '8px 12px' }}>
              <span>
                <b>{room.players[+voter]?.nickname}</b>{' '}
                <span className="text-muted">→</span>{' '}
                <b>{room.players[+target]?.nickname}</b>
              </span>
            </div>
          ))}
        </div>
        {result.hunterChain.length > 0 && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            🏹 猎人连带带走了：{result.hunterChain.map(i => room.players[i]?.nickname).join('、')}
          </div>
        )}
        {result.killed.length === 0 && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            无人得到 2 票及以上，今晚无人出局。
          </div>
        )}
      </div>

      <div className="fab-bar">
        {iAmHost ? (
          <button className="btn btn-primary btn-block" onClick={api.restartGame}>
            🔄 再来一局
          </button>
        ) : (
          <div className="btn btn-block" style={{ opacity: 0.7 }}>等待房主开始下一局…</div>
        )}
      </div>
    </div>
  );
}

function teamCnLabel(team) {
  if (team === 'werewolf') return '狼人阵营';
  if (team === 'tanner') return '皮匠';
  if (team === 'village') return '村庄阵营';
  return team;
}

function didIWin(role, idx, result) {
  if (!role || idx == null) return false;
  if (role === 'tanner') return result.killed.includes(idx);
  const team = roleTeam(role);
  return result.winners.includes(team);
}
