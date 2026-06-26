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

  // Persona randomization — unique prompt every call, Groq cache always missed
  const CITIES = ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi', 'Noida', 'Gurgaon'];
  const PROFESSIONS = [
    'backend engineer at a startup',
    'frontend developer at a SaaS company',
    'data analyst at a fintech firm',
    'product manager at an e-commerce company',
    'DevOps engineer at an IT services company',
    'mobile app developer working remotely',
    'ML engineer at an AI startup',
    'UX designer at a digital agency',
    'QA engineer at a mid-size software firm',
    'tech lead at a product company',
  ];
  const LIFESTYLES = [
    'who orders food delivery often and shops online regularly',
    'who cooks at home mostly but splurges on gadgets and clothing',
    'who commutes by metro and spends on entertainment and streaming',
    'who rides a bike to work and invests in online courses',
    'who takes cabs daily and enjoys dining out on weekends',
    'who works from home and relies heavily on delivery apps',
    'who has a car and prefers malls and weekend trips over ordering in',
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const count = 35 + Math.floor(Math.random() * 11);

  const city = pick(CITIES);
  const profession = pick(PROFESSIONS);
  const lifestyle = pick(LIFESTYLES);

  const systemPrompt =
    'You are a financial transaction data generator for an Indian personal finance app. ' +
    'Generate completely unique, realistic, varied transactions on every call. ' +
    'Respond ONLY with a raw JSON object: { "transactions": [ ...array... ] }. No markdown.';

  const userPrompt =
    '[ID:' + nonce + '] Generate exactly ' + count + ' realistic daily transactions ' +
    'for a ' + profession + ' in ' + city + ' ' + lifestyle + '.\n\n' +
    'Dates: ' + dateRange.join(', ') + '\n\n' +
    'Format: {"transactions":[{"type":"expense"|"income","amount":<INR>,' +
    '"category":"Food|Transport|Shopping|Entertainment|Bills|Medical|Education|Others|Ad-hoc Income",' +
    '"note":"<specific place/app name>","date":"<one of the dates above>"}]}\n\n' +
    'Rules for ' + city + ' ' + profession + ':\n' +
    '- 85% expenses, 15% income (freelance, cashback, reimbursement)\n' +
    '- Food: name specific apps/restaurants for ' + city + ' (Swiggy, Zomato, local places) 80-800\n' +
    '- Transport: Uber/Ola/Rapido/metro/bus/petrol 50-600\n' +
    '- Shopping: Amazon/Flipkart/Myntra/Blinkit/Zepto 150-3500\n' +
    '- Entertainment: BookMyShow/Netflix/Spotify/weekend trip 99-900\n' +
    '- Bills: phone/electricity/broadband 200-2000\n' +
    '- Medical: pharmacy/clinic/lab 150-2000\n' +
    '- Education: Udemy/Coursera/books 200-2500\n' +
    '- Others: laundry/haircut/gift/household 80-800\n' +
    '- Income: freelance/cashback/reimbursement 500-8000\n' +
    '- Notes must be specific: e.g. "Swiggy - Chicken Biryani from Box8", "Uber to Whitefield office"\n' +
    '- Amounts must NOT be round numbers\n' +
    '- Distribute unevenly: some days 3-4 transactions, some days 1';

  // Minimal math-based fallback — no stored data
  const EXPENSE_CATS = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Medical', 'Education', 'Others'];
  const fallbackTransactions = dateRange.slice(0, 20).flatMap((date, i) => {
    const entries = [];
    const numTx = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numTx; j++) {
      const cat = EXPENSE_CATS[Math.floor(Math.random() * EXPENSE_CATS.length)];
      entries.push({
        type: 'expense',
        amount: 100 + Math.floor(Math.random() * 1900),
        category: cat,
        note: cat + ' expense',
        date,
      });
    }
    if (i === 5 || i === 15) {
      entries.push({ type: 'income', amount: 1000 + Math.floor(Math.random() * 5000), category: 'Ad-hoc Income', note: 'Freelance payment', date });
    }
    return entries;
  });

  let generatedTransactions = fallbackTransactions;

  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.1,
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
    res.status(201).json({ message: 'Seeded ' + clean.length + ' transactions successfully.', count: clean.length });
  } catch (error) {
    console.error('Seed transactions DB error:', error);
    res.status(500).json({ message: 'Error saving seeded transactions.' });
  }
}
