import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash, Wallet, Landmark, PiggyBank, ArrowRight, Sparkles, X, Key, Eye, EyeOff, Bot, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatINR } from '../utils/formatters';

// ─── AI Seed Modal ────────────────────────────────────────────────────────────
function SeedWithAIModal({ onClose, onSeed }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'generating' | 'done'

  const GROQ_PROMPT = `You are a financial data generator for an Indian personal finance app.
Generate realistic financial seed data for a mid-level software professional in India.
Respond ONLY with a valid JSON object (no markdown, no explanation). The JSON must have exactly these keys:

{
  "monthlyIncome": <number, net monthly salary in INR, e.g. 85000>,
  "bankBalance": <number, current bank balance in INR, e.g. 220000>,
  "savings": <number, existing savings/FD/liquidity separate from bank, e.g. 150000>,
  "fixedExpenses": [
    { "name": "<expense name>", "amount": <number> },
    ...
  ]
}

Rules:
- monthlyIncome should be between 40000 and 200000
- bankBalance should be between 50000 and 500000
- savings should be between 0 and 1000000
- fixedExpenses should have 3-6 realistic items (Rent, EMI, Insurance, WiFi, Gym, Subscriptions etc.)
- All amounts must be realistic positive numbers
- Vary the data to make it feel real and specific, not round numbers`;

  const handleSeed = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Groq API key.');
      return;
    }
    if (!apiKey.trim().startsWith('gsk_')) {
      setError('Invalid Groq API key format. It should start with "gsk_".');
      return;
    }

    setError('');
    setLoading(true);
    setStep('generating');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a financial data generator. Always respond with valid JSON only, no markdown fences, no explanation.'
            },
            {
              role: 'user',
              content: GROQ_PROMPT
            }
          ],
          temperature: 0.9,
          max_tokens: 512,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `Groq API error (${response.status})`;
        throw new Error(msg);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('No content returned from Groq.');

      const parsed = JSON.parse(content);

      if (
        typeof parsed.monthlyIncome !== 'number' ||
        typeof parsed.bankBalance !== 'number' ||
        !Array.isArray(parsed.fixedExpenses)
      ) {
        throw new Error('Groq returned unexpected data format. Please try again.');
      }

      setStep('done');
      setTimeout(() => {
        onSeed(parsed);
        onClose();
      }, 800);

    } catch (err) {
      console.error('Groq seed error:', err);
      setError(err.message || 'Failed to generate data. Please check your API key and try again.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-dark-panel border border-slate-200 dark:border-dark-border rounded-2xl shadow-2xl p-6 animate-slide-up z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-dark-muted dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Seed with AI</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Auto-fill your financial profile using Groq AI</p>
          </div>
        </div>

        {step === 'input' && (
          <>
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-xl p-3 mb-5">
              <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                Groq will generate a realistic Indian professional financial profile and auto-fill all fields. Your API key is used only for this request and never stored.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                Groq API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSeed()}
                  placeholder="gsk_••••••••••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-3 pl-10 pr-10 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 transition-all font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-dark-muted dark:hover:text-white bg-transparent border-0 cursor-pointer transition-colors"
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1.5">
                Get your free API key at{' '}
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">
                  console.groq.com
                </a>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs p-3 rounded-xl mb-4">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSeed}
              disabled={loading || !apiKey.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl py-3 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-purple-500/20"
            >
              <Sparkles size={16} />
              Generate Financial Data
            </button>
          </>
        )}

        {step === 'generating' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={28} className="text-white animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-violet-300 dark:border-violet-700 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Groq AI is generating...</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Crafting a realistic financial profile for you</p>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Data generated!</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Filling your form fields now...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
export default function Onboarding() {
  const { user, onboardUser } = useAuth();
  const navigate = useNavigate();

  const [income, setIncome] = useState(user?.monthlyIncome || '');
  const [balance, setBalance] = useState(user?.bankBalance || '');
  const [savings, setSavings] = useState(user?.savings || '');
  const [fixedExpenses, setFixedExpenses] = useState(
    user?.fixedExpenses && user.fixedExpenses.length > 0
      ? user.fixedExpenses.map(e => ({ name: e.name, amount: e.amount }))
      : [{ name: 'Rent/Hostel', amount: '' }, { name: 'Bills & Utilities', amount: '' }]
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleAddFixed = () => {
    setFixedExpenses([...fixedExpenses, { name: '', amount: '' }]);
  };

  const handleRemoveFixed = (index) => {
    const updated = fixedExpenses.filter((_, i) => i !== index);
    setFixedExpenses(updated);
  };

  const handleFixedChange = (index, field, value) => {
    const updated = [...fixedExpenses];
    updated[index][field] = value;
    setFixedExpenses(updated);
  };

  const calculateTotalFixed = () => {
    return fixedExpenses.reduce((sum, item) => {
      const amt = parseFloat(item.amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  };

  const handleSeedData = (data) => {
    setIncome(String(data.monthlyIncome));
    setBalance(String(data.bankBalance));
    setSavings(String(data.savings || 0));
    if (Array.isArray(data.fixedExpenses) && data.fixedExpenses.length > 0) {
      setFixedExpenses(
        data.fixedExpenses.map(e => ({
          name: e.name || '',
          amount: String(e.amount || ''),
        }))
      );
    }
    setSeeded(true);
    setTimeout(() => setSeeded(false), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!income || !balance) {
      setError('Please provide your monthly salary and current bank balance.');
      setLoading(false);
      return;
    }

    if (isNaN(Number(income)) || Number(income) < 0) {
      setError('Income must be a valid positive number.');
      setLoading(false);
      return;
    }

    if (isNaN(Number(balance)) || Number(balance) < 0) {
      setError('Bank balance must be a valid positive number.');
      setLoading(false);
      return;
    }

    const filteredExpenses = fixedExpenses
      .filter(item => item.name.trim() !== '' && !isNaN(parseFloat(item.amount)))
      .map(item => ({
        name: item.name.trim(),
        amount: parseFloat(item.amount),
      }));

    try {
      const result = await onboardUser({
        monthlyIncome: parseFloat(income),
        bankBalance: parseFloat(balance),
        savings: savings ? parseFloat(savings) : 0,
        fixedExpenses: filteredExpenses,
      });

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Failed to complete onboarding. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSeedModal && (
        <SeedWithAIModal
          onClose={() => setShowSeedModal(false)}
          onSeed={handleSeedData}
        />
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg p-4 md:p-8 flex items-center justify-center relative font-sans transition-colors duration-200">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/40 dark:bg-amber-950/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/40 dark:bg-emerald-950/20 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[5%] w-[25%] h-[25%] bg-violet-100/30 dark:bg-violet-950/15 rounded-full blur-[80px]" />

        <div className="max-w-4xl w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex bg-blue-50 border border-blue-100 text-blue-600 dark:bg-brand-primary/10 dark:border-brand-primary/20 dark:text-brand-primary text-xs font-semibold py-1.5 px-3.5 rounded-full mb-3 uppercase tracking-wider">
              Step 1: Setup Profile
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-2">
              Establish Your Financial Foundations
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-lg mx-auto">
              Input your base earnings and fixed obligations to calibrate the Real Surplus Engine.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSeedModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold py-2 px-4 rounded-full shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 cursor-pointer group"
              >
                <Sparkles size={13} className="group-hover:rotate-12 transition-transform duration-300" />
                Seed with AI
              </button>

              {seeded && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold py-1.5 px-3 rounded-full animate-slide-up">
                  <CheckCircle2 size={11} />
                  Fields auto-filled!
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-xs p-4 rounded-xl text-left animate-slide-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 text-left">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-dark-border/50 pb-2">
                  Income & Balances
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                    Monthly Income (Net Salary) *
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                    <input
                      type="number"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                  {income && (
                    <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-1 font-medium">
                      = {formatINR(parseFloat(income) || 0)} / month
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                    Current Bank Balance *
                  </label>
                  <div className="relative">
                    <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                    <input
                      type="number"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      placeholder="e.g. 300000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                  {balance && (
                    <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-1 font-medium">
                      = {formatINR(parseFloat(balance) || 0)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                    Existing Savings / Liquidity (Optional)
                  </label>
                  <div className="relative">
                    <PiggyBank className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                    <input
                      type="number"
                      value={savings}
                      onChange={(e) => setSavings(e.target.value)}
                      placeholder="e.g. 500000 (separate from bank account)"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1.5 leading-relaxed">
                    Used as base capital for your emergency reserve checker.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-dark-border/50 pb-2 mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Fixed Obligations
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddFixed}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-brand-primary dark:hover:text-brand-secondary bg-transparent border-0 cursor-pointer font-semibold"
                    >
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                    {fixedExpenses.map((expense, index) => (
                      <div key={index} className="flex gap-2 items-center animate-slide-up">
                        <input
                          type="text"
                          value={expense.name}
                          onChange={(e) => handleFixedChange(index, 'name', e.target.value)}
                          placeholder="e.g. Rent, EMI, WiFi"
                          className="flex-1 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                          required
                        />
                        <input
                          type="number"
                          value={expense.amount}
                          onChange={(e) => handleFixedChange(index, 'amount', e.target.value)}
                          placeholder="Amount"
                          className="w-24 md:w-32 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                          required
                        />
                        {fixedExpenses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFixed(index)}
                            className="bg-transparent border-0 hover:text-rose-600 dark:text-dark-muted dark:hover:text-brand-rose p-2 cursor-pointer transition-colors"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card/50 dark:border-dark-border/50 rounded-2xl p-4 mt-5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">Total Monthly Fixed Obligations:</span>
                    <span className="text-rose-600 dark:text-brand-rose font-bold text-sm">
                      {formatINR(calculateTotalFixed())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-dark-border/40 pt-6 flex flex-col md:flex-row gap-6 justify-end items-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-brand-emerald to-emerald-600 text-white rounded-xl py-3.5 px-8 font-bold text-sm hover:from-emerald-600 hover:to-emerald-700 focus:outline-none transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/10"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Initialize Dashboard</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
