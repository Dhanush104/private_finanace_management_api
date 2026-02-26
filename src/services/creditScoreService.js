const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Update a user's credit score by a delta value.
 * Clamps to [300, 900].
 */
const updateCreditScore = async (userId, delta, conn = null) => {
    const db = conn || pool;
    const [rows] = await db.query('SELECT credit_score FROM users WHERE id = ?', [userId]);
    if (!rows.length) return;

    const current = rows[0].credit_score;
    const updated = Math.min(900, Math.max(300, current + delta));

    await db.query('UPDATE users SET credit_score = ? WHERE id = ?', [updated, userId]);
    logger.info(`CreditScore: user ${userId} ${current} → ${updated} (Δ${delta})`);

    return updated;
};

const CREDIT_EVENTS = {
    ON_TIME_CONTRIBUTION: +10,
    MISSED_CONTRIBUTION: -15,
    EARLY_FULL_REPAYMENT: +20,
    DELAYED_REPAYMENT: -25,
};

module.exports = { updateCreditScore, CREDIT_EVENTS };
