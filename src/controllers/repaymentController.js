const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { splitRepayment } = require('../services/loanService');
const { updateGroupFund } = require('../services/groupFundService');
const { updateCreditScore, CREDIT_EVENTS } = require('../services/creditScoreService');
const { broadcast } = require('../config/socket');

// GET /api/repayments  (admin: all | member: own)
const getRepayments = async (req, res, next) => {
    try {
        let query, params;
        if (req.user.role === 'admin') {
            query = `SELECT r.*, u.name as member_name, l.principal as loan_principal
               FROM repayments r
               JOIN users u ON r.user_id = u.id
               JOIN loans l ON r.loan_id = l.id
               ORDER BY r.created_at DESC`;
            params = [];
        } else {
            query = `SELECT r.*, u.name as member_name, l.principal as loan_principal
               FROM repayments r
               JOIN users u ON r.user_id = u.id
               JOIN loans l ON r.loan_id = l.id
               WHERE r.user_id = ?
               ORDER BY r.created_at DESC`;
            params = [req.user.id];
        }
        const [rows] = await pool.query(query, params);
        res.json({ success: true, repayments: rows });
    } catch (err) { next(err); }
};

// POST /api/repayments  (admin records repayment)
const recordRepayment = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { loan_id, amount, notes } = req.validated.body;

        const [[loan]] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loan_id]);
        if (!loan) throw new AppError('Loan not found', 404);
        if (loan.status !== 'active') throw new AppError('Loan is not active', 400);
        if (amount > loan.remaining_balance + 0.01) {
            throw new AppError(`Repayment exceeds remaining balance of ${loan.remaining_balance}`, 400);
        }

        // Determine remaining principal and interest
        const totalPaid = parseFloat((loan.total_payable - loan.remaining_balance).toFixed(2));
        const paidInterest = Math.min(totalPaid, loan.interest_amount);
        const remainingInterest = parseFloat((loan.interest_amount - paidInterest).toFixed(2));
        const remainingPrincipal = parseFloat((loan.remaining_balance - remainingInterest).toFixed(2));

        const { principal_portion, interest_portion } = splitRepayment(amount, remainingPrincipal, remainingInterest);

        // Record repayment
        const [repResult] = await conn.query(
            `INSERT INTO repayments (loan_id, user_id, amount, principal_portion, interest_portion, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [loan_id, loan.user_id, amount, principal_portion, interest_portion, notes || null]
        );

        const newBalance = parseFloat((loan.remaining_balance - amount).toFixed(2));
        const isClosed = newBalance <= 0.009;

        await conn.query(
            `UPDATE loans SET remaining_balance = ?, status = ? WHERE id = ?`,
            [Math.max(0, newBalance), isClosed ? 'closed' : 'active', loan_id]
        );

        // Add full repayment amount to group fund (principal returns + interest earned)
        const newFund = await updateGroupFund(
            conn, amount, 'repayment',
            `Loan #${loan_id} repayment (principal: ${principal_portion}, interest: ${interest_portion})`,
            loan.user_id, repResult.insertId
        );

        // Credit score update
        let creditDelta = CREDIT_EVENTS.EARLY_FULL_REPAYMENT;
        const dueDate = loan.due_date ? new Date(loan.due_date) : null;
        if (dueDate && new Date() > dueDate && !isClosed) {
            creditDelta = CREDIT_EVENTS.DELAYED_REPAYMENT;
        }
        if (isClosed) {
            const newScore = await updateCreditScore(loan.user_id, creditDelta, conn);
            broadcast('credit_score_updated', { user_id: loan.user_id, new_score: newScore });
        }

        await conn.commit();

        const [[repayment]] = await pool.query(
            `SELECT r.*, u.name as member_name FROM repayments r
       JOIN users u ON r.user_id = u.id WHERE r.id = ?`,
            [repResult.insertId]
        );

        broadcast('repayment_completed', {
            repayment,
            loan_id,
            new_balance: Math.max(0, newBalance),
            loan_closed: isClosed,
            new_fund: newFund,
        });

        res.status(201).json({
            success: true,
            message: isClosed ? 'Repayment recorded. Loan fully closed!' : 'Repayment recorded',
            repayment,
            loan_closed: isClosed,
        });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getRepayments, recordRepayment };
