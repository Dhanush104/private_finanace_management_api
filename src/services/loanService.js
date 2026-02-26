/**
 * Calculate simple interest and total payable.
 * SI = (Principal × Rate × Time) / 100
 */
const calculateLoanDetails = (principal, ratePercent, durationMonths) => {
    const interest = (principal * ratePercent * durationMonths) / 100;
    const total = principal + interest;
    return {
        interest_amount: parseFloat(interest.toFixed(2)),
        total_payable: parseFloat(total.toFixed(2)),
        remaining_balance: parseFloat(total.toFixed(2)),
    };
};

/**
 * Split a repayment amount into principal and interest portions
 * proportional to the remaining balances.
 */
const splitRepayment = (amount, remainingPrincipal, remainingInterest) => {
    const total = remainingPrincipal + remainingInterest;
    if (total <= 0) return { principal_portion: 0, interest_portion: 0 };

    const interestPortion = parseFloat(Math.min(amount * (remainingInterest / total), remainingInterest).toFixed(2));
    const principalPortion = parseFloat(Math.min(amount - interestPortion, remainingPrincipal).toFixed(2));

    return { principal_portion: principalPortion, interest_portion: interestPortion };
};

module.exports = { calculateLoanDetails, splitRepayment };
