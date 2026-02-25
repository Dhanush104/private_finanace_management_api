const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

// GET /api/members  (admin)
const getAllMembers = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, phone, credit_score, is_active, joined_date, created_at
       FROM users ORDER BY created_at DESC`
        );
        res.json({ success: true, members: rows });
    } catch (err) { next(err); }
};

// GET /api/members/:id
const getMember = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, phone, credit_score, is_active, joined_date, created_at
       FROM users WHERE id = ?`,
            [req.params.id]
        );
        if (!rows.length) throw new AppError('Member not found', 404);

        // Members can only fetch their own data
        if (req.user.role !== 'admin' && req.user.id !== rows[0].id) {
            throw new AppError('Access denied', 403);
        }

        res.json({ success: true, member: rows[0] });
    } catch (err) { next(err); }
};

// POST /api/members  (admin only)
const createMember = async (req, res, next) => {
    try {
        const { name, email, password, phone, role, joined_date } = req.validated.body;

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.length) throw new AppError('Email already in use', 409);

        const hash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, phone, joined_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email.toLowerCase(), hash, role || 'member', phone || null, joined_date || null]
        );

        res.status(201).json({
            success: true,
            message: 'Member created',
            member: { id: result.insertId, name, email, role: role || 'member' },
        });
    } catch (err) { next(err); }
};

// PUT /api/members/:id  (admin only)
const updateMember = async (req, res, next) => {
    try {
        const { name, phone, is_active, joined_date } = req.validated.body;
        await pool.query(
            'UPDATE users SET name = ?, phone = ?, is_active = ?, joined_date = ? WHERE id = ?',
            [name, phone || null, is_active !== undefined ? is_active : 1, joined_date || null, req.params.id]
        );
        res.json({ success: true, message: 'Member updated' });
    } catch (err) { next(err); }
};

// PUT /api/members/:id/password  (admin only)
const resetPassword = async (req, res, next) => {
    try {
        const { password } = req.validated.body;
        const hash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) { next(err); }
};

// DELETE /api/members/:id (admin only)
const deleteMember = async (req, res, next) => {
    try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) throw new AppError('Member not found', 404);
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (err) { next(err); }
};

module.exports = { getAllMembers, getMember, createMember, updateMember, resetPassword, deleteMember };
