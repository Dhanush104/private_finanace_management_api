const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_fallback_key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.validated.body;

        const [rows] = await pool.query(
            'SELECT id, name, email, password_hash, role, credit_score, is_active FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (!rows.length) throw new AppError('Invalid email or password', 401);

        const user = rows[0];
        if (!user.is_active) throw new AppError('Account deactivated. Contact admin.', 403);

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new AppError('Invalid email or password', 401);

        const token = signToken(user.id, user.role);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                credit_score: user.credit_score,
            },
        });
    } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role, phone, credit_score, is_active, joined_date, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) throw new AppError('User not found', 404);
        res.json({ success: true, user: rows[0] });
    } catch (err) { next(err); }
};

module.exports = { login, getMe };
