import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleConnection } from './src/socket.js';

const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = corsOrigins.length > 0 ? { origin: corsOrigins } : { origin: '*' };

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('One Night Ultimate Werewolf — Socket.IO server running.');
});
app.get('/health', (_req, res) => {
  res.json({ ok: true, t: Date.now() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 30000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  handleConnection(io, socket);
});

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`[wolf] listening on :${PORT}, cors=${JSON.stringify(corsOptions.origin)}`);
});
