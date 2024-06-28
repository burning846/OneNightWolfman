// src/components/Room.js

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import MSG_TYPE from '../constant/constant_msg'

const Room = () => {
    const { roomCode } = useParams();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const socketRef = useRef(null);

    useEffect(() => {
        // 初始化 WebSocket 连接
        socketRef.current = new WebSocket(`ws://wolf.burning233.top/ws/game/${roomCode}/`);

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

    return (
        <div>
            <h2>房间: {roomCode}</h2>
            <div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="输入消息"
                />
                <button onClick={sendMessage}>发送</button>
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
