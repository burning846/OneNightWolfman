// establish websocket connection
var socket = new WebSocket("ws://127.0.0.1:8000/ws/game/1/");

// oncall functions
socket.onmessage = function(event) {
    console.log("Received:", event.data);
};
socket.onopen = function(event) {
    socket.send('{"type": "connect", "message": "Hello, server!"}');
};

// send messages
socket.send('{"type": "join", "message": {"user_id": "123"}}')

// close connection
socket.close()