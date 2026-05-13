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
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`[wolf] listening on ${HOST}:${PORT}, cors=${JSON.stringify(corsOptions.origin)}`);
});

// 兜底：把没捕获的异常打出来，便于云平台看清楚
process.on('uncaughtException', (e) => {
  console.error('[wolf] uncaughtException', e);
});
process.on('unhandledRejection', (e) => {
  console.error('[wolf] unhandledRejection', e);
});
