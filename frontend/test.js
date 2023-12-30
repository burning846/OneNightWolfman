var socket = new WebSocket("ws://127.0.0.1:8000/ws/game/1/");
socket.onmessage = function(event) {
    console.log("Received:", event.data);
};
socket.onopen = function(event) {
    socket.send("Hello, server!");
};