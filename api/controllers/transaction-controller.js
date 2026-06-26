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

  // Random persona arrays — forces unique output every call
  const CITIES = ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi', 'Noida', 'Gurgaon'];
  const PROFESSIONS = [
    'backend engineer at a startup',
    'frontend developer at a mid-size SaaS company',
    'data analyst at a fintech firm',
    'product manager at an e-commerce company',
    'DevOps engineer at an IT services company',
    'mobile app developer working remotely',
    'ML engineer at an AI startup',
    'UX designer at a digital agency',
  ];
  const LIFESTYLES = [
    'who goes out for lunch often and orders food delivery on weekends',
    'who mostly cooks at home but splurges on gadgets and online shopping',
    'who commutes by metro and spends heavily on entertainment and streaming',
    'who rides a bike to work and prefers budget dining but invests in online courses',
    'who takes cabs daily and enjoys weekend brunches and movies',
    'who works from home, orders food delivery daily, and buys a lot from Amazon',
  ];

  const randomCity       = CITIES[Math.floor(Math.random() * CITIES.length)];
  const randomProfession = PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
  const randomLifestyle  = LIFESTYLES[Math.floor(Math.random() * LIFESTYLES.length)];
  const randomCount      = 35 + Math.floor(Math.random() * 11); // 35-45
  const nonce            = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const SYSTEM_PROMPT =
    'You are a financial transaction data generator for an Indian personal finance app. ' +
    'Each call must produce completely different, unique, varied transactions. ' +
    'Respond ONLY with a raw JSON object containing a "transactions" array. No markdown, no explanation.';

  const USER_PROMPT =
    `[Request-ID: ${nonce}] Generate exactly ${randomCount} realistic daily transactions ` +
    `for a ${randomProfession} living in ${randomCity} ${randomLifestyle}.\n\n` +
    `Spread across these dates: ${dateRange.join(', ')}\n\n` +
    `Return: { "transactions": [ { "type": "expense"|"income", "amount": <INR number>, ` +
    `"category": <one of Food/Transport/Shopping/Entertainment/Bills/Medical/Education/Others/Ad-hoc Income>, ` +
    `"note": <specific realistic description with app or place name>, "date": <one of the dates above> }, ... ] }\n\n` +
    `Profile for ${randomCity} ${randomProfession}:\n` +
    `- 85% expenses, 15% income (freelance, cashback, reimbursement)\n` +
    `- Food: Swiggy, Zomato, Dominos, local cafe, office canteen (80-800)\n` +
    `- Transport: Uber, Ola, Rapido, metro, bus, petrol (50-600)\n` +
    `- Shopping: Amazon, Flipkart, Myntra, Blinkit, Zepto, BigBasket (150-3500)\n` +
    `- Entertainment: BookMyShow, Netflix, Spotify, weekend outing (99-900)\n` +
    `- Bills: phone recharge, electricity, broadband (200-2000)\n` +
    `- Medical: Apollo pharmacy, clinic, lab test (150-2000)\n` +
    `- Education: Udemy, Coursera, tech books (200-2500)\n` +
    `- Others: laundry, haircut, gift, stationery (80-800)\n` +
    `- Ad-hoc Income: freelance gig, referral bonus, cashback (500-8000)\n` +
    `- Notes must be specific: e.g. "Swiggy - Biryani from Paradise", "Uber to Koramangala office"\n` +
    `- Vary amounts — avoid perfectly round numbers like 500, 1000\n` +
    `- Some days have 3-4 transactions, some days only 1 — be realistic`;

  const fallbackSets = [
    [
      { type: 'expense', amount: 183, category: 'Food', note: 'Swiggy - Butter Chicken from Behrouz', date: dateRange[0] },
      { type: 'expense', amount: 347, category: 'Transport', note: 'Uber to Whitefield office', date: dateRange[1] },
      { type: 'expense', amount: 1249, category: 'Shopping', note: 'Amazon - Laptop stand + USB hub', date: dateRange[2] },
      { type: 'expense', amount: 299, category: 'Entertainment', note: 'Netflix monthly plan', date: dateRange[3] },
      { type: 'expense', amount: 127, category: 'Food', note: 'Zomato - Veg Thali lunch', date: dateRange[4] },
      { type: 'expense', amount: 89, category: 'Transport', note: 'Metro card top-up', date: dateRange[5] },
      { type: 'income', amount: 4500, category: 'Ad-hoc Income', note: 'Weekend freelance API project', date: dateRange[6] },
      { type: 'expense', amount: 455, category: 'Bills', note: 'Airtel postpaid bill', date: dateRange[7] },
      { type: 'expense', amount: 212, category: 'Food', note: 'Dominos - Medium pizza combo', date: dateRange[8] },
      { type: 'expense', amount: 1150, category: 'Medical', note: 'Apollo Pharmacy - BP medicines', date: dateRange[9] },
      { type: 'expense', amount: 799, category: 'Education', note: 'Udemy - React Native course', date: dateRange[10] },
      { type: 'expense', amount: 523, category: 'Transport', note: 'Ola cab to airport drop', date: dateRange[11] },
      { type: 'expense', amount: 2199, category: 'Shopping', note: 'Myntra - 2 shirts + chinos', date: dateRange[12] },
      { type: 'expense', amount: 165, category: 'Food', note: 'Evening chai and samosa - office canteen', date: dateRange[13] },
      { type: 'income', amount: 1280, category: 'Ad-hoc Income', note: 'Flipkart SuperCoin cashback', date: dateRange[14] },
      { type: 'expense', amount: 318, category: 'Entertainment', note: 'BookMyShow - 2 tickets Kalki 2898', date: dateRange[15] },
      { type: 'expense', amount: 867, category: 'Bills', note: 'BESCOM electricity bill', date: dateRange[16] },
      { type: 'expense', amount: 423, category: 'Food', note: 'Weekend brunch at Third Wave Coffee', date: dateRange[17] },
      { type: 'expense', amount: 278, category: 'Transport', note: 'Rapido bike + metro - daily commute', date: dateRange[18] },
      { type: 'expense', amount: 612, category: 'Others', note: 'DMart monthly household shopping', date: dateRange[19] },
      { type: 'expense', amount: 142, category: 'Food', note: 'Breakfast at Udupi Darshini', date: dateRange[20] },
      { type: 'expense', amount: 499, category: 'Entertainment', note: 'Spotify Premium 3-month plan', date: dateRange[21] },
      { type: 'expense', amount: 1750, category: 'Medical', note: 'Thyrocare full body checkup', date: dateRange[22] },
      { type: 'expense', amount: 383, category: 'Transport', note: 'Petrol top-up - Reliance petrol pump', date: dateRange[23] },
      { type: 'income', amount: 6200, category: 'Ad-hoc Income', note: 'Saturday freelance design sprint', date: dateRange[24] },
      { type: 'expense', amount: 947, category: 'Shopping', note: 'Blinkit - Grocery + snacks weekly order', date: dateRange[25] },
      { type: 'expense', amount: 218, category: 'Food', note: 'Zomato - Shawarma + fries Friday dinner', date: dateRange[26] },
      { type: 'expense', amount: 649, category: 'Bills', note: 'ACT Fibernet broadband bill', date: dateRange[27] },
      { type: 'expense', amount: 135, category: 'Food', note: 'Morning chai + biscuits at Cafe Coffee Day', date: dateRange[28] },
      { type: 'expense', amount: 1499, category: 'Education', note: 'Coursera - ML specialization month', date: dateRange[29] },
    ],
    [
      { type: 'expense', amount: 267, category: 'Food', note: 'Zomato - Paneer butter masala + naan', date: dateRange[0] },
      { type: 'expense', amount: 189, category: 'Transport', note: 'Uber Pool to office', date: dateRange[1] },
      { type: 'expense', amount: 3499, category: 'Shopping', note: 'Amazon - Mechanical keyboard', date: dateRange[2] },
      { type: 'expense', amount: 149, category: 'Entertainment', note: 'YouTube Premium monthly', date: dateRange[3] },
      { type: 'expense', amount: 95, category: 'Food', note: 'Swiggy Instamart - quick snacks', date: dateRange[4] },
      { type: 'income', amount: 2800, category: 'Ad-hoc Income', note: 'Company reimbursement - internet bill', date: dateRange[5] },
      { type: 'expense', amount: 731, category: 'Shopping', note: 'BigBasket monthly grocery', date: dateRange[6] },
      { type: 'expense', amount: 398, category: 'Bills', note: 'Vi mobile prepaid recharge', date: dateRange[7] },
      { type: 'expense', amount: 198, category: 'Food', note: 'KFC - Bucket meal lunch', date: dateRange[8] },
      { type: 'expense', amount: 650, category: 'Medical', note: 'MedPlus pharmacy - vitamins and supplements', date: dateRange[9] },
      { type: 'expense', amount: 1299, category: 'Education', note: 'O Reilly Learning Platform month', date: dateRange[10] },
      { type: 'expense', amount: 412, category: 'Transport', note: 'Ola auto to railway station', date: dateRange[11] },
      { type: 'expense', amount: 1875, category: 'Shopping', note: 'Flipkart - Running shoes', date: dateRange[12] },
      { type: 'expense', amount: 243, category: 'Food', note: 'Swiggy - Biriyani special weekend order', date: dateRange[13] },
      { type: 'income', amount: 750, category: 'Ad-hoc Income', note: 'PhonePe cashback on bill payment', date: dateRange[14] },
      { type: 'expense', amount: 562, category: 'Entertainment', note: 'Lenskart - Sunglasses', date: dateRange[15] },
      { type: 'expense', amount: 1124, category: 'Bills', note: 'TPDDL electricity quarterly bill', date: dateRange[16] },
      { type: 'expense', amount: 378, category: 'Food', note: 'Lunch at Farzi Cafe with team', date: dateRange[17] },
      { type: 'expense', amount: 145, category: 'Transport', note: 'DTC bus pass weekly', date: dateRange[18] },
      { type: 'expense', amount: 489, category: 'Others', note: 'Barbershop + grooming products', date: dateRange[19] },
      { type: 'expense', amount: 176, category: 'Food', note: 'McDonald breakfast combo', date: dateRange[20] },
      { type: 'expense', amount: 779, category: 'Entertainment', note: 'INOX movie - weekend outing', date: dateRange[21] },
      { type: 'expense', amount: 920, category: 'Medical', note: 'Dental clinic checkup', date: dateRange[22] },
      { type: 'expense', amount: 267, category: 'Transport', note: 'Uber XL - office team outing', date: dateRange[23] },
      { type: 'income', amount: 3500, category: 'Ad-hoc Income', note: 'Referral bonus - HDFC credit card', date: dateRange[24] },
      { type: 'expense', amount: 1647, category: 'Shopping', note: 'Zepto - Household + dairy weekly stock', date: dateRange[25] },
      { type: 'expense', amount: 334, category: 'Food', note: 'Swiggy Genie - food from local restaurant', date: dateRange[26] },
      { type: 'expense', amount: 899, category: 'Bills', note: 'Jio Fiber monthly plan', date: dateRange[27] },
      { type: 'expense', amount: 112, category: 'Food', note: 'Tea and snacks - office vending machine', date: dateRange[28] },
      { type: 'expense', amount: 699, category: 'Shopping', note: 'Ajio - casual t-shirts 3-pack', date: dateRange[29] },
    ],
  ];

  // Pick a random fallback set so even offline mode varies
  const fallbackTransactions = fallbackSets[Math.floor(Math.random() * fallbackSets.length)];
  let generatedTransactions = fallbackTransactions;

  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT },
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

    res.status(201).json({ message: `Seeded ${clean.length} transactions successfully.`, count: clean.length });
  } catch (error) {
    console.error('Seed transactions DB error:', error);
    res.status(500).json({ message: 'Error saving seeded transactions.' });
  }
}
