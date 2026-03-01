const pool = require('../config/db');

// GET /api/dashboard/admin
const getAdminDashboard = async (req, res, next) => {
    try {
        const [[config]] = await pool.query('SELECT * FROM group_config WHERE id = 1');

        const [[{ total_members }]] = await pool.query(
            "SELECT COUNT(*) as total_members FROM users WHERE role = 'member' AND is_active = 1"
        );

        const [[{ total_contributions }]] = await pool.query(
            "SELECT COALESCE(SUM(amount),0) as total_contributions FROM contributions WHERE status = 'paid'"
        );

        const [[{ active_loans, total_loaned }]] = await pool.query(
            `SELECT COUNT(*) as active_loans, COALESCE(SUM(principal),0) as total_loaned
       FROM loans WHERE status = 'active'`
        );

        const [[{ total_interest_earned }]] = await pool.query(
            `SELECT COALESCE(SUM(interest_portion),0) as total_interest_earned FROM repayments`
        );

        const [[{ pending_loans }]] = await pool.query(
            "SELECT COUNT(*) as pending_loans FROM loans WHERE status = 'pending'"
        );

        // Monthly contributions for chart (last 12 months)
        const [monthlyData] = await pool.query(
            `SELECT month_year, COALESCE(SUM(amount),0) as total
       FROM contributions
       WHERE status = 'paid' AND month_year >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 12 MONTH), '%Y-%m')
       GROUP BY month_year ORDER BY month_year ASC`
        );

        // Credit score leaderboard
        const [creditLeaderboard] = await pool.query(
            `SELECT id, name, credit_score FROM users
       WHERE role = 'member' AND is_active = 1
       ORDER BY credit_score DESC LIMIT 10`
        );

        // Recent transactions
        const [recentTransactions] = await pool.query(
            `SELECT t.*, u.name as member_name FROM transactions t
       LEFT JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC LIMIT 10`
        );

        res.json({
            success: true,
            dashboard: {
                total_fund: config?.total_fund || 0,
                total_members: total_members || 0,
                total_contributions: total_contributions || 0,
                active_loans: active_loans || 0,
                pending_loans: pending_loans || 0,
                total_loaned: total_loaned || 0,
                total_interest_earned: total_interest_earned || 0,
                monthly_contributions: monthlyData || [],
                credit_leaderboard: creditLeaderboard || [],
                recent_transactions: recentTransactions || [],
                group_name: config?.group_name || 'Group Name Array',
                monthly_subscription: config?.monthly_subscription || 0,
                interest_rate: config?.interest_rate || 0,
                announcement: config?.announcement || null,

        });
    } catch (err) { next(err); }
};

// GET /api/dashboard/member
const getMemberDashboard = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [[user]] = await pool.query(
            'SELECT id, name, email, credit_score, joined_date FROM users WHERE id = ?',
            [userId]
        );


        const [[config]] = await pool.query('SELECT total_fund, group_name, monthly_subscription, announcement FROM group_config WHERE id = 1');


        // Current month contribution
        const currentMonth = new Date().toISOString().slice(0, 7);
        const [[monthContrib]] = await pool.query(
            'SELECT * FROM contributions WHERE user_id = ? AND month_year = ?',
            [userId, currentMonth]
        );

        // Active loan
        const [[activeLoan]] = await pool.query(
            "SELECT * FROM loans WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
            [userId]
        );

        // Contribution stats
        const [[contribStats]] = await pool.query(
            `SELECT COUNT(*) as total_months,
              SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_months,
              COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as total_paid
       FROM contributions WHERE user_id = ?`,
            [userId]
        );

        // Loan history
        const [loans] = await pool.query(
            'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
            [userId]
        );

        // Recent transactions
        const [transactions] = await pool.query(
            `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 8`,
            [userId]
        );

        res.json({
            success: true,
            dashboard: {
                user,

                group_fund: config?.total_fund || 0,
                group_name: config?.group_name || 'Group Name',
                monthly_subscription: config?.monthly_subscription || 0,
                announcement: config?.announcement || null,
                current_month_contribution: monthContrib || null,
                active_loan: activeLoan || null,
                contribution_stats: contribStats || { total_months: 0, paid_months: 0, total_paid: 0 },
                recent_loans: loans || [],
                recent_transactions: transactions || [],

            },
        });
    } catch (err) { next(err); }
};

// GET /api/dashboard/report/monthly?month=YYYY-MM  (admin only)
const getMonthlyReport = async (req, res, next) => {
    try {
        const month = req.query.month || new Date().toISOString().slice(0, 7);

        // Per-member contribution status for this month
        const [memberContribs] = await pool.query(
            `SELECT u.id, u.name, u.email,
                COALESCE(c.amount, 0) as amount,
                COALESCE(c.status, 'not_recorded') as status,
                c.paid_at, c.notes
             FROM users u
             LEFT JOIN contributions c ON c.user_id = u.id AND c.month_year = ?
             WHERE u.is_active = 1
             ORDER BY u.name ASC`,
            [month]
        );

        // Loans disbursed this month
        const [loans] = await pool.query(
            `SELECT l.*, u.name as member_name
             FROM loans l JOIN users u ON l.user_id = u.id
             WHERE l.status IN ('active','closed') AND DATE_FORMAT(l.approved_at, '%Y-%m') = ?
             ORDER BY l.approved_at DESC`,
            [month]
        );

        // Repayments this month
        const [repayments] = await pool.query(
            `SELECT r.*, u.name as member_name
             FROM repayments r JOIN users u ON r.user_id = u.id
             WHERE DATE_FORMAT(r.created_at, '%Y-%m') = ?
             ORDER BY r.created_at DESC`,
            [month]
        );

        // Summary totals
        const [[totals]] = await pool.query(
            `SELECT
               COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as total_collected,
               COUNT(CASE WHEN status='paid' THEN 1 END) as paid_count,
               COUNT(CASE WHEN status='missed' THEN 1 END) as missed_count,
               COUNT(CASE WHEN status='pending' THEN 1 END) as pending_count
             FROM contributions WHERE month_year = ?`,
            [month]
        );

        const [[repayTotals]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total_repaid,
                    COALESCE(SUM(interest_portion),0) as interest_collected
             FROM repayments WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
            [month]
        );

        const [[loanTotals]] = await pool.query(
            `SELECT COALESCE(SUM(principal),0) as total_disbursed, COUNT(*) as loan_count
             FROM loans WHERE DATE_FORMAT(approved_at, '%Y-%m') = ? AND status IN ('active','closed')`,
            [month]
        );

        res.json({
            success: true,
            month,
            report: {
                summary: {
                    total_collected: totals.total_collected,
                    paid_count: totals.paid_count,
                    missed_count: totals.missed_count,
                    pending_count: totals.pending_count,
                    total_repaid: repayTotals.total_repaid,
                    interest_collected: repayTotals.interest_collected,
                    total_disbursed: loanTotals.total_disbursed,
                    loan_count: loanTotals.loan_count,
                },
                member_contributions: memberContribs,
                loans_disbursed: loans,
                repayments_received: repayments,
            },
        });
    } catch (err) { next(err); }
};

// GET /api/dashboard/report/yearly?year=YYYY  (admin only)
const getYearlyReport = async (req, res, next) => {
    try {
        const year = req.query.year || new Date().getFullYear().toString();

        // Month-by-month contributions across the year
        const [monthly] = await pool.query(
            `SELECT month_year,
               COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as collected,
               COUNT(CASE WHEN status='paid' THEN 1 END) as paid_count,
               COUNT(CASE WHEN status='missed' THEN 1 END) as missed_count
             FROM contributions
             WHERE month_year LIKE ?
             GROUP BY month_year ORDER BY month_year ASC`,
            [`${year}-%`]
        );

        // Member-wise yearly contribution summary
        const [memberSummary] = await pool.query(
            `SELECT u.id, u.name,
               COALESCE(SUM(CASE WHEN c.status='paid' THEN c.amount ELSE 0 END),0) as total_paid,
               COUNT(CASE WHEN c.status='paid' THEN 1 END) as months_paid,
               COUNT(CASE WHEN c.status='missed' THEN 1 END) as months_missed,
               u.credit_score
             FROM users u
             LEFT JOIN contributions c ON c.user_id = u.id AND c.month_year LIKE ?
             WHERE u.is_active = 1
             GROUP BY u.id, u.name, u.credit_score
             ORDER BY total_paid DESC`,
            [`${year}-%`]
        );

        // Yearly loan summary (excluding rejected)
        const [[loanSummary]] = await pool.query(
            `SELECT
               COALESCE(SUM(principal),0) as total_disbursed,
               COUNT(*) as total_loans,
               COUNT(CASE WHEN status='active' THEN 1 END) as active_loans,
               COUNT(CASE WHEN status='closed' THEN 1 END) as closed_loans
             FROM loans WHERE YEAR(created_at) = ? AND status != 'rejected'`,
            [year]
        );

        // Yearly repayment summary
        const [[repaySummary]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total_repaid,
                    COALESCE(SUM(interest_portion),0) as total_interest
             FROM repayments WHERE YEAR(created_at) = ?`,
            [year]
        );

        // Yearly totals
        const [[yearTotals]] = await pool.query(
            `SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as total_collected
             FROM contributions WHERE month_year LIKE ?`,
            [`${year}-%`]
        );

        res.json({
            success: true,
            year,
            report: {
                summary: {
                    total_collected: yearTotals.total_collected,
                    total_disbursed: loanSummary.total_disbursed,
                    total_loans: loanSummary.total_loans,
                    active_loans: loanSummary.active_loans,
                    closed_loans: loanSummary.closed_loans,
                    total_repaid: repaySummary.total_repaid,
                    total_interest: repaySummary.total_interest,
                },
                monthly_breakdown: monthly,
                member_summary: memberSummary,
            },
        });
    } catch (err) { next(err); }
};

// GET /api/dashboard/report/group  (admin only)
const getGroupReport = async (req, res, next) => {
    try {
        const [[config]] = await pool.query('SELECT * FROM group_config WHERE id = 1');

        // All-time totals
        const [[allTime]] = await pool.query(
            `SELECT
               COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as total_contributions,
               COUNT(DISTINCT user_id) as contributing_members,
               COUNT(*) as total_records
             FROM contributions`
        );

        const [[loanAll]] = await pool.query(
            `SELECT
               COALESCE(SUM(principal),0) as total_loaned,
               COUNT(*) as total_loans,
               COUNT(CASE WHEN status='active' THEN 1 END) as active_loans,
               COALESCE(SUM(remaining_balance),0) as outstanding_balance
             FROM loans WHERE status != 'rejected'`
        );

        const [[repayAll]] = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total_repaid,
                    COALESCE(SUM(interest_portion),0) as total_interest_earned
             FROM repayments`
        );

        // Per-member lifetime summary
        const [members] = await pool.query(
            `SELECT u.id, u.name, u.email, u.credit_score, u.joined_date, u.is_active,
               COALESCE(c_stats.total_paid, 0) as lifetime_contributions,
               COALESCE(c_stats.months_paid, 0) as months_paid,
               COALESCE(c_stats.months_missed, 0) as months_missed,
               COALESCE(l_stats.total_borrowed, 0) as total_borrowed,
               COALESCE(l_stats.active_loans, 0) as active_loans,
               COALESCE(r_stats.total_repaid, 0) as total_repaid
             FROM users u
             LEFT JOIN (
               SELECT user_id,
                 SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_paid,
                 COUNT(CASE WHEN status='paid' THEN 1 END) as months_paid,
                 COUNT(CASE WHEN status='missed' THEN 1 END) as months_missed
               FROM contributions GROUP BY user_id
             ) c_stats ON c_stats.user_id = u.id
             LEFT JOIN (
               SELECT user_id,
                 SUM(principal) as total_borrowed,
                 COUNT(CASE WHEN status='active' THEN 1 END) as active_loans
               FROM loans WHERE status != 'rejected' GROUP BY user_id
             ) l_stats ON l_stats.user_id = u.id
             LEFT JOIN (
               SELECT user_id, SUM(amount) as total_repaid
               FROM repayments GROUP BY user_id
             ) r_stats ON r_stats.user_id = u.id
             WHERE u.role = 'member'
             ORDER BY lifetime_contributions DESC`
        );

        // Fund growth over time (all transactions)
        const [fundGrowth] = await pool.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
               MAX(group_fund_after) as fund_after
             FROM transactions
             GROUP BY month ORDER BY month ASC`
        );

        res.json({
            success: true,
            report: {
                group: {
                    name: config.group_name,
                    total_fund: config.total_fund,
                    monthly_subscription: config.monthly_subscription,
                    interest_rate: config.interest_rate,
                },
                all_time: {
                    total_contributions: allTime.total_contributions,
                    contributing_members: allTime.contributing_members,
                    total_loaned: loanAll.total_loaned,
                    total_loans: loanAll.total_loans,
                    active_loans: loanAll.active_loans,
                    outstanding_balance: loanAll.outstanding_balance,
                    total_repaid: repayAll.total_repaid,
                    total_interest_earned: repayAll.total_interest_earned,
                },
                member_lifetimes: members,
                fund_growth: fundGrowth,
            },
        });
    } catch (err) { next(err); }
};

module.exports = { getAdminDashboard, getMemberDashboard, getMonthlyReport, getYearlyReport, getGroupReport };
