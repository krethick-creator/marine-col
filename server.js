require('dotenv').config();
const http = require('http');
const express = require('express');
const { attachSocketServer } = require('./services/socketServer');
const alertRoutes = require('./routes/alertRoutes');
const { start, stop } = require('./services/realtimeMonitor');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', (_req, res) => res.json({ service: 'orca-alerts', status: 'running' }));
app.use('/api/alerts', alertRoutes);

const server = http.createServer(app);
attachSocketServer(server);

server.listen(PORT, () => {
  console.log(`[orca-alerts] server running at http://localhost:${PORT}`);
  console.log(`[orca-alerts] health: http://localhost:${PORT}/api/alerts/health`);
  console.log(`[orca-alerts] API: http://localhost:${PORT}/api/alerts`);
  start();
});

function shutdown(signal) {
  console.log(`[orca-alerts] ${signal} received; shutting down`);
  stop();
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));