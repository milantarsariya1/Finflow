import prisma from '../config/db.js';
import OpenAI from 'openai';

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
  : null;

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

      const balanceAdjustment = type === 'income' ? parsedAmount : -parsedAmount;
      const user = await tx.user.update({
        where: { id: req.userId },
        data: { bankBalance: { increment: balanceAdjustment } },
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
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    if (transaction.userId !== req.userId) return res.status(403).json({ message: 'Unauthorized.' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id } });
      const balanceAdjustment = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      const user = await tx.user.update({
        where: { id: req.userId },
        data: { bankBalance: { increment: balanceAdjustment } },
      });
      return { bankBalance: user.bankBalance };
    });

    res.status(200).json({ message: 'Transaction deleted successfully.', bankBalance: result.bankBalance });
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
    const oldTransaction = await prisma.transaction.findUnique({ where: { id } });
    if (!oldTransaction) return res.status(404).json({ message: 'Transaction not found.' });
    if (oldTransaction.userId !== req.userId) return res.status(403).json({ message: 'Unauthorized.' });

    const result = await prisma.$transaction(async (tx) => {
      const revertAdjustment = oldTransaction.type === 'income' ? -oldTransaction.amount : oldTransaction.amount;
      const applyAdjustment = type === 'income' ? parsedAmount : -parsedAmount;
      const totalAdjustment = revertAdjustment + applyAdjustment;

      const transaction = await tx.transaction.update({
        where: { id },
        data: { type, amount: parsedAmount, category, note: note || '', date: transactionDate },
      });

      const user = await tx.user.update({
        where: { id: req.userId },
        data: { bankBalance: { increment: totalAdjustment } },
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

/**
 * POST /api/transactions/seed
 * Uses Groq AI to generate a realistic month of daily lifestyle transactions
 * and bulk-inserts them. Falls back to a hardcoded set if Groq is unavailable.
 */
export async function seedTransactions(req, res) {
  const today = new Date();
  const dateRange = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const SYSTEM_PROMPT = `You are a financial transaction data generator for an Indian personal finance app.
Generate realistic day-to-day transactions for an Indian software professional over 30 days.
Respond ONLY with a raw JSON object containing a "transactions" array. No markdown, no explanation.`;

  const USER_PROMPT = `Generate 35-45 realistic daily transactions spread across these dates: ${dateRange.join(', ')}.

Return a JSON object: { "transactions": [ ...array of transaction objects... ] }

Each transaction object:
{
  "type": "expense" or "income",
  "amount": <positive number in INR>,
  "category": <one of: Food, Transport, Shopping, Entertainment, Bills, Medical, Education, Others, Salary, Bonus, Investments, Ad-hoc Income>,
  "note": <short realistic description>,
  "date": <one of the provided dates>
}

Rules:
- 85-90% expenses, 10-15% income (freelance, cashback, reimbursements)
- Food: Swiggy, Zomato, chai, snacks, restaurants (80-800)
- Transport: Uber, Ola, metro, auto, fuel (50-600)
- Shopping: Amazon, Flipkart, Myntra, grocery, DMart (200-3000)
- Entertainment: Netflix, movies, weekend outing (150-800)
- Bills: electricity, phone, internet (300-2000)
- Medical: pharmacy, doctor (200-1500)
- Education: Udemy, books, courses (300-2000)
- Others: household, gifts, misc (100-1000)
- Ad-hoc Income: freelance payment, cashback, reimbursement (500-8000)
- Vary amounts — not perfectly round numbers
- Multiple transactions on same day is realistic`;

  const fallbackTransactions = [
    { type: 'expense', amount: 180, category: 'Food', note: 'Lunch at office canteen', date: dateRange[0] },
    { type: 'expense', amount: 350, category: 'Transport', note: 'Uber to office', date: dateRange[1] },
    { type: 'expense', amount: 650, category: 'Shopping', note: 'Amazon grocery order', date: dateRange[2] },
    { type: 'expense', amount: 299, category: 'Entertainment', note: 'Netflix subscription', date: dateRange[3] },
    { type: 'expense', amount: 120, category: 'Food', note: 'Swiggy dinner', date: dateRange[4] },
    { type: 'expense', amount: 85, category: 'Transport', note: 'Metro card recharge', date: dateRange[5] },
    { type: 'income', amount: 3500, category: 'Ad-hoc Income', note: 'Freelance work payment', date: dateRange[6] },
    { type: 'expense', amount: 450, category: 'Bills', note: 'Phone recharge', date: dateRange[7] },
    { type: 'expense', amount: 230, category: 'Food', note: 'Zomato lunch order', date: dateRange[8] },
    { type: 'expense', amount: 1200, category: 'Medical', note: 'Doctor consultation', date: dateRange[9] },
    { type: 'expense', amount: 799, category: 'Education', note: 'Udemy course on sale', date: dateRange[10] },
    { type: 'expense', amount: 540, category: 'Transport', note: 'Ola cab to client site', date: dateRange[11] },
    { type: 'expense', amount: 2200, category: 'Shopping', note: 'Clothing from Myntra', date: dateRange[12] },
    { type: 'expense', amount: 160, category: 'Food', note: 'Evening chai and snacks', date: dateRange[13] },
    { type: 'income', amount: 1200, category: 'Ad-hoc Income', note: 'Amazon cashback credited', date: dateRange[14] },
    { type: 'expense', amount: 320, category: 'Entertainment', note: 'Movie tickets (2)', date: dateRange[15] },
    { type: 'expense', amount: 890, category: 'Bills', note: 'Electricity bill', date: dateRange[16] },
    { type: 'expense', amount: 415, category: 'Food', note: 'Weekend brunch outing', date: dateRange[17] },
    { type: 'expense', amount: 275, category: 'Transport', note: 'Auto + metro commute', date: dateRange[18] },
    { type: 'expense', amount: 600, category: 'Others', note: 'Household items from DMart', date: dateRange[19] },
    { type: 'expense', amount: 145, category: 'Food', note: 'Breakfast at Udupi cafe', date: dateRange[20] },
    { type: 'expense', amount: 499, category: 'Entertainment', note: 'Spotify premium', date: dateRange[21] },
    { type: 'expense', amount: 1800, category: 'Medical', note: 'Pharmacy medicines', date: dateRange[22] },
    { type: 'expense', amount: 380, category: 'Transport', note: 'Fuel for bike', date: dateRange[23] },
    { type: 'income', amount: 5000, category: 'Ad-hoc Income', note: 'Weekend freelance gig', date: dateRange[24] },
    { type: 'expense', amount: 950, category: 'Shopping', note: 'Flipkart electronics', date: dateRange[25] },
    { type: 'expense', amount: 210, category: 'Food', note: 'Zomato weekend order', date: dateRange[26] },
    { type: 'expense', amount: 660, category: 'Bills', note: 'Internet bill', date: dateRange[27] },
    { type: 'expense', amount: 130, category: 'Food', note: 'Chai and samosa break', date: dateRange[28] },
    { type: 'expense', amount: 1500, category: 'Education', note: 'O'Reilly subscription', date: dateRange[29] },
  ];

  let generatedTransactions = fallbackTransactions;

  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT },
        ],
        temperature: 1.0,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices?.[0]?.message?.content;
      if (raw) {
        const parsed = JSON.parse(raw);
        const arr = parsed.transactions || parsed.data || (Array.isArray(parsed) ? parsed : Object.values(parsed)[0]);
        if (Array.isArray(arr) && arr.length > 0) {
          generatedTransactions = arr;
        }
      }
    } catch (err) {
      console.error('Groq seed-transactions error, using fallback:', err.message);
    }
  }

  const VALID_EXPENSE_CATS = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Medical', 'Education', 'Others'];
  const VALID_INCOME_CATS = ['Salary', 'Bonus', 'Investments', 'Ad-hoc Income', 'Others'];

  const clean = generatedTransactions
    .filter(t => t && (t.type === 'expense' || t.type === 'income') && parseFloat(t.amount) > 0 && t.category && t.date)
    .map(t => {
      const validCats = t.type === 'expense' ? VALID_EXPENSE_CATS : VALID_INCOME_CATS;
      const cat = validCats.includes(t.category) ? t.category : (t.type === 'expense' ? 'Others' : 'Ad-hoc Income');
      return {
        userId: req.userId,
        type: t.type,
        amount: parseFloat(t.amount),
        category: cat,
        note: t.note || '',
        date: new Date(t.date),
      };
    });

  if (clean.length === 0) {
    return res.status(500).json({ message: 'Failed to generate valid transactions.' });
  }

  try {
    const balanceDelta = clean.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

    await prisma.$transaction(async (tx) => {
      await tx.transaction.createMany({ data: clean });
      await tx.user.update({
        where: { id: req.userId },
        data: { bankBalance: { increment: balanceDelta } },
      });
    });

    res.status(201).json({ message: `Seeded ${clean.length} transactions successfully.`, count: clean.length });
  } catch (error) {
    console.error('Seed transactions DB error:', error);
    res.status(500).json({ message: 'Error saving seeded transactions.' });
  }
}
