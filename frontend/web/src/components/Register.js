// Register.js

import React, { useState } from 'react';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { API_PATHS } from '../config/api';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [avatar, setAvatar] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        
        if (!username || !password) {
            setError('用户名和密码不能为空');
            return;
        }
        
        try {
            const response = await axios.post(API_PATHS.REGISTER, { 
                username, 
                password,
                nickname: nickname || username,
                avatar
            });
            setSuccess('注册成功！正在跳转到登录页面...');
            console.log(response.data);
            // 注册成功后延迟跳转到登录页面
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            setError(error.response?.data?.error || '注册失败');
            console.error(error.response?.data);
        }
    };
    
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // Google登录实际上会通过django-allauth自动处理注册流程
            // 这里我们直接调用google_login接口
            const response = await axios.post(API_PATHS.GOOGLE_LOGIN, {
                token: credentialResponse.credential,
                googleId: credentialResponse.googleId,
            });
            
            if (response.data.success) {
                // 登录成功，跳转到首页
                navigate('/');
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

    return (
        <div className="register-container">
            <h2>注册</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleSubmit} className="register-form">
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
                <div className="form-group">
                    <label>昵称 (可选)</label>
                    <input 
                        type="text" 
                        placeholder="输入昵称" 
                        value={nickname} 
                        onChange={e => setNickname(e.target.value)} 
                    />
                </div>
                <button type="submit" className="register-button">注册</button>
            </form>
            
            <div className="social-login">
                <p>或使用以下方式注册/登录</p>
                <div className="google-login-button">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleFailure}
                        useOneTap
                    />
                </div>
            </div>
            
            <p className="login-link">
                已有账号？ <a href="/login">登录</a>
            </p>
        </div>
    );
};

export default Register;
