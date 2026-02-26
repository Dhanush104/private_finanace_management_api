const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [rows] = await pool.query(
            'SELECT id, name, email, role, credit_score, is_active FROM users WHERE id = ?',
            [decoded.id]
        );

        if (!rows.length || !rows[0].is_active) {
            throw new AppError('User not found or account deactivated', 401);
        }

        req.user = rows[0];
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
        if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401));
        next(err);
    }
};

module.exports = { protect };
