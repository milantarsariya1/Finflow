import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash, Wallet, Landmark, PiggyBank, ArrowRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function Onboarding() {
  const { user, onboardUser, token } = useAuth();
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
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleAddFixed = () => setFixedExpenses([...fixedExpenses, { name: '', amount: '' }]);

  const handleRemoveFixed = (index) => setFixedExpenses(fixedExpenses.filter((_, i) => i !== index));

  const handleFixedChange = (index, field, value) => {
    const updated = [...fixedExpenses];
    updated[index][field] = value;
    setFixedExpenses(updated);
  };

  const calculateTotalFixed = () =>
    fixedExpenses.reduce((sum, item) => {
      const amt = parseFloat(item.amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

  // Direct seed — no popup, just click and fill
  const handleSeedWithAI = async () => {
    if (seeding) return;
    setSeeding(true);
    setSeeded(false);
    try {
      const res = await fetch('/api/ai/seed-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to generate data');

      setIncome(String(data.monthlyIncome));
      setBalance(String(data.bankBalance));
      setSavings(String(data.savings || 0));
      if (Array.isArray(data.fixedExpenses) && data.fixedExpenses.length > 0) {
        setFixedExpenses(data.fixedExpenses.map(e => ({ name: e.name || '', amount: String(e.amount || '') })));
      }
      setSeeded(true);
      setTimeout(() => setSeeded(false), 3500);
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setSeeding(false);
    }
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
      .map(item => ({ name: item.name.trim(), amount: parseFloat(item.amount) }));

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
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg p-4 md:p-8 flex items-center justify-center relative font-sans transition-colors duration-200">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/40 dark:bg-amber-950/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/40 dark:bg-emerald-950/20 rounded-full blur-[100px]" />
      <div className="absolute top-[20%] left-[5%] w-[25%] h-[25%] bg-violet-100/30 dark:bg-violet-950/15 rounded-full blur-[80px]" />

      <div className="max-w-4xl w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 animate-slide-up">
        {/* Header */}
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

          {/* Seed with AI — direct click, no modal */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSeedWithAI}
              disabled={seeding}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold py-2 px-4 rounded-full shadow-md shadow-purple-500/25 transition-all duration-300 cursor-pointer disabled:opacity-60 group"
            >
              {seeding ? (
                <><Loader2 size={13} className="animate-spin" /><span>Generating...</span></>
              ) : (
                <><Sparkles size={13} className="group-hover:rotate-12 transition-transform duration-300" /><span>Seed with AI</span></>
              )}
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
            {/* Left: Income & Balances */}
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

            {/* Right: Fixed Obligations */}
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

          <div className="border-t border-slate-200 dark:border-dark-border/40 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-gradient-to-r from-brand-emerald to-emerald-600 text-white rounded-xl py-3.5 px-8 font-bold text-sm hover:from-emerald-600 hover:to-emerald-700 focus:outline-none transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/10"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><span>Initialize Dashboard</span><ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
