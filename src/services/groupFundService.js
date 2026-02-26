const pool = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Atomically update the group fund and record a transaction ledger entry.
 * Must be called inside a DB transaction.
 * @param {object} conn - MySQL connection with active transaction
 * @param {number} delta - positive = add to fund, negative = deduct
 * @param {string} type  - transaction type
 * @param {string} desc  - description
 * @param {number|null} userId
 * @param {number|null} referenceId
 */
const updateGroupFund = async (conn, delta, type, desc, userId = null, referenceId = null) => {
    const [[config]] = await conn.query('SELECT total_fund FROM group_config WHERE id = 1 FOR UPDATE');
    if (!config) throw new AppError('Group config not found', 500);

    const newFund = parseFloat((parseFloat(config.total_fund) + delta).toFixed(2));
    if (newFund < 0) throw new AppError('Insufficient group fund', 400);

    await conn.query('UPDATE group_config SET total_fund = ? WHERE id = 1', [newFund]);

    await conn.query(
        `INSERT INTO transactions (user_id, type, amount, description, group_fund_after, reference_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, type, Math.abs(delta), desc, newFund, referenceId]
    );

    return newFund;
};

module.exports = { updateGroupFund };
