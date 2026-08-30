const { Server } = require('socket.io');
const { setSocketIO } = require('./notificationService');
const flags = require('../config/featureFlags');

function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: flags.CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  });
  io.on('connection', (socket) => {
    console.log(`[orca-alerts] socket connected ${socket.id}`);
    socket.on('disconnect', () => console.log(`[orca-alerts] socket disconnected ${socket.id}`));
  });
  setSocketIO(io);
  return io;
}
module.exports = { attachSocketServer };
