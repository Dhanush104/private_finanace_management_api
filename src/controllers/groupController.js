const pool = require('../config/db');
const AppError = require('../utils/AppError');
<<<<<<< HEAD
const { updateGroupFund } = require('../services/groupFundService');
=======
>>>>>>> main

// GET /api/group
const getGroupConfig = async (req, res, next) => {
    try {
        const [[config]] = await pool.query('SELECT * FROM group_config WHERE id = 1');
        if (!config) throw new AppError('Group config not found', 500);
        res.json({ success: true, config });
    } catch (err) { next(err); }
};

// PUT /api/group  (admin only)
const updateGroupConfig = async (req, res, next) => {
    try {
        const { group_name, monthly_subscription, interest_rate } = req.validated.body;
        await pool.query(
            'UPDATE group_config SET group_name = ?, monthly_subscription = ?, interest_rate = ? WHERE id = 1',
            [group_name, monthly_subscription, interest_rate]
        );
        const [[config]] = await pool.query('SELECT * FROM group_config WHERE id = 1');
        res.json({ success: true, message: 'Group config updated', config });
    } catch (err) { next(err); }
};

<<<<<<< HEAD
// POST /api/group/add-funds (admin only)
const addFunds = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { amount, description } = req.validated.body;

        const newFund = await updateGroupFund(
            conn, amount, 'adjustment',
            description,
            req.user.id, null
        );

        await conn.commit();
        res.json({ success: true, message: 'Funds added to group pool', new_fund: newFund });
    } catch (err) {
        if (conn) await conn.rollback();
        next(err);
    } finally {
        if (conn) conn.release();
    }
};

// POST /api/group/debit-funds (admin only)
const debitFunds = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { amount, description, date } = req.validated.body;

        // updateGroupFund adds amount to fund, so we pass negative amount for debit
        const newFund = await updateGroupFund(
            conn, -amount, 'adjustment',
            `Debit: ${description}`,
            req.user.id, null
        );

        // If an explicit date was passed, we might want to manually retro-update the ledger entry created by updateGroupFund.
        // updateGroupFund creates an entry with description = `Debit: ...`.
        if (date) {
            // update the latest ledger entry created by this user with this description
            await conn.query(
                `UPDATE transactions SET created_at = ? WHERE user_id = ? AND type = 'adjustment' AND description = ? ORDER BY id DESC LIMIT 1`,
                [`${date} 00:00:00`, req.user.id, `Debit: ${description}`]
            );
        }

        await conn.commit();
        res.json({ success: true, message: 'Funds debited from group pool', new_fund: newFund });
    } catch (err) {
        if (conn) await conn.rollback();
        next(err);
    } finally {
        if (conn) conn.release();
    }
};

// PUT /api/group/announcement (admin only)
const updateAnnouncement = async (req, res, next) => {
    try {
        const { announcement } = req.validated.body;
        await pool.query(
            'UPDATE group_config SET announcement = ? WHERE id = 1',
            [announcement || null]
        );
        res.json({ success: true, message: 'Announcement updated' });
    } catch (err) { next(err); }
};

module.exports = { getGroupConfig, updateGroupConfig, addFunds, debitFunds, updateAnnouncement };
=======
module.exports = { getGroupConfig, updateGroupConfig };
>>>>>>> main
