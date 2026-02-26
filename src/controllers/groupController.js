const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { updateGroupFund } = require('../services/groupFundService');

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

module.exports = { getGroupConfig, updateGroupConfig, addFunds };
