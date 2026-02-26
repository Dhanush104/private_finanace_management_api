const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
    }),
});

const createMemberSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().max(20).optional(),
        role: z.enum(['admin', 'member']).optional(),
        joined_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
});

const updateMemberSchema = z.object({
    body: z.object({
        name: z.string().min(2).max(100),
        phone: z.string().max(20).optional().nullable(),
        is_active: z.number().int().min(0).max(1).optional(),
        joined_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }),
});

const resetPasswordSchema = z.object({
    body: z.object({
        password: z.string().min(6),
    }),
});

const groupConfigSchema = z.object({
    body: z.object({
        group_name: z.string().min(2).max(100),
        monthly_subscription: z.number().positive(),
        interest_rate: z.number().min(0).max(100),
    }),
});

const contributionSchema = z.object({
    body: z.object({
        user_id: z.number().int().positive().optional(),
        month_year: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
        amount: z.number().positive(),
        status: z.enum(['paid', 'pending', 'missed']).optional(),
        notes: z.string().max(255).optional(),
    }),
});

const updateContributionSchema = z.object({
    body: z.object({
        status: z.enum(['paid', 'pending', 'missed']),
        notes: z.string().max(255).optional().nullable(),
    }),
});

const requestLoanSchema = z.object({
    body: z.object({
        principal: z.number().positive(),
        duration_months: z.number().int().min(1).max(60),
        purpose: z.string().max(255).optional(),
    }),
});

const repaymentSchema = z.object({
    body: z.object({
        loan_id: z.number().int().positive(),
        amount: z.number().positive(),
        notes: z.string().max(255).optional(),
    }),
});

module.exports = {
    loginSchema,
    createMemberSchema,
    updateMemberSchema,
    resetPasswordSchema,
    groupConfigSchema,
    contributionSchema,
    updateContributionSchema,
    requestLoanSchema,
    repaymentSchema,
};
