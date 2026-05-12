import { useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { ROLES } from '../game/roles.js';

export default function HomeScreen() {
  const { state, api } = useGame();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await api.createRoom(nickname);
      } else if (mode === 'join') {
        await api.joinRoom(roomCode, nickname);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!mode) {
    return (
      <div className="screen">
        <div className="col" style={{ gap: 8, marginTop: 32 }}>
          <div className="kicker">One Night Ultimate Werewolf</div>
          <h1 className="title">一夜终极狼人</h1>
          <p className="subtitle">
            房间制多人在线 · 每人用自己的手机登录同一房间
          </p>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <button
            className="btn btn-primary btn-block"
            onClick={() => setMode('create')}
          >
            🆕 创建房间
          </button>
          <button
            className="btn btn-block"
            onClick={() => setMode('join')}
          >
            🚪 加入房间
          </button>
          <button
            className="btn btn-ghost btn-block"
            onClick={() => setShowRules((v) => !v)}
          >
            {showRules ? '收起角色介绍' : '查看角色介绍'}
          </button>
        </div>

        <div className="card col">
          <h2 className="h2">怎么玩</h2>
          <ol style={{ paddingLeft: 20, margin: 0, color: 'var(--text-2)', lineHeight: 1.7 }}>
            <li>一名玩家创建房间，分享 4 位房间号</li>
            <li>其他玩家用房间号在自己手机上加入</li>
            <li>房主在大厅里配置角色与时间</li>
            <li>开始游戏后按夜晚顺序行动</li>
            <li>讨论 → 投票 → 揭示真相</li>
          </ol>
          <div className="text-muted" style={{ fontSize: 13 }}>
            玩家数：3-10 人。所有信息仅推送给应得的人，关闭页面不会泄密。
          </div>
        </div>

        {showRules && (
          <div className="col" style={{ gap: 10 }}>
            {Object.values(ROLES).map((r) => (
              <div key={r.id} className="card col" style={{ gap: 6 }}>
                <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{r.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div className={teamTag(r.team)} style={{ marginTop: 4 }}>
                      {teamLabel(r.team)}
                    </div>
                  </div>
                </div>
                <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {r.desc}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => setMode(null)}>
          ← 返回
        </button>
        <span className="kicker">{mode === 'create' ? '创建房间' : '加入房间'}</span>
        <span style={{ width: 60 }} />
      </div>

      <div className="card col">
        <h2 className="h2">{mode === 'create' ? '设置你的昵称' : '输入房间信息'}</h2>

        {mode === 'join' && (
          <input
            className="input"
            placeholder="4 位房间号"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
          />
        )}

        <input
          className="input"
          placeholder="你的昵称（最多 12 字）"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 12))}
          maxLength={12}
        />

        <div className="text-muted" style={{ fontSize: 12 }}>
          服务器：{import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}
          {' · '}
          {state.socketConnected ? '已连接' : '连接中…'}
        </div>
      </div>

      <div className="fab-bar">
        <button
          className="btn btn-primary btn-block"
          disabled={
            submitting ||
            !state.socketConnected ||
            !nickname.trim() ||
            (mode === 'join' && roomCode.length !== 4)
          }
          onClick={submit}
        >
          {mode === 'create' ? '创建房间' : '加入房间'}
        </button>
      </div>
    </div>
  );
}

function teamLabel(team) {
  if (team === 'werewolf') return '狼人阵营';
  if (team === 'tanner') return '皮匠';
  return '村庄阵营';
}
function teamTag(team) {
  if (team === 'werewolf') return 'tag tag-werewolf';
  if (team === 'tanner') return 'tag tag-tanner';
  return 'tag tag-village';
}
