const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        logger.info(`🔌 Socket connected: ${socket.id}`);

        socket.on('join_room', (room) => {
            socket.join(room);
            logger.info(`Socket ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            logger.info(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
};

const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
        logger.info(`📡 Broadcasted: ${event}`);
    }
};

module.exports = { initSocket, getIO, broadcast };
