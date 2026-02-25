const pool = require('../config/db');
const AppError = require('../utils/AppError');

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

module.exports = { getGroupConfig, updateGroupConfig };
