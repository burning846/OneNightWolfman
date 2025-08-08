import './App.css';
import './styles/Game.css';
import './components/Auth.css';
import Register from './components/Register';
import Login from './components/Login';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { API_URL } from './config/api';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import JoinRoom from './components/JoinRoom';
import Room from './components/Room';
import CreateRoom from './components/CreateRoom';
import ConfigureRoom from './components/ConfigureRoom';
import Game from './components/Game';

// 使用环境变量或配置文件中的Google客户端ID
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

// 在开发环境中显示提示信息
if (process.env.NODE_ENV === 'development' && GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
  console.warn('警告: 您需要在.env文件中设置REACT_APP_GOOGLE_CLIENT_ID环境变量');
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/room/:roomCode" element={<Room />} />
          <Route path="/game/:roomCode" element={<Game />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/configure-room" element={<ConfigureRoom />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
