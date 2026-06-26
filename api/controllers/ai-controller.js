import OpenAI from 'openai';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
let openai = null;

if (GROQ_API_KEY) {
  openai = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

// Model specification
const MODEL_NAME = 'llama3-8b-8192';

/**
 * Format values to Indian Currency representation
 */
function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN');
}

/**
 * Helper to query Groq and return parsed JSON.
 * Falls back to local prompt generation if Groq fails or is not configured.
 */
async function queryGroq(systemPrompt, userPrompt, fallbackFunction) {
  if (!openai) {
    console.log('Groq API Key not found. Using fallback math-advisor explanations.');
    return fallbackFunction();
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Groq API call error:', error);
    return fallbackFunction();
  }
}

/**
 * POST /api/ai/monthly-insight
 */
export async function getMonthlyInsight(req, res) {
  const { transactions = [], monthlyIncome = 0, totalFixed = 0, surplus = 0 } = req.body;

  const systemPrompt = `You are a warm, educational personal finance advisor. You analyze the user's monthly income, fixed costs, recent transactions, and calculated monthly surplus. 
Provide a concise, friendly summary paragraph explaining their current financial posture and 3 personalized, actionable savings tips.
You MUST respond with a strict, valid JSON object containing exactly two keys: "summary" and "tips".
Format:
{
  "summary": "Your customized summary text goes here...",
  "tips": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ]
}
Do not include any Markdown, code blocks, or explanations outside the JSON object. All currency references must be in Indian Rupees (e.g. ₹10,000).`;

  const userPrompt = `Monthly Income: ${formatINR(monthlyIncome)}
Total Fixed Costs: ${formatINR(totalFixed)}
Calculated Variable Surplus: ${formatINR(surplus)}
Transactions: ${JSON.stringify(transactions.slice(0, 10))}`;

  const fallback = () => {
    const savingsRate = monthlyIncome > 0 ? ((surplus / monthlyIncome) * 100).toFixed(1) : 0;
    let summary = `You have a monthly surplus of ${formatINR(surplus)} after meeting fixed costs and variable expenses. This represents a savings rate of ${savingsRate}% of your monthly income. `;
    const tips = [];

    if (surplus <= 0) {
      summary += `Currently, your expenses are equal to or exceed your income. Focusing on reducing variable spend and reviewing fixed expenses is highly recommended.`;
      tips.push('Review your subscription list and cancel any services not used in the last 30 days.');
      tips.push('Set a strict weekly limit for dining out or ordering delivery to recover some variable surplus.');
      tips.push('Audit your fixed monthly costs—negotiate internet bills, insurance rates, or electricity usage.');
    } else {
      summary += `You have active investable surplus. Your immediate priority should be safeguarding this money and channeling it toward an emergency reserve or inflation-beating assets.`;
      tips.push(`Automate the transfer of ${formatINR(surplus * 0.5)} (50% of your surplus) to a separate savings account on payday.`);
      tips.push('Track category-specific expenditures for a month to detect hidden budget leaks.');
      tips.push('Consider starting a small monthly Mutual Fund SIP to build long-term capital while leveraging compounding.');
    }

    return { summary, tips };
  };

  try {
    const result = await queryGroq(systemPrompt, userPrompt, fallback);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error generating monthly insights' });
  }
}

/**
 * POST /api/ai/affordability
 */
export async function checkAffordability(req, res) {
  const { question, surplus = 0, balance = 0, fixedCosts = 0, savings = 0 } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'Question is required.' });
  }

  const systemPrompt = `You are a warm, educational personal finance advisor. The user is asking whether they can afford a purchase. 
Analyze their question, monthly surplus, bank balance, fixed costs, and current savings.
Classify the purchase into one of three verdicts:
- "AFFORDABLE": The user has comfortable cash buffer and strong monthly surplus.
- "STRETCH": The user can afford it, but it will consume a large part of their balance or monthly surplus, leaving little buffer.
- "UNAFFORDABLE": The purchase compromises their emergency buffer or exceeds their financial capacity.
Provide a clear "verdict" and a friendly "reasoning" paragraph explaining the decision in relatable, supportive terms.
You MUST respond with a strict, valid JSON object containing exactly two keys: "verdict" and "reasoning".
Format:
{
  "verdict": "AFFORDABLE" | "STRETCH" | "UNAFFORDABLE",
  "reasoning": "Detailed, encouraging reasoning..."
}
Do not include any Markdown or formatting outside the JSON object. Keep currency formatting in Indian Rupees (₹).`;

  const userPrompt = `Question: "${question}"
Current Bank Balance: ${formatINR(balance)}
Monthly Surplus: ${formatINR(surplus)}
Total Fixed Costs: ${formatINR(fixedCosts)}
Existing Savings: ${formatINR(savings)}`;

  const fallback = () => {
    // Extract numerical values if they are mentioned in the question as a simple parser fallback
    const matches = question.replace(/,/g, '').match(/\d+/);
    const estimatedCost = matches ? parseInt(matches[0], 10) : 10000;

    let verdict = 'STRETCH';
    let reasoning = '';

    if (estimatedCost > balance + savings) {
      verdict = 'UNAFFORDABLE';
      reasoning = `This purchase of ${formatINR(estimatedCost)} exceeds your combined bank balance and savings of ${formatINR(balance + savings)}. Making this purchase would require taking on debt or completely depleting your capital. We strongly advise pausing and saving up a dedicated bucket first.`;
    } else if (estimatedCost > balance && estimatedCost <= balance + savings) {
      verdict = 'STRETCH';
      reasoning = `While you have the total funds available between your bank balance and savings, spending ${formatINR(estimatedCost)} would deplete your liquid cash and dip into your savings. It is a stretch because it reduces your financial safety net.`;
    } else {
      // cost is within bank balance
      const recommendedBuffer = fixedCosts * 3;
      if (balance - estimatedCost < recommendedBuffer) {
        verdict = 'STRETCH';
        reasoning = `You have enough cash in the bank to purchase this. However, doing so will leave you with less than a 3-month buffer of fixed costs (${formatINR(recommendedBuffer)}). It's a stretch because it leaves you vulnerable to unexpected expenses.`;
      } else {
        verdict = 'AFFORDABLE';
        reasoning = `Great news! Your liquid balance of ${formatINR(balance)} can comfortably absorb the purchase of ${formatINR(estimatedCost)} while keeping a secure cash cushion of over ${formatINR(recommendedBuffer)} for your fixed commitments. Your monthly surplus of ${formatINR(surplus)} also provides high resilience.`;
      }
    }

    return { verdict, reasoning };
  };

  try {
    const result = await queryGroq(systemPrompt, userPrompt, fallback);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error checking affordability' });
  }
}

/**
 * POST /api/ai/advisor
 */
export async function getGeneralAdvisor(req, res) {
  const { surplus = 0, balance = 0, savings = 0, emergencyStatus = {}, fdResult = null, sipResult = null } = req.body;

  const systemPrompt = `You are a warm, educational financial advisor. You will evaluate the user's complete financial picture (surplus, balance, savings, emergency fund, and calculation examples).
Write a welcoming, holistic overview ("advice") and a checklist of 3-4 prioritized action steps ("prioritizedSteps").
Do not perform mathematical calculations. Use the exact figures provided to frame the milestones.
You MUST respond with a strict, valid JSON object containing exactly two keys: "advice" and "prioritizedSteps".
Format:
{
  "advice": "Friendly, encouraging summary of what they should focus on...",
  "prioritizedSteps": [
    "Step 1...",
    "Step 2...",
    "Step 3..."
  ]
}
Do not include any Markdown or formatting outside the JSON object. Keep currency formatting in Indian Rupees (₹).`;

  const userPrompt = `Real Surplus: ${formatINR(surplus)}
Bank Balance: ${formatINR(balance)}
Savings: ${formatINR(savings)}
Emergency Status: ${JSON.stringify(emergencyStatus)}
FD Example: ${JSON.stringify(fdResult)}
SIP Example: ${JSON.stringify(sipResult)}`;

  const fallback = () => {
    let advice = `Based on your overall financial health, your liquid balance is ${formatINR(balance)} and you have a monthly surplus of ${formatINR(surplus)}. `;
    const prioritizedSteps = [];

    if (emergencyStatus && !emergencyStatus.isAdequate) {
      advice += `Your primary focus should be building your emergency fund. You are currently ${formatINR(emergencyStatus.gap)} short of the recommended 6-month buffer of ${formatINR(emergencyStatus.recommended)}.`;
      prioritizedSteps.push(`Redirect your monthly surplus of ${formatINR(surplus)} to fill the emergency gap of ${formatINR(emergencyStatus.gap)}.`);
      prioritizedSteps.push(`Keep your savings in high-yield liquid accounts before locking them into long-term investments.`);
      prioritizedSteps.push(`Avoid any major discretionary expenses until you have at least 3 months of fixed costs secured.`);
    } else {
      advice += `Your emergency fund is adequately funded! This is a massive milestone that gives you the peace of mind to invest for growth. Your surplus of ${formatINR(surplus)} can now be safely allocated to compound.`;
      prioritizedSteps.push(`Set up an automated monthly Mutual Fund SIP of ${formatINR(surplus * 0.4)} (40% of surplus) for long-term wealth creation.`);
      prioritizedSteps.push(`Lock a portion of your bank balance (suggested ${formatINR(Math.max(0, balance - (emergencyStatus.totalFixed * 2)))}) in a Fixed Deposit for guaranteed, risk-free returns.`);
      prioritizedSteps.push(`Review your long-term goals and map out their timelines in the Goal Planner.`);
    }

    return { advice, prioritizedSteps };
  };

  try {
    const result = await queryGroq(systemPrompt, userPrompt, fallback);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error generating advisor recommendations' });
  }
}

/**
 * POST /api/ai/explain-result
 */
export async function getExplainResult(req, res) {
  const { type, numbers = {}, userContext = {} } = req.body;

  if (!type || !numbers) {
    return res.status(400).json({ message: 'Type and numbers are required.' });
  }

  const systemPrompt = `You are a warm, educational financial advisor. You will explain a computed financial result (e.g., FD interest, SIP maturity, Goal deficit, or Emergency gap) to a user in friendly, relatable, and encouraging terms.
CRITICAL: Do NOT do any math yourself. The numbers provided are exact. 
Translate the final numbers into tangible real-world milestones (e.g. "This ₹18,000 interest return covers about one month of your fixed expenses" or "Your SIP of ₹5,000/month could fund your emergency buffer in ~2 years").
You MUST respond with a strict, valid JSON object containing exactly one key: "commentary".
Format:
{
  "commentary": "Your highly relatable, warm explanation here..."
}
Do not include any Markdown or formatting outside the JSON object. Keep currency formatting in Indian Rupees (₹).`;

  const userPrompt = `Calculation Type: "${type}"
Numbers Computed: ${JSON.stringify(numbers)}
User context: Fixed monthly commitments: ${formatINR(userContext.fixedExpenses || 0)}, Monthly Surplus: ${formatINR(userContext.surplus || 0)}`;

  const fallback = () => {
    let commentary = '';
    const surplusVal = userContext.surplus || 0;
    const fixedExpensesVal = userContext.fixedExpenses || 0;

    if (type === 'emergency') {
      const gap = numbers.gap || 0;
      const rec = numbers.recommended || 0;
      if (gap > 0) {
        const timeToBuild = surplusVal > 0 ? (gap / surplusVal).toFixed(1) : 'some';
        commentary = `You are short of your recommended safety net of ${formatINR(rec)} by ${formatINR(gap)}. By dedicating your monthly surplus of ${formatINR(surplusVal)} to this goal, you will fully fund this vital cushion in about ${timeToBuild} months. This is your foundation of financial safety!`;
      } else {
        commentary = `Incredible! Your savings of ${formatINR(numbers.currentSavings)} cover your 6-month safety net of ${formatINR(rec)} with room to spare. This safety net provides robust peace of mind, freeing you up to invest for wealth creation without worry.`;
      }
    } else if (type === 'fd') {
      const interest = numbers.interestEarned || 0;
      const maturity = numbers.maturityValue || 0;
      const sugg = numbers.suggestedFD || 0;
      const monthlyEquiv = fixedExpensesVal > 0 ? (interest / fixedExpensesVal).toFixed(1) : 0;

      commentary = `By locking in this FD, you'll earn a risk-free interest of ${formatINR(interest)}, bringing your final maturity to ${formatINR(maturity)}. To put it in perspective, this interest returns represents about ${monthlyEquiv} months of your monthly fixed costs. Also, by following the suggestion of locking ${formatINR(sugg)}, you keep enough liquid money to handle emergencies!`;
    } else if (type === 'sip') {
      const returns = numbers.estimatedReturns || 0;
      const maturity = numbers.maturityValue || 0;
      const invested = numbers.investedAmount || 0;
      const years = numbers.years || 0;
      const monthlySip = numbers.monthlyAmount || 0;

      commentary = `Investing ${formatINR(monthlySip)} monthly for ${years} years will build a projected wealth corpus of ${formatINR(maturity)}. You will have put in ${formatINR(invested)}, generating an estimated return of ${formatINR(returns)} in growth. This return has the potential to outpace inflation and could serve as a solid down payment on a house or seed money for future ventures!`;
    } else if (type === 'goal') {
      const required = numbers.requiredSip || 0;
      const target = numbers.targetAmount || 0;
      const years = numbers.years || 0;

      if (surplusVal >= required) {
        commentary = `To reach your goal of ${formatINR(target)} in ${years} years, you need to invest ${formatINR(required)} monthly. Since your monthly surplus is ${formatINR(surplusVal)}, this goal is highly realistic and fits perfectly within your budget. Go ahead and start your automated SIP!`;
      } else {
        const gap = required - surplusVal;
        commentary = `To accumulate ${formatINR(target)} in ${years} years, a monthly SIP of ${formatINR(required)} is needed. Currently, your monthly surplus of ${formatINR(surplusVal)} leaves a shortfall of ${formatINR(gap)} per month. You can easily close this gap by extending your timeline slightly, increasing your income, or trimming variable expenditures.`;
      }
    } else {
      commentary = `This financial strategy represents an important step in taking control of your financial destiny. Emphasizing compounding early is the key to building durable, long-term wealth.`;
    }

    return { commentary };
  };

  try {
    const result = await queryGroq(systemPrompt, userPrompt, fallback);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error generating calculation explanation' });
  }
}

/**
 * POST /api/ai/seed-data
 * Generates a realistic Indian financial profile to auto-fill the onboarding form.
 * Uses the server-side GROQ_API_KEY — no key required from the user.
 * Fully randomized per call to prevent Groq cache hits.
 */
export async function getSeedData(req, res) {
  // Random persona pools
  const CITIES = ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi', 'Noida', 'Gurgaon'];
  const PROFESSIONS = [
    'mid-level backend engineer at a product startup',
    'senior frontend developer at a SaaS company',
    'data analyst at a fintech firm',
    'product manager at an e-commerce company',
    'DevOps engineer at an IT services firm',
    'mobile app developer working remotely',
    'ML engineer at an AI startup',
    'UX designer at a digital agency',
    'junior software developer at a service company',
    'tech lead at a mid-size software firm',
  ];
  const EXPERIENCE = ['2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years'];
  const LIVING = [
    'living alone in a rented apartment',
    'sharing a 2BHK with one flatmate',
    'living with family (no rent)',
    'living in a company-provided PG accommodation',
    'owning a flat with a home loan EMI',
  ];

  const randomCity       = CITIES[Math.floor(Math.random() * CITIES.length)];
  const randomProfession = PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
  const randomExp        = EXPERIENCE[Math.floor(Math.random() * EXPERIENCE.length)];
  const randomLiving     = LIVING[Math.floor(Math.random() * LIVING.length)];
  const nonce            = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Distinct fallback profiles — randomly selected so offline mode also varies
  const FALLBACK_PROFILES = [
    {
      monthlyIncome: 72000,
      bankBalance: 185000,
      savings: 95000,
      fixedExpenses: [
        { name: 'Rent', amount: 18000 },
        { name: 'Home Loan EMI', amount: 12500 },
        { name: 'Health Insurance', amount: 2200 },
        { name: 'WiFi & Mobile', amount: 1299 },
        { name: 'OTT Subscriptions', amount: 649 },
      ],
    },
    {
      monthlyIncome: 118000,
      bankBalance: 310000,
      savings: 240000,
      fixedExpenses: [
        { name: 'Rent - 2BHK Koramangala', amount: 28000 },
        { name: 'Term Insurance', amount: 3100 },
        { name: 'Jio Fiber Broadband', amount: 999 },
        { name: 'Gym Membership', amount: 1800 },
        { name: 'Netflix + Hotstar', amount: 849 },
        { name: 'Car EMI', amount: 14200 },
      ],
    },
    {
      monthlyIncome: 54000,
      bankBalance: 97000,
      savings: 45000,
      fixedExpenses: [
        { name: 'PG Accommodation', amount: 12000 },
        { name: 'Bike Loan EMI', amount: 4500 },
        { name: 'Airtel Postpaid', amount: 599 },
        { name: 'Spotify Premium', amount: 119 },
        { name: 'Health Insurance', amount: 1450 },
      ],
    },
    {
      monthlyIncome: 165000,
      bankBalance: 480000,
      savings: 620000,
      fixedExpenses: [
        { name: 'Home Loan EMI', amount: 42000 },
        { name: 'Life Insurance (LIC)', amount: 8500 },
        { name: 'BSNL Broadband', amount: 749 },
        { name: 'Car EMI - Honda City', amount: 18500 },
        { name: 'Society Maintenance', amount: 3200 },
        { name: 'Mutual Fund SIP', amount: 15000 },
      ],
    },
    {
      monthlyIncome: 88000,
      bankBalance: 225000,
      savings: 155000,
      fixedExpenses: [
        { name: 'Rent - 1BHK Hinjewadi', amount: 16500 },
        { name: 'SBI Personal Loan EMI', amount: 9800 },
        { name: 'MSEB Electricity', amount: 1800 },
        { name: 'ACT Fibernet', amount: 849 },
        { name: 'Amazon Prime + Netflix', amount: 679 },
        { name: 'Term Life Insurance', amount: 2300 },
      ],
    },
  ];

  const systemPrompt =
    'You are a financial profile generator for an Indian personal finance app. ' +
    'Every call must return a completely different and unique profile. ' +
    'Respond ONLY with a valid JSON object. No markdown, no code fences, just raw JSON.';

  const userPrompt =
    `[Request-ID: ${nonce}] Generate a realistic financial profile for a ${randomProfession} ` +
    `with ${randomExp} of experience, based in ${randomCity}, ${randomLiving}.\n\n` +
    `Return exactly this JSON structure:\n` +
    `{\n` +
    `  "monthlyIncome": <net monthly take-home in INR — realistic for profile>,\n` +
    `  "bankBalance": <current savings account balance in INR>,\n` +
    `  "savings": <FD / liquid fund / RD amount separate from bank account>,\n` +
    `  "fixedExpenses": [\n` +
    `    { "name": "<specific expense name>", "amount": <monthly INR amount> }\n` +
    `  ]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- Income must be realistic for a ${randomExp} ${randomProfession} in ${randomCity} (range ₹35,000-₹2,50,000)\n` +
    `- bankBalance should be 1.5-4x monthly income\n` +
    `- savings between 0 and 15x monthly income\n` +
    `- fixedExpenses: 4-6 items relevant to ${randomLiving} in ${randomCity}\n` +
    `  (can include: Rent/EMI, loan EMIs, insurance, internet, gym, subscriptions, SIP, society maintenance)\n` +
    `- Amounts must NOT be round numbers (avoid exact multiples of 1000)\n` +
    `- Make it feel like a real unique person — vary everything`;

  const fallback = () => FALLBACK_PROFILES[Math.floor(Math.random() * FALLBACK_PROFILES.length)];

  try {
    const result = await queryGroq(systemPrompt, userPrompt, fallback);
    res.status(200).json(result);
  } catch (error) {
    console.error('Seed data generation error:', error);
    res.status(500).json({ message: 'Failed to generate seed data' });
  }
}
