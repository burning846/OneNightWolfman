import { useEffect } from 'react';
import { GameProvider, useGame } from './GameContext.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import NightScreen from './screens/NightScreen.jsx';
import DayScreen from './screens/DayScreen.jsx';
import VoteScreen from './screens/VoteScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';

function Router() {
  const { state, api } = useGame();

  useEffect(() => {
    if (!state.errorMessage) return;
    const t = setTimeout(() => api.clearError(), 3000);
    return () => clearTimeout(t);
  }, [state.errorMessage, api]);

  const phase = state.roomState?.phase;

  let screen = null;
  if (state.status === 'connecting' || (state.status === 'in_room' && !state.roomState)) {
    screen = (
      <div className="screen">
        <div className="banner col" style={{ marginTop: 32 }}>
          <div style={{ fontSize: 32 }}>⏳</div>
          <div className="h2" style={{ margin: 0 }}>连接中…</div>
          <div className="text-muted" style={{ fontSize: 13 }}>正在恢复你的房间</div>
        </div>
      </div>
    );
  } else if (state.status === 'auth') {
    screen = <AuthScreen />;
  } else if (state.status === 'profile') {
    screen = <ProfileScreen />;
  } else if (state.status === 'home' || !state.roomState) {
    screen = <HomeScreen />;
  } else if (phase === 'lobby') {
    screen = <LobbyScreen />;
  } else if (phase === 'night') {
    screen = <NightScreen />;
  } else if (phase === 'day') {
    screen = <DayScreen />;
  } else if (phase === 'vote') {
    screen = <VoteScreen />;
  } else if (phase === 'result') {
    screen = <ResultScreen />;
  } else {
    screen = <HomeScreen />;
  }

  return (
    <div className="app">
      {!state.socketConnected && state.status === 'in_room' && (
        <div className="banner banner-danger" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14 }}>连接已断开，正在尝试重连…</div>
        </div>
      )}
      {state.errorMessage && (
        <div className="banner banner-danger" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14 }}>{state.errorMessage}</div>
        </div>
      )}
      {screen}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}
