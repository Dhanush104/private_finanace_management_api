const mysql = require('mysql2/promise');
(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'turntable.proxy.rlwy.net',
            port: 42089,
            user: 'root',
            password: 'oCHFtpDOPYYKXmqGHzOMhpzkqFVxBXns',
            database: 'royal_star_boys'
        });
        await conn.query("ALTER TABLE contributions MODIFY COLUMN status ENUM('paid','pending','missed','rejected') NOT NULL DEFAULT 'paid'");
        console.log('success');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
