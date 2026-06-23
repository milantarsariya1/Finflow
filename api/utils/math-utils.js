/**
 * Financial Calculation Helpers
 * All calculations are executed strictly in JavaScript code to guarantee mathematical accuracy.
 */

/**
 * Calculates real surplus based on monthly income, fixed commitments, and variable spend.
 * Average monthly variable spend is computed over the duration of recorded variable expenses.
 */
export function calculateSurplus(monthlyIncome, fixedExpensesList, transactions) {
  const totalFixed = fixedExpensesList.reduce((sum, item) => sum + item.amount, 0);
  
  // Filter for transactions that are variable expenses (type: expense)
  const variableExpenses = transactions.filter(t => t.type === 'expense');
  const totalVariable = variableExpenses.reduce((sum, t) => sum + t.amount, 0);
  
  let monthsActive = 1;
  if (variableExpenses.length > 0) {
    const dates = variableExpenses.map(t => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Date.now();
    const msDiff = maxDate - minDate;
    const daysDiff = msDiff / (1000 * 60 * 60 * 24);
    monthsActive = Math.max(1, daysDiff / 30.44); // standard month length
  }
  
  const avgMonthlyVariable = totalVariable / monthsActive;
  const surplus = monthlyIncome - totalFixed - avgMonthlyVariable;
  
  return {
    totalFixed,
    totalVariable,
    avgMonthlyVariable: Math.round(avgMonthlyVariable * 100) / 100,
    surplus: Math.round(surplus * 100) / 100,
    monthsActive: Math.round(monthsActive * 100) / 100
  };
}

/**
 * Checks emergency fund status: recommends 6x total fixed expenses.
 */
export function checkEmergencyFund(fixedExpensesList, savings = 0) {
  const totalFixed = fixedExpensesList.reduce((sum, item) => sum + item.amount, 0);
  const recommended = totalFixed * 6;
  const gap = Math.max(0, recommended - savings);
  const isAdequate = savings >= recommended;
  
  return {
    totalFixed,
    recommended,
    currentSavings: savings,
    gap,
    isAdequate
  };
}

/**
 * Calculates compound interest for Fixed Deposits (quarterly compounding).
 * MV = P * (1 + r/400)^(4*t)
 */
export function calculateFD(amount, rate = 7.0, tenureYears, bankBalance = 0, totalFixedExpenses = 0) {
  const P = parseFloat(amount) || 0;
  const r = parseFloat(rate) || 0;
  const t = parseFloat(tenureYears) || 0;
  
  const maturityValue = P * Math.pow(1 + (r / 400), 4 * t);
  const interestEarned = maturityValue - P;
  
  // Smart Suggestion: keep liquid equivalent to 2 months of fixed expenses (min ₹50,000)
  const liquidKeep = Math.max(50000, 2 * totalFixedExpenses);
  const suggestedFD = Math.max(0, bankBalance - liquidKeep);
  const remainingLiquid = bankBalance - suggestedFD;
  
  return {
    principal: P,
    rate: r,
    tenureYears: t,
    maturityValue: Math.round(maturityValue * 100) / 100,
    interestEarned: Math.round(interestEarned * 100) / 100,
    suggestedFD: Math.round(suggestedFD * 100) / 100,
    remainingLiquid: Math.round(remainingLiquid * 100) / 100,
    liquidKeep
  };
}

/**
 * Calculates future value of a monthly Systematic Investment Plan (SIP).
 * FV = P * [ ((1+i)^n - 1) / i ] * (1+i)
 */
export function calculateSIP(monthlyAmount, rate = 12.0, years) {
  const P = parseFloat(monthlyAmount) || 0;
  const r = parseFloat(rate) || 0;
  const t = parseFloat(years) || 0;
  
  const i = r / (12 * 100); // monthly interest rate
  const n = t * 12; // total number of months
  
  let maturityValue = 0;
  let investedAmount = 0;
  
  if (P > 0 && i > 0) {
    maturityValue = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    investedAmount = P * n;
  } else if (P > 0) {
    maturityValue = P * n;
    investedAmount = P * n;
  }
  
  const estimatedReturns = maturityValue - investedAmount;
  
  return {
    monthlyAmount: P,
    rate: r,
    years: t,
    investedAmount: Math.round(investedAmount * 100) / 100,
    maturityValue: Math.round(maturityValue * 100) / 100,
    estimatedReturns: Math.round(estimatedReturns * 100) / 100
  };
}

/**
 * Calculates future value of a lumpsum investment.
 * FV = P * (1 + r/100)^t
 */
export function calculateLumpsum(amount, rate = 12.0, years) {
  const P = parseFloat(amount) || 0;
  const r = parseFloat(rate) || 0;
  const t = parseFloat(years) || 0;
  
  const maturityValue = P * Math.pow(1 + (r / 100), t);
  const investedAmount = P;
  const estimatedReturns = maturityValue - investedAmount;
  
  return {
    lumpsumAmount: P,
    rate: r,
    years: t,
    investedAmount: Math.round(investedAmount * 100) / 100,
    maturityValue: Math.round(maturityValue * 100) / 100,
    estimatedReturns: Math.round(estimatedReturns * 100) / 100
  };
}

/**
 * Calculates required monthly SIP to reach a specific financial goal.
 * P = Target / [ ((1+i)^n - 1) / i * (1+i) ]
 */
export function calculateGoalRequiredSIP(targetAmount, years, rate = 12.0) {
  const T = parseFloat(targetAmount) || 0;
  const t = parseFloat(years) || 0;
  const r = parseFloat(rate) || 0;
  
  const i = r / (12 * 100);
  const n = t * 12;
  
  let requiredSip = 0;
  if (T > 0 && i > 0 && n > 0) {
    const denominator = ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    requiredSip = T / denominator;
  }
  
  return {
    targetAmount: T,
    years: t,
    rate: r,
    requiredSip: Math.round(requiredSip * 100) / 100
  };
}
