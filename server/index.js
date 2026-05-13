import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleConnection } from './src/socket.js';
import { initDb, isDbReady } from './src/db.js';

const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = corsOrigins.length > 0 ? { origin: corsOrigins } : { origin: '*' };

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('One Night Ultimate Werewolf — Socket.IO server running.');
});
app.get('/health', (_req, res) => {
  res.json({ ok: true, t: Date.now(), db: isDbReady() });
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

async function main() {
  await initDb();  // 即使失败也继续启动，匿名玩法不依赖 DB
  httpServer.listen(PORT, HOST, () => {
    console.log(`[wolf] listening on ${HOST}:${PORT}, cors=${JSON.stringify(corsOptions.origin)}, db=${isDbReady()}`);
  });
}

main().catch(e => {
  console.error('[wolf] startup failed', e);
  process.exit(1);
});

process.on('uncaughtException',  e => console.error('[wolf] uncaughtException',  e));
process.on('unhandledRejection', e => console.error('[wolf] unhandledRejection', e));
