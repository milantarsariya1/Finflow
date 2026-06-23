import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        bankBalance: user.bankBalance,
        savings: user.savings,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Something went wrong during signup.' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        monthlyIncome: user.monthlyIncome,
        bankBalance: user.bankBalance,
        savings: user.savings,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong during login.' });
  }
}

export async function getMe(req, res) {
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

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      monthlyIncome: user.monthlyIncome,
      bankBalance: user.bankBalance,
      savings: user.savings,
      fixedExpenses: user.fixedExpenses,
      securityQuestion: user.securityQuestion,
      securityAnswer: user.securityAnswer,
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'Error retrieving user details.' });
  }
}

export async function onboarding(req, res) {
  const { monthlyIncome, bankBalance, savings, fixedExpenses } = req.body;

  // Validate numeric types
  if (
    monthlyIncome === undefined || 
    bankBalance === undefined || 
    isNaN(Number(monthlyIncome)) || 
    isNaN(Number(bankBalance))
  ) {
    return res.status(400).json({ message: 'Income and current bank balance are required and must be numeric.' });
  }

  const incomeVal = parseFloat(monthlyIncome);
  const balanceVal = parseFloat(bankBalance);
  const savingsVal = savings !== undefined ? parseFloat(savings) : 0;

  try {
    // Perform database updates as a transaction to ensure integrity
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update user metrics
      const user = await tx.user.update({
        where: { id: req.userId },
        data: {
          monthlyIncome: incomeVal,
          bankBalance: balanceVal,
          savings: savingsVal,
        },
      });

      // 2. Remove existing fixed expenses
      await tx.fixedExpense.deleteMany({
        where: { userId: req.userId },
      });

      // 3. Create new fixed expenses if provided
      if (fixedExpenses && Array.isArray(fixedExpenses)) {
        const createData = fixedExpenses
          .filter(e => e.name && !isNaN(Number(e.amount)))
          .map(e => ({
            userId: req.userId,
            name: e.name,
            amount: parseFloat(e.amount),
          }));

        if (createData.length > 0) {
          await tx.fixedExpense.createMany({
            data: createData,
          });
        }
      }

      return await tx.user.findUnique({
        where: { id: req.userId },
        include: {
          fixedExpenses: true,
        },
      });
    });

    res.status(200).json({
      message: 'Onboarding completed successfully.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        monthlyIncome: updatedUser.monthlyIncome,
        bankBalance: updatedUser.bankBalance,
        savings: updatedUser.savings,
        fixedExpenses: updatedUser.fixedExpenses,
      },
    });
  } catch (error) {
    console.error('Onboarding transaction error:', error);
    res.status(500).json({ message: 'Error completing onboarding process.' });
  }
}

export async function updateProfile(req, res) {
  const { name, email, monthlyIncome, bankBalance, savings, fixedExpenses } = req.body;

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) {
        const existingEmailUser = await tx.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (existingEmailUser && existingEmailUser.id !== req.userId) {
          throw new Error('Email is already taken.');
        }
        updateData.email = email.toLowerCase();
      }
      if (monthlyIncome !== undefined) {
        if (isNaN(Number(monthlyIncome)) || Number(monthlyIncome) < 0) {
          throw new Error('Monthly income must be a valid positive number.');
        }
        updateData.monthlyIncome = parseFloat(monthlyIncome);
      }
      if (bankBalance !== undefined) {
        if (isNaN(Number(bankBalance)) || Number(bankBalance) < 0) {
          throw new Error('Bank balance must be a valid positive number.');
        }
        updateData.bankBalance = parseFloat(bankBalance);
      }
      if (savings !== undefined) {
        if (isNaN(Number(savings)) || Number(savings) < 0) {
          throw new Error('Savings must be a valid positive number.');
        }
        updateData.savings = parseFloat(savings);
      }
      
      if (req.body.securityQuestion !== undefined) {
        updateData.securityQuestion = req.body.securityQuestion;
      }
      if (req.body.securityAnswer !== undefined) {
        updateData.securityAnswer = req.body.securityAnswer;
      }

      await tx.user.update({
        where: { id: req.userId },
        data: updateData,
      });

      if (fixedExpenses !== undefined && Array.isArray(fixedExpenses)) {
        await tx.fixedExpense.deleteMany({
          where: { userId: req.userId },
        });

        const createData = fixedExpenses
          .filter(e => e.name && !isNaN(Number(e.amount)))
          .map(e => ({
            userId: req.userId,
            name: e.name,
            amount: parseFloat(e.amount),
          }));

        if (createData.length > 0) {
          await tx.fixedExpense.createMany({
            data: createData,
          });
        }
      }

      return await tx.user.findUnique({
        where: { id: req.userId },
        include: {
          fixedExpenses: true,
        },
      });
    });

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        monthlyIncome: updatedUser.monthlyIncome,
        bankBalance: updatedUser.bankBalance,
        savings: updatedUser.savings,
        fixedExpenses: updatedUser.fixedExpenses,
        securityQuestion: updatedUser.securityQuestion,
        securityAnswer: updatedUser.securityAnswer,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: error.message || 'Error updating profile details.' });
  }
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid current password.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash: newPasswordHash }
    });

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password.' });
  }
}

export async function getSecurityQuestion(req, res) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email query parameter is required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(404).json({ message: 'User with this email was not found.' });
    }

    res.status(200).json({ securityQuestion: user.securityQuestion });
  } catch (error) {
    console.error('Get security question error:', error);
    res.status(500).json({ message: 'Error retrieving security question.' });
  }
}

export async function resetPassword(req, res) {
  const { email, securityAnswer, newPassword } = req.body;

  if (!email || !securityAnswer || !newPassword) {
    return res.status(400).json({ message: 'Email, security answer, and new password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isAnswerCorrect = user.securityAnswer.toLowerCase().trim() === securityAnswer.toLowerCase().trim();
    if (!isAnswerCorrect) {
      return res.status(400).json({ message: 'Incorrect security answer.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    res.status(200).json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password.' });
  }
}

