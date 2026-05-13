import { useEffect, useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { ROLES } from '../game/roles.js';
import { roleEmoji, roleName } from '../game/engine.js';

const AVATAR_OPTIONS = ['🦊', '🐺', '🦁', '🐯', '🐻', '🐨', '🐼', '🐰', '🐱', '🐶', '🦄', '🐲'];

export default function ProfileScreen() {
  const { state, api } = useGame();
  const [data, setData] = useState(null);   // { user, stats, recent }
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    const res = await api.getProfile();
    setLoading(false);
    if (res?.ok) {
      setData({ user: res.user, stats: res.stats, recent: res.recent });
      setEditNickname(res.user.nickname);
      setEditAvatar(res.user.avatar || '');
    } else {
      setError(res?.error || '加载失败');
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    setError('');
    const res = await api.updateProfile({ nickname: editNickname, avatar: editAvatar });
    if (res?.ok) {
      setData((d) => ({ ...d, user: res.user }));
      setEditing(false);
    } else {
      setError(res?.error || '保存失败');
    }
  };

  const handleLogout = () => {
    if (window.confirm('确定要登出吗？')) {
      api.logout();
      api.goHome();
    }
  };

  if (loading || !data) {
    return (
      <div className="screen">
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={api.goHome}>← 返回</button>
          <span className="kicker">我的资料</span>
          <span style={{ width: 60 }} />
        </div>
        <div className="banner col">
          <div style={{ fontSize: 32 }}>⏳</div>
          <div className="h2" style={{ margin: 0 }}>加载中…</div>
          {error && <div style={{ fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    );
  }

  const { user, stats, recent } = data;
  const winRate = stats.total > 0 ? Math.round(stats.wins / stats.total * 100) : 0;

  return (
    <div className="screen">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={api.goHome}>← 返回</button>
        <span className="kicker">我的资料</span>
        <span style={{ width: 60 }} />
      </div>

      <div className="card col">
        <div className="row" style={{ alignItems: 'center', gap: 16 }}>
          <div style={{
            fontSize: 56, width: 80, height: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-1)', borderRadius: '50%', border: '2px solid var(--border)',
          }}>
            {user.avatar || '🦊'}
          </div>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{user.nickname}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{user.email}</div>
          </div>
        </div>

        {!editing ? (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setEditing(true)}>编辑资料</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleLogout}>登出</button>
          </div>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            <input
              className="input"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value.slice(0, 12))}
              placeholder="昵称"
              maxLength={12}
            />
            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>头像</div>
              <div className="grid grid-cols-3" style={{ gap: 6 }}>
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`player-button ${editAvatar === a ? 'selected' : ''}`}
                    style={{ fontSize: 32, minHeight: 60 }}
                    onClick={() => setEditAvatar(a)}
                  >{a}</button>
                ))}
              </div>
            </div>
            {error && (
              <div className="banner banner-danger">
                <div style={{ fontSize: 13 }}>{error}</div>
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => { setEditing(false); setError(''); }}>取消</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>保存</button>
            </div>
          </div>
        )}
      </div>

      <div className="card col">
        <h2 className="h2">总览</h2>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          <Stat label="总场数" value={stats.total} />
          <Stat label="胜场" value={stats.wins} accent />
          <Stat label="胜率" value={`${winRate}%`} accent={winRate >= 50} />
        </div>
        {stats.byTeam.length > 0 && (
          <div className="col" style={{ gap: 6 }}>
            <div className="kicker">按阵营</div>
            {stats.byTeam.map((t) => (
              <div key={t.team} className="list-item">
                <span>{teamCnLabel(t.team)}</span>
                <span className="text-muted">
                  {t.wins} 胜 / {t.games} 场（
                  {t.games > 0 ? Math.round(t.wins / t.games * 100) : 0}%）
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card col">
        <h2 className="h2">最近 {recent.length} 场</h2>
        {recent.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 13 }}>暂无对局记录</div>
        ) : (
          <div className="col" style={{ gap: 6 }}>
            {recent.map((g) => (
              <div key={g.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <span>{roleEmoji(g.final_role)} {roleName(g.final_role)}</span>
                    {g.initial_role !== g.final_role && (
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        （原：{roleName(g.initial_role)}）
                      </span>
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {g.player_count} 人局 · {formatTime(g.played_at)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`tag ${g.did_win ? 'tag-village' : 'tag-werewolf'}`}>
                    {g.did_win ? '胜利' : '失败'}
                  </span>
                  {g.was_killed && (
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>出局</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: 12, textAlign: 'center' }}>
      <div className="kicker">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--text-1)' }}>
        {value}
      </div>
    </div>
  );
}

function teamCnLabel(t) {
  if (t === 'werewolf') return '狼人阵营';
  if (t === 'tanner') return '皮匠';
  return '村庄阵营';
}

function formatTime(t) {
  try {
    const d = new Date(t);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}
