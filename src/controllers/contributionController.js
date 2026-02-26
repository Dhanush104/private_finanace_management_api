const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { updateGroupFund } = require('../services/groupFundService');
const { updateCreditScore, CREDIT_EVENTS } = require('../services/creditScoreService');
const { broadcast } = require('../config/socket');

// GET /api/contributions  (admin: all | member: own)
const getContributions = async (req, res, next) => {
    try {
        let query, params;
        if (req.user.role === 'admin') {
            query = `SELECT c.*, u.name as member_name
               FROM contributions c
               JOIN users u ON c.user_id = u.id
               ORDER BY c.created_at DESC`;
            params = [];
        } else {
            query = `SELECT c.*, u.name as member_name
               FROM contributions c
               JOIN users u ON c.user_id = u.id
               WHERE c.user_id = ?
               ORDER BY c.created_at DESC`;
            params = [req.user.id];
        }

        const [rows] = await pool.query(query, params);
        res.json({ success: true, contributions: rows });
    } catch (err) { next(err); }
};

// POST /api/contributions  (admin: any user | member: self)
const recordContribution = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { user_id, month_year, amount, status, notes } = req.validated.body;
        console.log('RecordContribution attempt:', { user_id, month_year, amount, status, role: req.user.role, self_id: req.user.id });

        // Security & assignment: members can only record for themselves
        const targetUserId = req.user.role === 'admin' ? user_id : req.user.id;
        if (req.user.role === 'admin' && !user_id) throw new AppError('user_id is required for admin', 400);

        // Members are always 'paid', admins can specify
        const targetStatus = req.user.role === 'admin' ? (status || 'paid') : 'paid';

        // Check for duplicate
        const [existing] = await conn.query(
            'SELECT id FROM contributions WHERE user_id = ? AND month_year = ?',
            [targetUserId, month_year]
        );
        if (existing.length) throw new AppError(`Contribution already recorded for ${month_year}`, 409);

        const paid_at = targetStatus === 'paid' ? new Date() : null;

        const [result] = await conn.query(
            `INSERT INTO contributions (user_id, month_year, amount, status, paid_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [targetUserId, month_year, amount, targetStatus, paid_at, notes || null]
        );
        const insertId = result.insertId;
        console.log('Contribution inserted, id:', insertId);

        // Update group fund if paid or pending (anything not 'missed')
        let newFund = null;
        if (targetStatus !== 'missed') {
            newFund = await updateGroupFund(
                conn, amount, 'contribution',
                `Monthly contribution for ${month_year}`,
                targetUserId, insertId
            );
            console.log('Fund updated, new total:', newFund);
        }

        // Update credit score
        const delta = targetStatus === 'missed' ? CREDIT_EVENTS.MISSED_CONTRIBUTION : CREDIT_EVENTS.ON_TIME_CONTRIBUTION;
        const newScore = await updateCreditScore(targetUserId, delta, conn);
        console.log('Credit score updated, new score:', newScore);

        await conn.commit();
        console.log('Transaction committed');

        // Fetch user name for response/broadcast (use pool after commit)
        const [rows] = await pool.query(
            `SELECT c.*, u.name as member_name FROM contributions c
        JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
            [insertId]
        );
        const contrib = rows[0];

        broadcast('contribution_added', { contribution: contrib, new_fund: newFund });
        broadcast('credit_score_updated', { user_id: targetUserId, new_score: newScore });

        res.status(201).json({ success: true, message: 'Contribution recorded', contribution: contrib });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('CRITICAL: Error recording contribution:', err);
        next(err);
    } finally {
        if (conn) conn.release();
    }
};

// PUT /api/contributions/:id  (admin only)
const updateContribution = async (req, res, next) => {
    try {
        const { status, notes } = req.validated.body;
        await pool.query(
            'UPDATE contributions SET status = ?, notes = ? WHERE id = ?',
            [status, notes || null, req.params.id]
        );
        res.json({ success: true, message: 'Contribution updated' });
    } catch (err) { next(err); }
};

module.exports = { getContributions, recordContribution, updateContribution };
