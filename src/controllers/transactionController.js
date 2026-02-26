const pool = require('../config/db');

// GET /api/transactions  (admin: all | member: own)
const getTransactions = async (req, res, next) => {
    try {
        const { type, limit = 50, offset = 0 } = req.query;

        let baseQuery, params;

        if (req.user.role === 'admin') {
            baseQuery = `SELECT t.*, u.name as member_name
                   FROM transactions t
                   LEFT JOIN users u ON t.user_id = u.id
                   WHERE 1=1`;
            params = [];
        } else {
            baseQuery = `SELECT t.*, u.name as member_name
                   FROM transactions t
                   LEFT JOIN users u ON t.user_id = u.id
                   WHERE t.user_id = ?`;
            params = [req.user.id];
        }

        if (type) {
            baseQuery += ' AND t.type = ?';
            params.push(type);
        }

        baseQuery += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(baseQuery, params);

        // Count total for pagination
        let countQuery = `SELECT COUNT(*) as total FROM transactions WHERE 1=1`;
        const countParams = [];
        if (req.user.role !== 'admin') { countQuery += ' AND user_id = ?'; countParams.push(req.user.id); }
        if (type) { countQuery += ' AND type = ?'; countParams.push(type); }
        const [[{ total }]] = await pool.query(countQuery, countParams);

        res.json({ success: true, transactions: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (err) { next(err); }
};

module.exports = { getTransactions };
