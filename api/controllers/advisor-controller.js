import prisma from '../config/db.js';
import {
  calculateSurplus,
  checkEmergencyFund,
  calculateFD,
  calculateSIP,
  calculateLumpsum,
  calculateGoalRequiredSIP,
} from '../utils/math-utils.js';

/**
 * Calculates the current surplus engine status for the user.
 */
export async function getSurplusStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        fixedExpenses: true,
        transactions: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const surplusData = calculateSurplus(
      user.monthlyIncome,
      user.fixedExpenses,
      user.transactions
    );

    res.status(200).json({
      monthlyIncome: user.monthlyIncome,
      bankBalance: user.bankBalance,
      savings: user.savings,
      fixedExpenses: user.fixedExpenses,
      ...surplusData,
    });
  } catch (error) {
    console.error('getSurplusStatus error:', error);
    res.status(500).json({ message: 'Error calculating surplus status.' });
  }
}

/**
 * Checks the emergency fund status for the user.
 */
export async function getEmergencyStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        fixedExpenses: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const emergencyData = checkEmergencyFund(user.fixedExpenses, user.savings);
    res.status(200).json(emergencyData);
  } catch (error) {
    console.error('getEmergencyStatus error:', error);
    res.status(500).json({ message: 'Error checking emergency fund status.' });
  }
}

/**
 * FD Calculator endpoint.
 */
export async function runFDCalculator(req, res) {
  const { amount, rate, tenureYears } = req.body;

  if (!amount || !tenureYears) {
    return res.status(400).json({ message: 'Amount and tenure are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { fixedExpenses: true },
    });

    const bankBalance = user ? user.bankBalance : 0;
    const totalFixed = user ? user.fixedExpenses.reduce((sum, e) => sum + e.amount, 0) : 0;

    const fdResult = calculateFD(amount, rate, tenureYears, bankBalance, totalFixed);
    res.status(200).json(fdResult);
  } catch (error) {
    console.error('runFDCalculator error:', error);
    res.status(500).json({ message: 'Error calculating FD results.' });
  }
}

/**
 * SIP & Lumpsum Calculator endpoint.
 */
export async function runSIPCalculator(req, res) {
  const { monthlyAmount, rate, years, lumpsumAmount } = req.body;

  try {
    let sipResult = null;
    let lumpsumResult = null;

    if (monthlyAmount !== undefined) {
      sipResult = calculateSIP(monthlyAmount, rate, years);
    }
    if (lumpsumAmount !== undefined) {
      lumpsumResult = calculateLumpsum(lumpsumAmount, rate, years);
    }

    res.status(200).json({
      sipResult,
      lumpsumResult,
    });
  } catch (error) {
    console.error('runSIPCalculator error:', error);
    res.status(500).json({ message: 'Error running SIP calculator.' });
  }
}

/**
 * Scenario Comparison Calculator.
 * Side by side comparison of equal amount in FD vs SIP.
 */
export async function runScenarioComparison(req, res) {
  const { amount, years, fdRate = 7.0, sipRate = 12.0 } = req.body;

  if (!amount || !years) {
    return res.status(400).json({ message: 'Amount and tenure (years) are required.' });
  }

  try {
    // 1. Lumpsum Comparison
    const fdLumpsum = calculateFD(amount, fdRate, years, 0, 0); // quarterly compounding
    const sipLumpsum = calculateLumpsum(amount, sipRate, years); // annual compounding

    // 2. Monthly Comparison (if users want to compare investing amount monthly)
    const fdSipEquivalent = calculateSIP(amount, fdRate, years); // compounding monthly at FD rate
    const sipSipEquivalent = calculateSIP(amount, sipRate, years); // compounding monthly at SIP rate

    res.status(200).json({
      amount: parseFloat(amount),
      years: parseFloat(years),
      lumpsumCompare: {
        fd: {
          invested: fdLumpsum.principal,
          interest: fdLumpsum.interestEarned,
          maturity: fdLumpsum.maturityValue,
        },
        sip: {
          invested: sipLumpsum.investedAmount,
          interest: sipLumpsum.estimatedReturns,
          maturity: sipLumpsum.maturityValue,
        },
      },
      monthlyCompare: {
        fd: {
          invested: fdSipEquivalent.investedAmount,
          interest: fdSipEquivalent.estimatedReturns,
          maturity: fdSipEquivalent.maturityValue,
        },
        sip: {
          invested: sipSipEquivalent.investedAmount,
          interest: sipSipEquivalent.estimatedReturns,
          maturity: sipSipEquivalent.maturityValue,
        },
      },
    });
  } catch (error) {
    console.error('runScenarioComparison error:', error);
    res.status(500).json({ message: 'Error calculating comparison scenarios.' });
  }
}

/**
 * Goal Planner endpoint.
 */
export async function createGoal(req, res) {
  const { name, targetAmount, years, rate } = req.body;

  if (!name || !targetAmount || !years) {
    return res.status(400).json({ message: 'Goal name, target amount, and tenure (years) are required.' });
  }

  try {
    const goalData = calculateGoalRequiredSIP(targetAmount, years, rate || 12.0);

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId,
        name,
        targetAmount: parseFloat(targetAmount),
        years: parseFloat(years),
        requiredSip: goalData.requiredSip,
      },
    });

    res.status(201).json({
      message: 'Goal created and saved successfully.',
      goal,
      calculation: goalData,
    });
  } catch (error) {
    console.error('createGoal error:', error);
    res.status(500).json({ message: 'Error creating goal.' });
  }
}

/**
 * Retrieves all saved goals for the user.
 */
export async function getGoals(req, res) {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(goals);
  } catch (error) {
    console.error('getGoals error:', error);
    res.status(500).json({ message: 'Error retrieving goals.' });
  }
}

/**
 * Deletes a goal.
 */
export async function deleteGoal(req, res) {
  const { id } = req.params;

  try {
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found.' });
    }

    if (goal.userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    await prisma.goal.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Goal deleted successfully.' });
  } catch (error) {
    console.error('deleteGoal error:', error);
    res.status(500).json({ message: 'Error deleting goal.' });
  }
}
