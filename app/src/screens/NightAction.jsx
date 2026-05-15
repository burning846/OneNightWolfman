import { useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { ROLES } from '../game/roles.js';
import { roleEmoji, roleName } from '../game/engine.js';

export default function NightAction() {
  const { state, api } = useGame();

  if (state.pendingReveal) {
    return <RevealPanel reveal={state.pendingReveal} onDone={api.nightDone} />;
  }
  if (state.nightPrompt) {
    return <PromptPanel />;
  }
  if (state.nightStep) {
    return (
      <div className="card col text-center" style={{ gap: 8 }}>
        <div style={{ fontSize: 28 }}>⏳</div>
        <div className="h2" style={{ margin: 0 }}>等待 {roleName(state.nightStep.role)} 行动…</div>
        <div className="text-muted" style={{ fontSize: 12 }}>请勿提示其他玩家</div>
      </div>
    );
  }
  return null;
}

function RevealPanel({ reveal, onDone }) {
  return (
    <div className="card col" style={{ gap: 12 }}>
      <div className="kicker">仅你可见</div>
      <RevealContent reveal={reveal} />
      <button className="btn btn-primary btn-block" onClick={onDone}>
        ✓ 我已知晓
      </button>
    </div>
  );
}

function RevealContent({ reveal }) {
  switch (reveal.kind) {
    case 'doppelganger_reveal':
      return (
        <div className="col text-center" style={{ gap: 8 }}>
          <div className="kicker">你复制了 {reveal.targetNickname} 的角色</div>
          <div style={{ fontSize: 48 }}>{roleEmoji(reveal.copiedRole)}</div>
          <div className="h2" style={{ margin: 0 }}>{roleName(reveal.copiedRole)}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            接下来你将按这个角色行动 + 结算。
          </div>
        </div>
      );

    case 'werewolf_see':
      return (
        <div className="col" style={{ gap: 8 }}>
          <div className="h2" style={{ margin: 0 }}>🐺 你是狼人</div>
          {reveal.others.length === 0 ? (
            <div className="text-muted">你是唯一的狼人，可以查看一张中央底牌。</div>
          ) : (
            <>
              <div className="text-muted" style={{ fontSize: 13 }}>其他狼人：</div>
              <div className="col" style={{ gap: 6 }}>
                {reveal.others.map((o) => (
                  <div key={o.idx} className="list-item">
                    <span>{o.nickname}</span>
                    <span className="text-muted">#{o.idx + 1}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );

    case 'lone_wolf_peek_reveal':
      return (
        <div className="col text-center" style={{ gap: 8 }}>
          <div className="kicker">中央底牌 {reveal.centerIdx + 1}</div>
          <div style={{ fontSize: 48 }}>{roleEmoji(reveal.role)}</div>
          <div className="h2" style={{ margin: 0 }}>{roleName(reveal.role)}</div>
        </div>
      );

    case 'minion_see':
      return (
        <div className="col" style={{ gap: 8 }}>
          <div className="h2" style={{ margin: 0 }}>😈 你是爪牙</div>
          {reveal.werewolves.length === 0 ? (
            <div className="text-muted">本局没有狼人！</div>
          ) : (
            <>
              <div className="text-muted" style={{ fontSize: 13 }}>狼人是：</div>
              <div className="col" style={{ gap: 6 }}>
                {reveal.werewolves.map((o) => (
                  <div key={o.idx} className="list-item">
                    <span>{o.nickname}</span>
                    <span className="text-muted">#{o.idx + 1}</span>
                  </div>
                ))}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                提示：狼人不知道你是爪牙。
              </div>
            </>
          )}
        </div>
      );

    case 'mason_see':
      return (
        <div className="col" style={{ gap: 8 }}>
          <div className="h2" style={{ margin: 0 }}>🛡️ 你是守夜人</div>
          {reveal.others.length === 0 ? (
            <div className="text-muted">本局只有你一名守夜人。</div>
          ) : (
            <>
              <div className="text-muted" style={{ fontSize: 13 }}>其他守夜人：</div>
              <div className="col" style={{ gap: 6 }}>
                {reveal.others.map((o) => (
                  <div key={o.idx} className="list-item">
                    <span>{o.nickname}</span>
                    <span className="text-muted">#{o.idx + 1}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );

    case 'seer_reveal':
      return (
        <div className="col" style={{ gap: 10 }}>
          <div className="h2" style={{ margin: 0 }}>🔮 预言结果</div>
          <div className="col" style={{ gap: 6 }}>
            {reveal.results.map((r, i) => (
              <div key={i} className="list-item">
                <span>
                  {r.idx !== undefined
                    ? `玩家 #${r.idx + 1}`
                    : `中央底牌 ${r.centerIdx + 1}`}
                </span>
                <span>{roleEmoji(r.role)} {roleName(r.role)}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'robber_reveal':
      return (
        <div className="col text-center" style={{ gap: 8 }}>
          <div className="kicker">你从 {reveal.targetNickname} 偷来的身份</div>
          <div style={{ fontSize: 48 }}>{roleEmoji(reveal.newRole)}</div>
          <div className="h2" style={{ margin: 0 }}>{roleName(reveal.newRole)}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            你现在以新身份的阵营结算。
          </div>
        </div>
      );

    case 'troublemaker_done':
      return (
        <div className="col text-center" style={{ gap: 8 }}>
          <div className="h2" style={{ margin: 0 }}>👹 已互换</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            {reveal.targetNicknames.join('  ⇄  ')} 的牌已互换
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>（你看不到他们的牌内容）</div>
        </div>
      );

    case 'drunk_done':
      return (
        <div className="col text-center" style={{ gap: 8 }}>
          <div className="h2" style={{ margin: 0 }}>🍺 已交换</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            你和中央底牌 {reveal.centerIdx + 1} 互换了
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>（你看不到新身份）</div>
        </div>
      );

    case 'insomniac_see':
      return (
        <div className="col text-center" style={{ gap: 8 }}>
          <div className="kicker">你的最终身份</div>
          <div style={{ fontSize: 48 }}>{roleEmoji(reveal.currentRole)}</div>
          <div className="h2" style={{ margin: 0 }}>{roleName(reveal.currentRole)}</div>
        </div>
      );

    default:
      return <pre>{JSON.stringify(reveal, null, 2)}</pre>;
  }
}

function PromptPanel() {
  const { state, api } = useGame();
  const prompt = state.nightPrompt;
  const room = state.roomState;
  const myIdx = state.myPlayerIdx;

  switch (prompt.kind) {
    case 'doppelganger_choose':
      return (
        <PlayerChoice
          title="👻 化身幽灵 - 复制角色"
          desc="选一名其他玩家，你将变成他/她的角色（并按那个角色之后行动）"
          submitLabel="复制"
          count={1}
          excludeSelf
          onSubmit={(targets) => api.nightAction({ target: targets[0] })}
          players={room.players}
          myIdx={myIdx}
        />
      );

    case 'lone_wolf_peek':
      return (
        <CenterCardChoice
          title="🐺 独狼查看中央底牌"
          desc="选择一张中央底牌查看"
          submitLabel="查看"
          onSubmit={(centerIdx) => api.nightAction({ centerIdx })}
        />
      );

    case 'drunk_choose':
      return (
        <CenterCardChoice
          title="🍺 酒鬼交换"
          desc="选择一张中央底牌与自己交换（看不到牌面）"
          submitLabel="交换"
          onSubmit={(centerIdx) => api.nightAction({ centerIdx })}
        />
      );

    case 'robber_choose':
      return (
        <PlayerChoice
          title="🦹 强盗交换"
          desc="选择一名其他玩家与你交换身份"
          submitLabel="交换"
          count={1}
          excludeSelf
          onSubmit={(targets) => api.nightAction({ target: targets[0] })}
          players={room.players}
          myIdx={myIdx}
        />
      );

    case 'troublemaker_choose':
      return (
        <PlayerChoice
          title="👹 捣蛋鬼互换"
          desc="选择两名其他玩家互换他们的牌"
          submitLabel="互换"
          count={2}
          excludeSelf
          onSubmit={(targets) => api.nightAction({ targets })}
          players={room.players}
          myIdx={myIdx}
        />
      );

    case 'seer_choose':
      return <SeerChoice />;

    default:
      return null;
  }
}

function CenterCardChoice({ title, desc, submitLabel, onSubmit }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="card col" style={{ gap: 12 }}>
      <div className="kicker">仅你可见</div>
      <h2 className="h2">{title}</h2>
      <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{desc}</p>
      <div className="grid grid-cols-3">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            className={`center-card ${selected === i ? 'selected' : ''}`}
            onClick={() => setSelected(i)}
          >
            <div className="col" style={{ gap: 4, alignItems: 'center' }}>
              <div className="label">中央 {i + 1}</div>
              <div style={{ fontSize: 28 }}>?</div>
            </div>
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary btn-block"
        disabled={selected === null}
        onClick={() => onSubmit(selected)}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function PlayerChoice({ title, desc, submitLabel, count, excludeSelf, onSubmit, players, myIdx }) {
  const [picked, setPicked] = useState([]);

  const toggle = (idx) => {
    if (excludeSelf && idx === myIdx) return;
    setPicked((p) => {
      if (p.includes(idx)) return p.filter((x) => x !== idx);
      if (p.length >= count) return [...p.slice(1), idx];
      return [...p, idx];
    });
  };

  return (
    <div className="card col" style={{ gap: 12 }}>
      <div className="kicker">仅你可见</div>
      <h2 className="h2">{title}</h2>
      <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{desc}</p>
      <div className="grid grid-cols-3">
        {players.map((p, idx) => {
          const disabled = excludeSelf && idx === myIdx;
          const selected = picked.includes(idx);
          return (
            <button
              key={p.id}
              className={`player-button ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              disabled={disabled}
              onClick={() => toggle(idx)}
            >
              <div>{p.nickname}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>#{idx + 1}{idx === myIdx ? ' · 我' : ''}</div>
            </button>
          );
        })}
      </div>
      <button
        className="btn btn-primary btn-block"
        disabled={picked.length !== count}
        onClick={() => onSubmit(picked)}
      >
        {submitLabel}（已选 {picked.length}/{count}）
      </button>
    </div>
  );
}

function SeerChoice() {
  const { state, api } = useGame();
  const room = state.roomState;
  const myIdx = state.myPlayerIdx;
  const [mode, setMode] = useState('player');
  const [picked, setPicked] = useState([]);

  const toggle = (idx) => {
    const max = mode === 'player' ? 1 : 2;
    if (mode === 'player' && idx === myIdx) return;
    setPicked((p) => {
      if (p.includes(idx)) return p.filter((x) => x !== idx);
      if (p.length >= max) return [...p.slice(1), idx];
      return [...p, idx];
    });
  };

  const submit = () => {
    const required = mode === 'player' ? 1 : 2;
    if (picked.length !== required) return;
    if (mode === 'player') {
      api.nightAction({ type: 'player', target: picked[0] });
    } else {
      api.nightAction({ type: 'center', targets: picked });
    }
  };

  return (
    <div className="card col" style={{ gap: 12 }}>
      <div className="kicker">仅你可见</div>
      <h2 className="h2">🔮 预言家行动</h2>
      <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
        查看一名玩家的牌，<b>或</b> 查看任意两张中央底牌。
      </p>
      <div className="grid grid-cols-2">
        <button
          className={`btn ${mode === 'player' ? 'btn-primary' : ''}`}
          onClick={() => { setMode('player'); setPicked([]); }}
        >查看玩家牌</button>
        <button
          className={`btn ${mode === 'center' ? 'btn-primary' : ''}`}
          onClick={() => { setMode('center'); setPicked([]); }}
        >查看 2 张底牌</button>
      </div>

      {mode === 'player' ? (
        <div className="grid grid-cols-3">
          {room.players.map((p, idx) => {
            const disabled = idx === myIdx;
            const selected = picked.includes(idx);
            return (
              <button
                key={p.id}
                className={`player-button ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                disabled={disabled}
                onClick={() => toggle(idx)}
              >
                <div>{p.nickname}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>#{idx + 1}{idx === myIdx ? ' · 我' : ''}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              className={`center-card ${picked.includes(i) ? 'selected' : ''}`}
              onClick={() => toggle(i)}
            >
              <div className="col" style={{ gap: 4, alignItems: 'center' }}>
                <div className="label">中央 {i + 1}</div>
                <div style={{ fontSize: 28 }}>?</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        disabled={picked.length !== (mode === 'player' ? 1 : 2)}
        onClick={submit}
      >
        查看
      </button>
    </div>
  );
}
