const socketIO = require('socket.io');
const logger = require('../utils/logger');

let io = null;

module.exports = {
  init: (httpServer) => {
    io = socketIO(httpServer, {
      cors: {
        origin: '*', // Allow all dev origins, can restrict in production env
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      logger.info(`Client socket connected: ${socket.id}`);

      socket.on('join_room', (roomName) => {
        socket.join(roomName);
        logger.info(`Socket ${socket.id} joined room: ${roomName}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client socket disconnected: ${socket.id}`);
      });
    });

    return io;
  },
  getIO: () => {
    return io;
  }
};
