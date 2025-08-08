// src/components/Room.js

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import MSG_TYPE from '../constant/constant_msg'
import axios from 'axios';
import { API_PATHS, WS_PATHS } from '../config/api';

const Room = () => {
    const { roomCode } = useParams();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [players, setPlayers] = useState([]);
    const [inviteUserId, setInviteUserId] = useState('');
    const [kickUserId, setKickUserId] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const navigate = useNavigate();
    const socketRef = useRef(null);

    useEffect(() => {
        // 获取房间玩家列表和排行榜
        axios.get(API_PATHS.ROOM_INFO(roomCode)).then(res => {
            setPlayers(res.data.players || []);
        });
        axios.get(API_PATHS.LEADERBOARD).then(res => {
            setLeaderboard(res.data.leaderboard || []);
        });
        // 初始化 WebSocket 连接
        socketRef.current = new WebSocket(WS_PATHS.GAME(roomCode));

        socketRef.current.onopen = () => {
            console.log('Connected to the WebSocket server');
        };

        socketRef.current.onmessage = (event) => {
            console.log(event.data)
            // const data = JSON.parse(event.data);
            // setMessages((prevMessages) => [...prevMessages, data.message]);
        };

        socketRef.current.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };

        socketRef.current.onclose = () => {
            console.log('Disconnected from the WebSocket server');
            // alert('Connection closed');
            // navigate('/');
        };

        return () => {
            // 组件卸载时关闭 WebSocket 连接
            socketRef.current.close();
        };
    }, [roomCode]);

    const sendMessage = () => {
        if (socketRef.current.readyState === WebSocket.OPEN) {
            let data = {
                'type': MSG_TYPE.message,
                "message": message,
            }
            socketRef.current.send(JSON.stringify(data));
            setMessage('');
        }
    };

    const handleInvite = () => {
        axios.post(API_PATHS.INVITE_PLAYER, { room_id: roomCode, user_id: inviteUserId })
            .then(res => alert(res.data.message))
            .catch(err => alert('邀请失败'));
    };
    const handleKick = () => {
        axios.post(API_PATHS.KICK_PLAYER, { room_id: roomCode, user_id: kickUserId })
            .then(res => alert(res.data.message))
            .catch(err => alert('踢人失败'));
    };
    
    const startGame = () => {
        // 跳转到游戏页面
        navigate(`/game/${roomCode}`);
    };

    return (
        <div>
            <h2>房间: {roomCode}</h2>
            <div>
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="输入消息" />
                <button onClick={sendMessage}>发送</button>
            </div>
            <div>
                <h3>房间成员</h3>
                <ul>
                    {players.map((p, idx) => (<li key={idx}>{p}</li>))}
                </ul>
                <input type="text" value={inviteUserId} onChange={e=>setInviteUserId(e.target.value)} placeholder="邀请用户ID" />
                <button onClick={handleInvite}>邀请</button>
                <input type="text" value={kickUserId} onChange={e=>setKickUserId(e.target.value)} placeholder="踢出用户ID" />
                <button onClick={handleKick}>踢人</button>
                <button onClick={startGame} style={{marginTop: '20px', padding: '10px 20px', backgroundColor: '#5cb85c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>开始游戏</button>
            </div>
            <div>
                <h3>排行榜</h3>
                <ul>
                    {leaderboard.map((p, idx) => (<li key={idx}>{p.nickname} - {p.experience}</li>))}
                </ul>
            </div>
            <div>
                <h3>消息列表</h3>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Room;
