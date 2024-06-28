// src/components/JoinRoom.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const JoinRoom = () => {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    // 假设你的后端有一个 API 用于验证房间号
    try {
      const response = await axios.post('/api/join_room/', { room_code: roomCode });
      console.log(response)
      if (response.data.success) {
        // 成功加入房间后，可以重定向到房间页面
        navigate(`/room/${roomCode}`);
      } else {
        alert('房间号无效');
      }
    } catch (error) {
      console.error('加入房间失败:', error);
      alert('加入房间失败');
    }
  };

  return (
    <div>
      <h2>加入房间</h2>
      <form onSubmit={handleJoinRoom}>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="输入房间号"
        />
        <button type="submit">加入</button>
      </form>
    </div>
  );
};

export default JoinRoom;
