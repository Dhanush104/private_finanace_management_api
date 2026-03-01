const pool = require('../config/db');
const AppError = require('../utils/AppError');
<<<<<<< HEAD
const { calculateLoanDetails, calculateDynamicLoanDetails } = require('../services/loanService');
const { updateGroupFund } = require('../services/groupFundService');
const { broadcast } = require('../config/socket');

// GET /api/loans  (all members can see all loans)
const getLoans = async (req, res, next) => {
    try {
        const query = `SELECT l.*, u.name as member_name, a.name as approved_by_name
=======
const { calculateLoanDetails } = require('../services/loanService');
const { updateGroupFund } = require('../services/groupFundService');
const { broadcast } = require('../config/socket');

// GET /api/loans  (admin: all | member: own)
const getLoans = async (req, res, next) => {
    try {
        let query, params;
        if (req.user.role === 'admin') {
            query = `SELECT l.*, u.name as member_name, a.name as approved_by_name
>>>>>>> main
               FROM loans l
               JOIN users u ON l.user_id = u.id
               LEFT JOIN users a ON l.approved_by = a.id
               ORDER BY l.created_at DESC`;
<<<<<<< HEAD
        const [rows] = await pool.query(query);
        const loansWithDynamic = rows.map(loan => ({
            ...loan,
            ...calculateDynamicLoanDetails(loan)
        }));
        res.json({ success: true, loans: loansWithDynamic });
=======
            params = [];
        } else {
            query = `SELECT l.*, u.name as member_name, a.name as approved_by_name
               FROM loans l
               JOIN users u ON l.user_id = u.id
               LEFT JOIN users a ON l.approved_by = a.id
               WHERE l.user_id = ?
               ORDER BY l.created_at DESC`;
            params = [req.user.id];
        }
        const [rows] = await pool.query(query, params);
        res.json({ success: true, loans: rows });
>>>>>>> main
    } catch (err) { next(err); }
};

// GET /api/loans/:id
const getLoan = async (req, res, next) => {
    try {
        const [[loan]] = await pool.query(
            `SELECT l.*, u.name as member_name FROM loans l
       JOIN users u ON l.user_id = u.id WHERE l.id = ?`,
            [req.params.id]
        );
        if (!loan) throw new AppError('Loan not found', 404);
<<<<<<< HEAD
        const dynamicVars = calculateDynamicLoanDetails(loan);
        res.json({ success: true, loan: { ...loan, ...dynamicVars } });
    } catch (err) { next(err); }
};

// POST /api/loans (member requests a loan, or admin on behalf)
const requestLoan = async (req, res, next) => {
    try {
        const { principal, duration_months, purpose, user_id } = req.validated.body;

        let targetUserId = req.user.id;
        if (user_id) {
            if (req.user.role !== 'admin') throw new AppError('Only admins can request loans for others', 403);
            targetUserId = user_id;
        }
=======
        if (req.user.role !== 'admin' && req.user.id !== loan.user_id) throw new AppError('Access denied', 403);
        res.json({ success: true, loan });
    } catch (err) { next(err); }
};

// POST /api/loans  (member requests a loan)
const requestLoan = async (req, res, next) => {
    try {
        const { principal, duration_months, purpose } = req.validated.body;
>>>>>>> main

        // Fetch current interest rate
        const [[config]] = await pool.query('SELECT interest_rate FROM group_config WHERE id = 1');

        const details = calculateLoanDetails(principal, config.interest_rate, duration_months);

        const [result] = await pool.query(
            `INSERT INTO loans (user_id, principal, interest_rate, duration_months, interest_amount, total_payable, remaining_balance, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
<<<<<<< HEAD
            [targetUserId, principal, config.interest_rate, duration_months,
                details.interest_amount, details.total_payable, details.remaining_balance, purpose || null]
=======
            [req.user.id, principal, config.interest_rate, duration_months,
            details.interest_amount, details.total_payable, details.remaining_balance, purpose || null]
>>>>>>> main
        );

        res.status(201).json({
            success: true,
            message: 'Loan request submitted',
            loan: { id: result.insertId, ...details, status: 'pending' },
        });
    } catch (err) { next(err); }
};

// POST /api/loans/:id/approve  (admin only)
const approveLoan = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[loan]] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [req.params.id]);
        if (!loan) throw new AppError('Loan not found', 404);
        if (loan.status !== 'pending') throw new AppError(`Loan is already ${loan.status}`, 400);

        // Calculate due date
        const due = new Date();
        due.setMonth(due.getMonth() + loan.duration_months);

        await conn.query(
            `UPDATE loans SET status = 'active', approved_by = ?, approved_at = NOW(), due_date = ? WHERE id = ?`,
            [req.user.id, due.toISOString().split('T')[0], loan.id]
        );

        // Deduct from group fund
        const newFund = await updateGroupFund(
            conn, -loan.principal, 'loan_disbursement',
            `Loan disbursed to user #${loan.user_id}: ${loan.purpose || 'no purpose'}`,
            loan.user_id, loan.id
        );

        await conn.commit();

        const [[updated]] = await pool.query(
            `SELECT l.*, u.name as member_name FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?`,
            [loan.id]
        );

        broadcast('loan_approved', { loan: updated, new_fund: newFund });

        res.json({ success: true, message: 'Loan approved and disbursed', loan: updated });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// POST /api/loans/:id/reject  (admin only)
const rejectLoan = async (req, res, next) => {
    try {
        const [[loan]] = await pool.query('SELECT * FROM loans WHERE id = ?', [req.params.id]);
        if (!loan) throw new AppError('Loan not found', 404);
        if (loan.status !== 'pending') throw new AppError(`Loan is already ${loan.status}`, 400);

        await pool.query(
            `UPDATE loans SET status = 'rejected', approved_by = ?, approved_at = NOW() WHERE id = ?`,
            [req.user.id, loan.id]
        );

        res.json({ success: true, message: 'Loan rejected' });
    } catch (err) { next(err); }
};

module.exports = { getLoans, getLoan, requestLoan, approveLoan, rejectLoan };
