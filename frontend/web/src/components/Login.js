// Register.js

import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post('/api/login/', { username, password });
            console.log(response.data);
            
        } catch (error) {
            console.error(error.response.data);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="submit">Login</button>
            </form>
            <p>
                Don't have an account? <a>Register</a>
            </p>
        </div>
    );
};

export default Login;
