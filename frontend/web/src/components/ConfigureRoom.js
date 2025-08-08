import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ConfigureRoom = () => {
  const [interval, setInterval] = useState(15);
  const [numPlayers, setNumPlayers] = useState(8);
  const [roles, setRoles] = useState({
    doppelganger: 0,
    werewolf: 2,
    minion: 0,
    mason: 0,
    seer: 0,
    robber: 0,
    troublemaker: 0,
    drunk: 0,
    insomniac: 0,
    hunter: 0,
    tanner: 0,
  });
  const navigate = useNavigate();

  const handleRoleChange = (role, value) => {
    setRoles({
      ...roles,
      [role]: value,
    });
  };

  const handleCreateRoom = () => {
    const config = {
      interval,
      num_players: numPlayers,
      roles,
    };

    fetch('/api/create_room/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
    .then(response => response.json())
    .then(data => {
      const roomId = data.room_id;
      navigate(`/room/${roomId}`);
    })
    .catch(error => console.error('Error:', error));
  };

  return (
    <div>
      <h1>Configure Room</h1>
      <label>
        Interval:
        <input
          type="number"
          value={interval}
          onChange={(e) => setInterval(parseInt(e.target.value, 10))}
        />
      </label>
      <br />
      <label>
        Number of Players:
        <input
          type="number"
          value={numPlayers}
          onChange={(e) => setNumPlayers(parseInt(e.target.value, 10))}
        />
      </label>
      <br />
      <h2>Roles</h2>
      {Object.keys(roles).map((role) => (
        <div key={role}>
          <label>
            {role.charAt(0).toUpperCase() + role.slice(1)}:
            {role === 'werewolf' || role === 'villager' ? (
              <input
                type="number"
                value={roles[role]}
                onChange={(e) => handleRoleChange(role, parseInt(e.target.value, 10))}
              />
            ) : (
              <input
                type="checkbox"
                checked={roles[role] > 0}
                onChange={(e) => handleRoleChange(role, e.target.checked ? 1 : 0)}
              />
            )}
          </label>
          <br />
        </div>
      ))}
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
};

export default ConfigureRoom;
