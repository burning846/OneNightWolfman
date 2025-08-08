// Login.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { API_PATHS } from '../config/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showUsernameForm, setShowUsernameForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            const response = await axios.post(API_PATHS.LOGIN, { username, password });
            console.log(response.data);
            // 登录成功后重定向到首页或其他页面
            navigate('/');
        } catch (error) {
            setError(error.response?.data?.error || '登录失败，请检查用户名和密码');
            console.error(error.response?.data);
        }
    };
    
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // 发送Google返回的ID令牌到后端
            const response = await axios.post(API_PATHS.GOOGLE_LOGIN, {
                token: credentialResponse.credential,
                googleId: credentialResponse.googleId,
                // 可能还需要其他信息，如头像URL等
            });
            
            if (response.data.success) {
                // 登录成功
                console.log('Google登录成功:', response.data);
                // 如果用户没有设置用户名，显示设置用户名的表单
                if (!response.data.user.username || response.data.user.username === response.data.user.email) {
                    setShowUsernameForm(true);
                } else {
                    // 有用户名，直接跳转
                    navigate('/');
                }
            } else if (response.data.redirect) {
                // 需要完成OAuth流程
                window.location.href = response.data.redirect;
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Google登录失败');
            console.error('Google登录错误:', error.response?.data);
        }
    };
    
    const handleGoogleFailure = (error) => {
        setError('Google登录失败: ' + error.message);
        console.error('Google登录失败:', error);
    };
    
    const handleSetUsername = async (e) => {
        e.preventDefault();
        if (!newUsername.trim()) {
            setError('用户名不能为空');
            return;
        }
        
        try {
            const response = await axios.post(API_PATHS.SET_USERNAME, {
                username: newUsername
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    // 确保包含认证令牌
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // 如果使用JWT
                }
            });
            
            if (response.data.success) {
                // 用户名设置成功，跳转到首页
                navigate('/');
            }
        } catch (error) {
            setError(error.response?.data?.message || '设置用户名失败');
            console.error('设置用户名错误:', error.response?.data);
        }
    };

    return (
        <div className="login-container">
            <h2>登录</h2>
            {error && <div className="error-message">{error}</div>}
            
            {showUsernameForm ? (
                <div className="username-form">
                    <h3>设置用户名</h3>
                    <p>请为您的账号设置一个用户名</p>
                    <form onSubmit={handleSetUsername}>
                        <input 
                            type="text" 
                            placeholder="输入用户名" 
                            value={newUsername} 
                            onChange={e => setNewUsername(e.target.value)} 
                        />
                        <button type="submit">确认</button>
                    </form>
                </div>
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>用户名</label>
                            <input 
                                type="text" 
                                placeholder="输入用户名" 
                                value={username} 
                                onChange={e => setUsername(e.target.value)} 
                            />
                        </div>
                        <div className="form-group">
                            <label>密码</label>
                            <input 
                                type="password" 
                                placeholder="输入密码" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                            />
                        </div>
                        <button type="submit" className="login-button">登录</button>
                    </form>
                    
                    <div className="social-login">
                        <p>或使用以下方式登录</p>
                        <div className="google-login-button">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleFailure}
                                useOneTap
                            />
                        </div>
                    </div>
                    
                    <p className="register-link">
                        还没有账号？ <a href="/register">注册</a>
                    </p>
                </>
            )}
        </div>
    );
};

export default Login;
