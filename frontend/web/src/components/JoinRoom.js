// src/components/JoinRoom.js

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './JoinRoom.css';
import { API_PATHS } from '../config/api';

const JoinRoom = () => {
  const [roomCode, setRoomCode] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  
  // 检查用户是否已登录
  useEffect(() => {
    // 这里应该根据你的认证方式来检查用户是否已登录
    // 例如，检查localStorage中是否有token，或者调用后端API验证登录状态
    const checkLoginStatus = async () => {
      try {
        // 示例：检查localStorage中的token
        const token = localStorage.getItem('token');
        if (token) {
          // 可以向后端验证token有效性
          // const response = await axios.get('/api/verify-token/', {
          //   headers: { Authorization: `Bearer ${token}` }
          // });
          // if (response.data.valid) {
          //   setIsLoggedIn(true);
          //   setUsername(response.data.username);
          // }
          
          // 简化版：假设有token就是已登录
          setIsLoggedIn(true);
          setUsername(localStorage.getItem('username') || '用户');
        }
      } catch (error) {
        console.error('验证登录状态失败:', error);
      }
    };
    
    checkLoginStatus();
  }, []);

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    // 假设你的后端有一个 API 用于验证房间号
    try {
      const response = await axios.post(API_PATHS.JOIN_ROOM, { room_code: roomCode });
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

  const handleLogout = () => {
    // 清除登录信息
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
  };

  return (
    <div className="join-room-container">
      <div className="header">
        <h1>一夜狼人游戏</h1>
        <div className="user-section">
          {isLoggedIn ? (
            <div className="user-info">
              <span>欢迎, {username}</span>
              <button onClick={handleLogout} className="logout-btn">退出登录</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="auth-link">登录</Link>
              <Link to="/register" className="auth-link">注册</Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="main-content">
        <div className="join-section">
          <h2>加入房间</h2>
          <form onSubmit={handleJoinRoom} className="join-form">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="输入房间号"
              className="room-code-input"
            />
            <button type="submit" className="join-btn">加入</button>
          </form>
        </div>

        <div className="create-section">
          <h2>创建房间</h2>
          <button onClick={handleCreateRoom} className="create-btn">创建房间</button>
        </div>
      </div>
      
      <div className="footer">
        <p>© 2023 一夜狼人游戏 - 所有权利保留</p>
      </div>
    </div>
  );
};

export default JoinRoom;
