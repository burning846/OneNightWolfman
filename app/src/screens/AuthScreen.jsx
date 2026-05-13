import { useState } from 'react';
import { useGame } from '../GameContext.jsx';

export default function AuthScreen() {
  const { state, api } = useGame();
  const [mode, setMode] = useState('login');  // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    let res;
    if (mode === 'login') {
      res = await api.login(email, password);
    } else {
      res = await api.register(email, password, nickname);
    }
    setSubmitting(false);
    if (res?.ok) {
      api.goHome();
    } else {
      setError(res?.error || '操作失败');
    }
  };

  return (
    <div className="screen">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={api.goHome}>← 返回</button>
        <span className="kicker">{mode === 'login' ? '登录' : '注册'}</span>
        <span style={{ width: 60 }} />
      </div>

      <div className="card col">
        <div className="grid grid-cols-2">
          <button
            className={`btn ${mode === 'login' ? 'btn-primary' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >登录</button>
          <button
            className={`btn ${mode === 'register' ? 'btn-primary' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >注册</button>
        </div>
      </div>

      <form className="card col" onSubmit={submit}>
        <input
          className="input"
          type="email"
          autoComplete="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={64}
        />
        <input
          className="input"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={64}
        />
        {mode === 'register' && (
          <input
            className="input"
            placeholder="昵称（最多 12 个字符）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 12))}
            maxLength={12}
          />
        )}

        {error && (
          <div className="banner banner-danger">
            <div style={{ fontSize: 13 }}>{error}</div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={
            submitting ||
            !state.socketConnected ||
            !email.trim() ||
            !password ||
            (mode === 'register' && !nickname.trim())
          }
        >
          {submitting ? '处理中…' : (mode === 'login' ? '登录' : '创建账号')}
        </button>

        <div className="text-muted text-center" style={{ fontSize: 12 }}>
          {mode === 'login' ? '没有账号？点上面的"注册"' : '已有账号？点上面的"登录"'}
        </div>
      </form>

      <div className="card col">
        <div className="kicker">提示</div>
        <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          登录后会自动记录你每局的角色、是否胜利。
          昵称作为创建/加入房间时的默认显示名（房间里可临时改）。
          未登录也能玩，只是不会留下战绩。
        </div>
      </div>
    </div>
  );
}
