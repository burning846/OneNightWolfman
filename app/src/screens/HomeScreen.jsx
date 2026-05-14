import { useEffect, useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { ROLES } from '../game/roles.js';

export default function HomeScreen() {
  const { state, api } = useGame();
  const [mode, setMode] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 进入"创建/加入"模式时，默认用账号昵称
  useEffect(() => {
    if (mode && state.user?.nickname) {
      setNickname(state.user.nickname);
    }
  }, [mode, state.user]);

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

  // 主页（未选模式）
  if (!mode) {
    return (
      <div className="screen">
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ width: 60 }} />
          <span className="kicker">One Night Ultimate Werewolf</span>
          {state.user ? (
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={api.goProfile}>
              {state.user.avatar || '🦊'} {state.user.nickname}
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={api.goAuth}>
              登录/注册
            </button>
          )}
        </div>

        <div className="col" style={{ gap: 8, marginTop: 16 }}>
          <h1 className="title">一夜终极狼人</h1>
          <p className="subtitle">
            围坐一桌 · 各自手机 · 嘴炮辩论
          </p>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <button className="btn btn-primary btn-block" onClick={() => setMode('create')}>
            🆕 创建房间
          </button>
          <button className="btn btn-block" onClick={() => setMode('join')}>
            🚪 加入房间
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setShowRules((v) => !v)}>
            {showRules ? '收起角色介绍' : '查看角色介绍'}
          </button>
        </div>

        {state.user && (
          <div className="card col" style={{ gap: 4 }}>
            <div className="kicker">已登录</div>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>{state.user.avatar || '🦊'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{state.user.nickname}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{state.user.email}</div>
              </div>
              <button className="btn" style={{ padding: '6px 12px' }} onClick={api.goProfile}>
                我的资料
              </button>
            </div>
          </div>
        )}

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
            玩家数 3-10。{state.user ? '已登录玩家自动记录战绩。' : '登录后会自动记录战绩。'}
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
                <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 创建/加入子表单
  return (
    <div className="screen">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => setMode(null)}>← 返回</button>
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

        {state.user && (
          <div className="text-muted" style={{ fontSize: 12 }}>
            已登录为 <b>{state.user.nickname}</b>，本局战绩将记入你的账号。
          </div>
        )}

        <div className="text-muted" style={{ fontSize: 12 }}>
          {state.socketConnected ? '已连接服务器' : '连接中…'}
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
