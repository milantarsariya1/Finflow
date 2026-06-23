import prisma from '../config/db.js';

export async function addTransaction(req, res) {
  const { type, amount, category, note, date } = req.body;

  if (!type || !amount || !category) {
    return res.status(400).json({ message: 'Type (income/expense), amount, and category are required.' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ message: "Transaction type must be 'income' or 'expense'." });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const transactionDate = date ? new Date(date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: req.userId,
          type,
          amount: parsedAmount,
          category,
          note: note || '',
          date: transactionDate,
        },
      });

      // 2. Adjust user bank balance
      const balanceAdjustment = type === 'income' ? parsedAmount : -parsedAmount;
      const user = await tx.user.update({
        where: { id: req.userId },
        data: {
          bankBalance: {
            increment: balanceAdjustment,
          },
        },
      });

      return { transaction, bankBalance: user.bankBalance };
    });

    res.status(201).json({
      message: 'Transaction recorded successfully.',
      transaction: result.transaction,
      bankBalance: result.bankBalance,
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Error adding transaction.' });
  }
}

export async function getTransactions(req, res) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
    });

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error retrieving transactions.' });
  }
}

export async function deleteTransaction(req, res) {
  const { id } = req.params;

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (transaction.userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete transaction
      await tx.transaction.delete({
        where: { id },
      });

      // 2. Revert bank balance change
      const balanceAdjustment = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      const user = await tx.user.update({
        where: { id: req.userId },
        data: {
          bankBalance: {
            increment: balanceAdjustment,
          },
        },
      });

      return { bankBalance: user.bankBalance };
    });

    res.status(200).json({
      message: 'Transaction deleted successfully.',
      bankBalance: result.bankBalance,
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Error deleting transaction.' });
  }
}

export async function updateTransaction(req, res) {
  const { id } = req.params;
  const { type, amount, category, note, date } = req.body;

  if (!type || !amount || !category) {
    return res.status(400).json({ message: 'Type (income/expense), amount, and category are required.' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ message: "Transaction type must be 'income' or 'expense'." });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const transactionDate = date ? new Date(date) : new Date();

  try {
    const oldTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!oldTransaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (oldTransaction.userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const revertAdjustment = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
      const applyAdjustment = type === 'income' ? parsedAmount : -parsedAmount;
      const totalAdjustment = revertAdjustment + applyAdjustment;

      const transaction = await tx.transaction.update({
        where: { id },
        data: {
          type,
          amount: parsedAmount,
          category,
          note: note || '',
          date: transactionDate,
        },
      });

      const user = await tx.user.update({
        where: { id: req.userId },
        data: {
          bankBalance: {
            increment: totalAdjustment,
          },
        },
      });

      return { transaction, bankBalance: user.bankBalance };
    });

    res.status(200).json({
      message: 'Transaction updated successfully.',
      transaction: result.transaction,
      bankBalance: result.bankBalance,
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Error updating transaction.' });
  }
}

