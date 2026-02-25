require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const logger = require('./utils/logger');
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
    try {
        const [rows] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (rows.length) return;

        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 12);
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`,
            [
                process.env.ADMIN_NAME || 'Super Admin',
                process.env.ADMIN_EMAIL || 'admin@royalstarboys.com',
                hash,
            ]
        );
        logger.info(`✅ Admin seeded: ${process.env.ADMIN_EMAIL || 'admin@royalstarboys.com'}`);
    } catch (err) {
        logger.warn('Seed skipped or failed:', err.message);
    }
};

const start = async () => {
    const server = http.createServer(app);
    initSocket(server);

    await seedAdmin();

    server.listen(PORT, () => {
        logger.info(`🚀 Royal Star Boys API running on port ${PORT}`);
        logger.info(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
    });

    process.on('unhandledRejection', (err) => {
        logger.error('Unhandled Rejection:', err);
        server.close(() => process.exit(1));
    });
};

start();
