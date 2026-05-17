import { useEffect, useState } from 'react';
import { useGame } from '../GameContext.jsx';
import { ROLES } from '../game/roles.js';
import { roleEmoji, roleName } from '../game/engine.js';
import NightAction from './NightAction.jsx';

const STEP_DESC = {
  doppelganger_choose: '化身幽灵复制其他玩家角色',
  werewolf_see: '狼人睁眼互相辨认',
  lone_wolf_peek: '独狼查看一张中央底牌',
  minion_see: '爪牙睁眼看狼人',
  mason_see: '守夜人睁眼互相辨认',
  seer_choose: '预言家查看身份',
  robber_choose: '强盗交换身份',
  troublemaker_choose: '捣蛋鬼互换两人身份',
  drunk_choose: '酒鬼与中央底牌交换',
  insomniac_see: '失眠者查看自己最终身份',
};

function StepCountdown({ endsAt }) {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0
  );
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return (
    <div className="kicker" style={{ fontSize: 14, color: 'var(--accent)' }}>
      ⏱ 剩余 {remaining} 秒
    </div>
  );
}

export default function NightScreen() {
  const { state, api } = useGame();
  const room = state.roomState;
  const step = state.nightStep;

  const handleLeave = () => {
    if (window.confirm('游戏进行中退出后无法回到本局，确定要走吗？')) {
      api.leaveRoom();
    }
  };

  return (
    <div className="screen">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleLeave}>× 退出</button>
        <span className="kicker">🌙 夜晚阶段</span>
        {step ? (
          <span className="text-muted" style={{ fontSize: 13 }}>
            {step.stepIndex + 1} / {step.totalSteps}
          </span>
        ) : <span style={{ width: 60 }} />}
      </div>

      <div className="card col text-center" style={{ gap: 10 }}>
        <div className="kicker">你的初始身份</div>
        {state.myRole ? (
          <div className="row" style={{ alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontSize: 32 }}>{roleEmoji(state.myRole)}</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{roleName(state.myRole)}</span>
          </div>
        ) : (
          <div className="text-muted">等待发牌…</div>
        )}
      </div>

      {!step ? (
        <div className="banner col">
          <div style={{ fontSize: 32 }}>💤</div>
          <div className="h2" style={{ margin: 0 }}>大家闭上眼睛</div>
          <div className="text-muted text-center" style={{ fontSize: 13 }}>
            即将开始按角色顺序醒来
          </div>
        </div>
      ) : (
        <div className="card col text-center" style={{ gap: 8 }}>
          <div className="kicker">当前阶段</div>
          <div style={{ fontSize: 40 }}>{ROLES[step.role]?.emoji}</div>
          <div className="h2" style={{ margin: 0 }}>{STEP_DESC[step.kind] || roleName(step.role)}</div>
          <StepCountdown endsAt={state.roomState?.stepEndsAt} />
          <div className="text-muted" style={{ fontSize: 12 }}>
            未行动玩家时间到后由系统随机选择
          </div>
        </div>
      )}

      <NightAction />

      <div className="card col">
        <h2 className="h2">玩家</h2>
        <div className="grid grid-cols-3">
          {room?.players.map((p, idx) => (
            <div key={p.id} className="player-button" style={{ opacity: p.connected ? 1 : 0.5 }}>
              <div style={{ fontWeight: 600 }}>{p.nickname}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                #{idx + 1}{idx === state.myPlayerIdx ? ' · 我' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
