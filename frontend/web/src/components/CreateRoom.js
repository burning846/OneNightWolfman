import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_PATHS } from '../config/api';

const CreateRoom = () => {
  const [config, setConfig] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post(API_PATHS.CREATE_ROOM, { config });
      const roomId = response.data.room_id;
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('创建房间失败');
    }
  };

  return (
    <div>
      <h1>Create Room</h1>
      <textarea
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        placeholder="Enter room configuration as JSON"
      />
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
};

export default CreateRoom;
