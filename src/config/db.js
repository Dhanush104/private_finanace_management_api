const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let poolConfig;

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  poolConfig = process.env.MYSQL_URL || process.env.DATABASE_URL;
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'royal_star_boys',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    dateStrings: false,
  };
}

const pool = mysql.createPool(poolConfig);

pool.getConnection()
  .then(conn => {
    logger.info('✅ MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    logger.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
