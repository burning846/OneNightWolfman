// src/components/Game.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MSG_TYPE from '../constant/constant_msg';
import axios from 'axios';
import { API_PATHS, WS_PATHS } from '../config/api';

const Game = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    
    // 游戏状态
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended
    const [currentTurn, setCurrentTurn] = useState('');
    const [players, setPlayers] = useState([]);
    const [myRole, setMyRole] = useState(null);
    const [myOriginalRole, setMyOriginalRole] = useState(null);
    const [centerCards, setCenterCards] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [voteTarget, setVoteTarget] = useState(null);
    const [gameResult, setGameResult] = useState(null);
    const [messages, setMessages] = useState([]);
    const [timer, setTimer] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    
    // 初始化WebSocket连接
    useEffect(() => {
        socketRef.current = new WebSocket(WS_PATHS.GAME(roomCode));
        
        socketRef.current.onopen = () => {
            console.log('Connected to the WebSocket server');
            // 获取房间玩家列表
            axios.get(API_PATHS.ROOM_INFO(roomCode)).then(res => {
                setPlayers(res.data.players || []);
            });
        };
        
        socketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            
            handleGameMessage(data);
        };
        
        socketRef.current.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };
        
        socketRef.current.onclose = () => {
            console.log('Disconnected from the WebSocket server');
        };
        
        return () => {
            socketRef.current.close();
        };
    }, [roomCode]);
    
    // 处理游戏消息
    const handleGameMessage = (data) => {
        // 添加到消息列表
        setMessages(prev => [...prev, data]);
        
        switch (data.type) {
            case MSG_TYPE.GAME_START:
                setGameStatus('playing');
                if (data.roles) {
                    // 设置初始角色
                    const myPlayerIndex = Object.keys(data.roles).find(
                        idx => data.roles[idx].player === localStorage.getItem('username')
                    );
                    if (myPlayerIndex) {
                        setMyRole(data.roles[myPlayerIndex].role);
                        setMyOriginalRole(data.roles[myPlayerIndex].role);
                    }
                }
                break;
                
            case MSG_TYPE.DOPPELGANGER_TURN:
            case MSG_TYPE.WEREWOLF_TURN:
            case MSG_TYPE.MINION_TURN:
            case MSG_TYPE.MASON_TURN:
            case MSG_TYPE.SEER_TURN:
            case MSG_TYPE.ROBBER_TURN:
            case MSG_TYPE.TROUBLEMAKER_TURN:
            case MSG_TYPE.DRUNK_TURN:
            case MSG_TYPE.INSOMNIAC_TURN:
                setCurrentTurn(data.type);
                setTimerActive(true);
                setTimer(30); // 30秒倒计时
                // 如果消息包含角色信息，更新角色
                if (data.roles) {
                    updateRoleInfo(data.roles);
                }
                break;
                
            case MSG_TYPE.DOPPELGANGER_ACTION_TURN:
                // 处理替罪羊行动结果
                if (data.message === 'SUCCESS' && data.data && data.data.roles) {
                    updateRoleInfo(data.data.roles);
                }
                break;
                
            case MSG_TYPE.VOTE_STAGE:
                setCurrentTurn('vote');
                setTimerActive(true);
                setTimer(60); // 60秒投票时间
                break;
                
            case MSG_TYPE.GAME_END:
                setGameStatus('ended');
                setTimerActive(false);
                setGameResult(data.result);
                // 更新经验值
                if (data.experience) {
                    // 显示经验值变化
                }
                break;
                
            case MSG_TYPE.NEXT_STAGE:
                // 清除选择
                setSelectedPlayers([]);
                setSelectedCards([]);
                break;
                
            default:
                // 处理其他消息类型
                break;
        }
    };
    
    // 更新角色信息
    const updateRoleInfo = (roles) => {
        Object.keys(roles).forEach(idx => {
            if (roles[idx].player === localStorage.getItem('username')) {
                setMyRole(roles[idx].role);
            } else if (roles[idx].player === 'public') {
                // 更新中央牌信息
                const updatedCenterCards = [...centerCards];
                updatedCenterCards[parseInt(idx) - players.length] = roles[idx].role;
                setCenterCards(updatedCenterCards);
            }
        });
    };
    
    // 发送游戏行动
    const sendGameAction = (action) => {
        if (socketRef.current.readyState === WebSocket.OPEN) {
            const data = {
                type: MSG_TYPE.GAME_ACTION,
                action: action
            };
            socketRef.current.send(JSON.stringify(data));
        }
    };
    
    // 处理玩家选择
    const handlePlayerSelect = (playerIndex) => {
        // 根据不同角色和回合，限制可选择的玩家数量
        let maxSelections = 1;
        if (currentTurn === MSG_TYPE.TROUBLEMAKER_TURN) maxSelections = 2;
        
        if (selectedPlayers.includes(playerIndex)) {
            setSelectedPlayers(selectedPlayers.filter(idx => idx !== playerIndex));
        } else if (selectedPlayers.length < maxSelections) {
            setSelectedPlayers([...selectedPlayers, playerIndex]);
        }
    };
    
    // 处理中央牌选择
    const handleCardSelect = (cardIndex) => {
        const publicIndex = players.length + cardIndex;
        if (selectedCards.includes(publicIndex)) {
            setSelectedCards(selectedCards.filter(idx => idx !== publicIndex));
        } else if (currentTurn === MSG_TYPE.SEER_TURN && selectedCards.length < 2) {
            setSelectedCards([...selectedCards, publicIndex]);
        } else if (currentTurn === MSG_TYPE.DRUNK_TURN && selectedCards.length < 1) {
            setSelectedCards([...selectedCards, publicIndex]);
        }
    };
    
    // 提交当前回合行动
    const submitAction = () => {
        let action = {
            player_index: players.findIndex(p => p === localStorage.getItem('username')),
            target: []
        };
        
        switch (currentTurn) {
            case MSG_TYPE.DOPPELGANGER_TURN:
                action.target = selectedPlayers;
                break;
                
            case MSG_TYPE.WEREWOLF_TURN:
                // 如果是单狼，可以查看中央牌
                action.target = selectedCards;
                break;
                
            case MSG_TYPE.SEER_TURN:
                // 预言家可以查看一名玩家或两张中央牌
                action.target = selectedPlayers.length > 0 ? selectedPlayers : selectedCards;
                break;
                
            case MSG_TYPE.ROBBER_TURN:
                // 强盗选择一名玩家交换角色
                action.target = selectedPlayers;
                break;
                
            case MSG_TYPE.TROUBLEMAKER_TURN:
                // 捣蛋鬼选择两名玩家交换角色
                action.target = selectedPlayers;
                break;
                
            case MSG_TYPE.DRUNK_TURN:
                // 酒鬼选择一张中央牌交换
                action.target = selectedCards;
                break;
                
            case MSG_TYPE.VOTE_STAGE:
                // 投票阶段
                action.target = [voteTarget];
                break;
                
            default:
                // 其他角色可能不需要行动
                break;
        }
        
        sendGameAction(action);
        // 清除选择
        setSelectedPlayers([]);
        setSelectedCards([]);
    };
    
    // 倒计时效果
    useEffect(() => {
        let interval = null;
        if (timerActive && timer > 0) {
            interval = setInterval(() => {
                setTimer(timer => timer - 1);
            }, 1000);
        } else if (timer === 0 && timerActive) {
            setTimerActive(false);
            // 时间到，自动提交当前选择
            submitAction();
        }
        return () => clearInterval(interval);
    }, [timerActive, timer]);
    
    // 开始游戏
    const startGame = () => {
        if (socketRef.current.readyState === WebSocket.OPEN) {
            const data = {
                type: MSG_TYPE.GAME_START
            };
            socketRef.current.send(JSON.stringify(data));
        }
    };
    
    // 渲染玩家列表
    const renderPlayers = () => {
        return players.map((player, index) => (
            <div 
                key={index} 
                className={`player ${selectedPlayers.includes(index) ? 'selected' : ''}`}
                onClick={() => handlePlayerSelect(index)}
            >
                {player}
                {gameStatus === 'ended' && gameResult && (
                    <div className="player-role">
                        最终角色: {gameResult.final_roles[index]}
                    </div>
                )}
            </div>
        ));
    };
    
    // 渲染中央牌
    const renderCenterCards = () => {
        return Array(3).fill(null).map((_, index) => {
            const publicIndex = players.length + index;
            return (
                <div 
                    key={index} 
                    className={`center-card ${selectedCards.includes(publicIndex) ? 'selected' : ''}`}
                    onClick={() => handleCardSelect(index)}
                >
                    {gameStatus === 'ended' ? gameResult.center_cards[index] : '?'}
                </div>
            );
        });
    };
    
    // 渲染当前回合的操作界面
    const renderTurnActions = () => {
        if (gameStatus !== 'playing') return null;
        
        switch (currentTurn) {
            case MSG_TYPE.DOPPELGANGER_TURN:
                return (
                    <div className="turn-actions">
                        <h3>替罪羊回合</h3>
                        <p>选择一名玩家复制其角色</p>
                        {selectedPlayers.length > 0 && (
                            <button onClick={submitAction}>确认选择</button>
                        )}
                    </div>
                );
                
            case MSG_TYPE.WEREWOLF_TURN:
                return (
                    <div className="turn-actions">
                        <h3>狼人回合</h3>
                        <p>如果你是唯一的狼人，可以查看一张中央牌</p>
                        {selectedCards.length > 0 && (
                            <button onClick={submitAction}>确认选择</button>
                        )}
                    </div>
                );
                
            case MSG_TYPE.MINION_TURN:
                return (
                    <div className="turn-actions">
                        <h3>爪牙回合</h3>
                        <p>你将看到所有狼人</p>
                    </div>
                );
                
            case MSG_TYPE.MASON_TURN:
                return (
                    <div className="turn-actions">
                        <h3>守夜人回合</h3>
                        <p>你将看到所有其他守夜人</p>
                    </div>
                );
                
            case MSG_TYPE.SEER_TURN:
                return (
                    <div className="turn-actions">
                        <h3>预言家回合</h3>
                        <p>选择查看一名玩家的角色或两张中央牌</p>
                        {(selectedPlayers.length > 0 || selectedCards.length === 2) && (
                            <button onClick={submitAction}>确认选择</button>
                        )}
                    </div>
                );
                
            case MSG_TYPE.ROBBER_TURN:
                return (
                    <div className="turn-actions">
                        <h3>强盗回合</h3>
                        <p>选择一名玩家交换角色</p>
                        {selectedPlayers.length > 0 && (
                            <button onClick={submitAction}>确认选择</button>
                        )}
                    </div>
                );
                
            case MSG_TYPE.TROUBLEMAKER_TURN:
                return (
                    <div className="turn-actions">
                        <h3>捣蛋鬼回合</h3>
                        <p>选择两名玩家交换角色</p>
                        {selectedPlayers.length === 2 && (
                            <button onClick={submitAction}>确认选择</button>
                        )}
                    </div>
                );
                
            case MSG_TYPE.DRUNK_TURN:
                return (
                    <div className="turn-actions">
                        <h3>酒鬼回合</h3>
                        <p>选择一张中央牌与你交换</p>
                        {selectedCards.length > 0 && (
                            <button onClick={submitAction}>确认选择</button>
                        )}
                    </div>
                );
                
            case MSG_TYPE.INSOMNIAC_TURN:
                return (
                    <div className="turn-actions">
                        <h3>失眠者回合</h3>
                        <p>你将看到你的最终角色</p>
                    </div>
                );
                
            case 'vote':
                return (
                    <div className="turn-actions">
                        <h3>投票阶段</h3>
                        <p>选择一名玩家投票</p>
                        <select 
                            value={voteTarget || ''} 
                            onChange={(e) => setVoteTarget(Number(e.target.value))}
                        >
                            <option value="">选择玩家</option>
                            {players.map((player, index) => (
                                <option key={index} value={index}>{player}</option>
                            ))}
                        </select>
                        {voteTarget !== null && (
                            <button onClick={submitAction}>确认投票</button>
                        )}
                    </div>
                );
                
            default:
                return <div>等待下一回合...</div>;
        }
    };
    
    // 渲染游戏结果
    const renderGameResult = () => {
        if (gameStatus !== 'ended' || !gameResult) return null;
        
        return (
            <div className="game-result">
                <h2>游戏结束</h2>
                <h3>{gameResult.winner === 'werewolf' ? '狼人阵营胜利!' : '村民阵营胜利!'}</h3>
                <div className="final-roles">
                    <h4>最终角色:</h4>
                    {players.map((player, index) => (
                        <div key={index}>
                            {player}: {gameResult.final_roles[index]}
                            {gameResult.voted && gameResult.voted.includes(index) && ' (被投票)'}
                            {gameResult.killed && gameResult.killed.includes(index) && ' (被杀死)'}
                        </div>
                    ))}
                </div>
                <div className="center-cards-result">
                    <h4>中央牌:</h4>
                    {gameResult.center_cards.map((card, index) => (
                        <div key={index}>牌 {index+1}: {card}</div>
                    ))}
                </div>
                {gameResult.experience && (
                    <div className="experience">
                        <h4>获得经验: {gameResult.experience}</h4>
                    </div>
                )}
                <button onClick={() => navigate(`/room/${roomCode}`)}>返回房间</button>
            </div>
        );
    };
    
    return (
        <div className="game-container">
            <h2>房间: {roomCode}</h2>
            
            {gameStatus === 'waiting' && (
                <div className="waiting-room">
                    <h3>等待游戏开始</h3>
                    <button onClick={startGame}>开始游戏</button>
                </div>
            )}
            
            {gameStatus === 'playing' && (
                <div className="game-board">
                    <div className="game-info">
                        <div className="my-role">
                            <h3>我的角色: {myRole}</h3>
                            {myRole !== myOriginalRole && (
                                <p>初始角色: {myOriginalRole}</p>
                            )}
                        </div>
                        <div className="timer">
                            剩余时间: {timer}秒
                        </div>
                    </div>
                    
                    <div className="center-cards">
                        <h3>中央牌</h3>
                        <div className="cards-container">
                            {renderCenterCards()}
                        </div>
                    </div>
                    
                    <div className="players-container">
                        <h3>玩家</h3>
                        {renderPlayers()}
                    </div>
                    
                    {renderTurnActions()}
                </div>
            )}
            
            {renderGameResult()}
            
            <div className="game-log">
                <h3>游戏日志</h3>
                <div className="messages-container">
                    {messages.map((msg, index) => (
                        <div key={index} className="message">
                            {msg.type}: {JSON.stringify(msg.message || msg.data || '')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Game;