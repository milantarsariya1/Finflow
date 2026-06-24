import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Pencil, Sparkles, HelpCircle, ArrowUpRight, ArrowDownRight, 
  Wallet, PiggyBank, Calendar, Tag, FileText, IndianRupee, Loader2, Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formatINR, formatDate, formatPercent } from '../utils/formatters';
import MoneyFlowDiagram from '../components/MoneyFlowDiagram';
import EducationalDisclaimer from '../components/EducationalDisclaimer';

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Medical', 'Education', 'Others'];
const INCOME_CATEGORIES = ['Salary', 'Bonus', 'Investments', 'Ad-hoc Income', 'Others'];

const COLORS = ['#d4af37', '#8fae98', '#cc8085', '#b8985c', '#c3a17e', '#a398b2', '#7b9bb3', '#c7a3a5'];

export default function Dashboard() {
  const { user, token, fetchUpdatedUser } = useAuth();
  const navigate = useNavigate();

  // If monthlyIncome is 0, user hasn't onboarded yet
  useEffect(() => {
    if (user && user.monthlyIncome === 0) {
      navigate('/onboarding');
    }
  }, [user, navigate]);

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  
  // Dashboard surplus engine totals
  const [surplusInfo, setSurplusInfo] = useState({
    monthlyIncome: 0,
    bankBalance: 0,
    savings: 0,
    totalFixed: 0,
    totalVariable: 0,
    avgMonthlyVariable: 0,
    surplus: 0
  });

  // Transaction Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [adding, setAdding] = useState(false);

  const handleAddClick = () => {
    setEditingId(null);
    setType('expense');
    setAmount('');
    setCategory('Food');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(true);
  };

  const handleEditClick = (t) => {
    setEditingId(t.id);
    setType(t.type);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setNote(t.note || '');
    setDate(new Date(t.date).toISOString().split('T')[0]);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingId(null);
  };

  // AI Insights States
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // AI Affordability Box States
  const [question, setQuestion] = useState('');
  const [affordabilityVerdict, setAffordabilityVerdict] = useState(null);
  const [loadingAffordability, setLoadingAffordability] = useState(false);

  // Fetch all transactions and update surplus data
  const fetchData = async () => {
    if (!token) return;
    try {
      // 1. Fetch transactions
      const resTrans = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataTrans = await resTrans.json();
      if (resTrans.ok) {
        setTransactions(dataTrans);
      }

      // 2. Fetch surplus metrics
      const resSurplus = await fetch('/api/advisor/surplus', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataSurplus = await resSurplus.json();
      if (resSurplus.ok) {
        setSurplusInfo(dataSurplus);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Adjust category default when type shifts
  useEffect(() => {
    setCategory(type === 'expense' ? 'Food' : 'Salary');
  }, [type]);

  // Handle transaction logger submission
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setAdding(true);
    try {
      const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          category,
          note,
          date
        })
      });

      if (res.ok) {
        setAmount('');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
        setEditingId(null);
        setShowAddForm(false);
        await fetchData();
        await fetchUpdatedUser();
      }
    } catch (err) {
      console.error('Save transaction failed:', err);
    } finally {
      setAdding(false);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchData();
        await fetchUpdatedUser();
      }
    } catch (err) {
      console.error('Delete transaction failed:', err);
    }
  };

  // Fetch AI Insights
  const handleGetInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch('/api/ai/monthly-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactions,
          monthlyIncome: surplusInfo.monthlyIncome,
          totalFixed: surplusInfo.totalFixed,
          surplus: surplusInfo.surplus
        })
      });

      const data = await res.json();
      if (res.ok) {
        setInsights(data);
      }
    } catch (error) {
      console.error('AI Insights error:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Ask AI Affordability Check
  const handleCheckAffordability = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoadingAffordability(true);
    setAffordabilityVerdict(null);

    try {
      const res = await fetch('/api/ai/affordability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: question.trim(),
          surplus: surplusInfo.surplus,
          balance: surplusInfo.bankBalance,
          fixedCosts: surplusInfo.totalFixed,
          savings: surplusInfo.savings
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAffordabilityVerdict(data);
      }
    } catch (error) {
      console.error('AI Affordability error:', error);
    } finally {
      setLoadingAffordability(false);
    }
  };

  // --- CHART MATHS ---
  
  // MoM Spending Comparison & Change Calculation
  const getMoMChange = () => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthSpend = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthSpend = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    let percentChange = 0;
    if (lastMonthSpend > 0) {
      percentChange = ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
    } else if (thisMonthSpend > 0) {
      percentChange = 100; // infinite growth since last month was 0
    }

    return {
      thisMonthSpend,
      lastMonthSpend,
      percentChange
    };
  };

  const momData = getMoMChange();

  // Category Pie Chart Data
  const getCategoryData = () => {
    const map = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.keys(map).map((cat, idx) => ({
      name: cat,
      value: map[cat],
      color: COLORS[idx % COLORS.length]
    }));
  };

  const pieChartData = getCategoryData();

  // Spending Trend Line Chart Data (Daily variable spend for current month)
  const getDailySpendingTrend = () => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();

    const dailyMap = {};
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = 0;
    }

    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .forEach(t => {
        const day = new Date(t.date).getDate();
        dailyMap[day] += t.amount;
      });

    return Object.keys(dailyMap).map(day => ({
      day: `Day ${day}`,
      amount: dailyMap[day]
    }));
  };

  const lineChartData = getDailySpendingTrend();

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none mb-2">
            Welcome Back, {user.name}
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Monitor surplus capital flow, evaluate daily transactions, and review AI educational cues.
          </p>
        </div>

        <button
          onClick={handleAddClick}
          className="flex items-center justify-center gap-1.5 bg-brand-primary hover:bg-brand-secondary text-dark-bg rounded-xl py-2.5 px-4 font-bold text-xs transition-all shadow-md shadow-brand-primary/10 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Bank Balance */}
        <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-2xl p-5 hover:border-blue-500/40 dark:hover:border-zinc-700/60 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Bank Balance</span>
            <div className="text-slate-500 bg-slate-100 dark:bg-zinc-800/40 p-1.5 rounded-lg"><Wallet size={16} /></div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white">{formatINR(surplusInfo.bankBalance)}</p>
          <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 font-medium">Updated live via transactions</p>
        </div>

        {/* Card 2: Income */}
        <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-2xl p-5 hover:border-blue-500/40 dark:hover:border-zinc-700/60 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Monthly Income</span>
            <div className="text-slate-500 bg-slate-100 dark:bg-zinc-800/40 p-1.5 rounded-lg"><IndianRupee size={16} /></div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-brand-emerald">{formatINR(surplusInfo.monthlyIncome)}</p>
          <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 font-medium">Base Net Income</p>
        </div>

        {/* Card 3: MoM Change & Variable Expenses */}
        <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-2xl p-5 hover:border-blue-500/40 dark:hover:border-zinc-700/60 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">This Month Spend</span>
            {momData.percentChange > 0 ? (
              <div className="flex items-center text-rose-600 dark:text-brand-rose text-[10px] font-bold bg-rose-50 dark:bg-brand-rose/10 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} className="mr-0.5" />
                <span>{formatPercent(Math.abs(momData.percentChange))}</span>
              </div>
            ) : (
              <div className="flex items-center text-emerald-600 dark:text-brand-emerald text-[10px] font-bold bg-emerald-50 dark:bg-brand-emerald/10 px-2 py-0.5 rounded-full">
                <ArrowDownRight size={12} className="mr-0.5" />
                <span>{formatPercent(Math.abs(momData.percentChange))}</span>
              </div>
            )}
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white">{formatINR(momData.thisMonthSpend)}</p>
          <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 font-medium">
            vs {formatINR(momData.lastMonthSpend)} last month
          </p>
        </div>

        {/* Card 4: Base Savings */}
        <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-2xl p-5 hover:border-blue-500/40 dark:hover:border-zinc-700/60 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Base Savings</span>
            <div className="text-slate-500 bg-slate-100 dark:bg-zinc-800/40 p-1.5 rounded-lg"><PiggyBank size={16} /></div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white">{formatINR(surplusInfo.savings)}</p>
          <p className="text-[10px] text-slate-400 dark:text-dark-muted mt-1 font-medium">Declared Liquid Reserves</p>
        </div>
      </div>

      {/* Visually displaying Surplus flow */}
      <div className="mb-8">
        <MoneyFlowDiagram 
          income={surplusInfo.monthlyIncome}
          fixedCosts={surplusInfo.totalFixed}
          variableSpend={surplusInfo.avgMonthlyVariable}
          surplus={surplusInfo.surplus}
        />
      </div>

      {/* Main Grid: charts and transaction ledger */}
      <div className="grid lg:grid-cols-12 gap-8 mb-8">
        
        {/* Ledger & Input Panel */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Recent Ledger */}
          <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 relative shadow-sm">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-5 text-left">
              Recent Transactions Ledger
            </h3>

            {loadingTransactions ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-dark-muted">
                <Loader2 className="animate-spin text-blue-600 dark:text-brand-primary mb-2" size={24} />
                <span className="text-xs">Loading transaction records...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 dark:border-dark-border rounded-2xl bg-slate-50 dark:bg-dark-card/20 text-center px-4">
                <div className="bg-slate-100 dark:bg-zinc-800/30 p-3 rounded-2xl text-slate-400 dark:text-dark-muted mb-3"><Wallet size={24} /></div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">No recorded transactions</h4>
                <p className="text-xs text-slate-500 dark:text-dark-muted max-w-xs leading-relaxed mb-4">
                  Log your everyday variable expenses or ad-hoc income sources using the logger button.
                </p>
                <button
                  onClick={handleAddClick}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-2 px-3 text-xs font-semibold cursor-pointer"
                >
                  Create First Entry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-dark-border text-slate-500 dark:text-dark-muted uppercase font-bold tracking-wider text-xs">
                      <th className="pb-3 font-semibold text-left">Date</th>
                      <th className="pb-3 font-semibold text-left">Category</th>
                      <th className="pb-3 font-semibold text-left">Note</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                      <th className="pb-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border/40">
                    {transactions.slice(0, 10).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-dark-card/30 transition-colors group">
                        <td className="py-3.5 text-slate-700 dark:text-zinc-300 text-xs">{formatDate(t.date)}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            t.type === 'income' 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-brand-emerald/10 dark:text-brand-emerald' 
                              : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}>
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500 dark:text-dark-muted truncate max-w-[140px] text-xs text-left" title={t.note}>
                          {t.note || '—'}
                        </td>
                        <td className="py-3.5 text-right font-bold text-slate-800 dark:text-white text-xs">
                          <span className={t.type === 'income' ? 'text-emerald-600 dark:text-brand-emerald' : 'text-slate-700 dark:text-zinc-200'}>
                            {t.type === 'income' ? '+' : '-'} {formatINR(t.amount, false)}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => handleEditClick(t)}
                              className="text-slate-400 hover:text-blue-600 dark:text-dark-muted dark:hover:text-brand-primary bg-transparent border-0 cursor-pointer p-1 transition-colors"
                              title="Edit Entry"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="text-slate-400 hover:text-rose-600 dark:text-dark-muted dark:hover:text-brand-rose bg-transparent border-0 cursor-pointer p-1 transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 10 && (
                  <p className="text-[10px] text-slate-400 dark:text-dark-muted text-center mt-4">
                    Showing 10 most recent transactions.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Charts & Visualization Panel */}
        <div className="lg:col-span-5 space-y-8">
          {/* Category Breakdown (Pie) */}
          <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-5 text-left">
              Variable Category Allocation
            </h3>
            {pieChartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 dark:text-dark-muted bg-slate-50 dark:bg-dark-card/10 rounded-2xl border border-dashed border-slate-200 dark:border-dark-border">
                No variable expense records available to render allocation.
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => [formatINR(val), 'Spent']}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '16px' }}
                      itemStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconSize={10} 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Daily Trend Line Chart */}
          <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-5 text-left">
              This Month Spending Trend
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
                  <Tooltip
                    formatter={(val) => [formatINR(val), 'Amount Spent']}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '16px' }}
                    itemStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#d4af37" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* AI Cues Panel & Affordability Box */}
      <div className="grid lg:grid-cols-12 gap-8 mb-8">
        
        {/* Left: AI Insights */}
        <div className="lg:col-span-6 bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 relative shadow-sm text-left">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="text-blue-600 dark:text-brand-secondary animate-pulse" size={18} />
              <span>AI Strategic Insights</span>
            </h3>
            
            <button
              onClick={handleGetInsights}
              disabled={loadingInsights}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {loadingInsights ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              <span>Analyze Finances</span>
            </button>
          </div>

          {!insights ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-slate-400 dark:text-dark-muted mb-3"><Sparkles size={32} /></div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">Unleash AI Advisors</h4>
              <p className="text-xs text-slate-500 dark:text-dark-muted max-w-xs leading-relaxed">
                Click the analyze button to evaluate your surplus, fixed bills, and spending allocations.
              </p>
            </div>
          ) : (
            <div className="space-y-5 text-left animate-slide-up">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-brand-secondary uppercase tracking-wider block mb-1">Summary Diagnosis</span>
                <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50 border border-slate-100 dark:bg-dark-card/40 dark:border-dark-border/40 p-4 rounded-2xl">
                  {insights.summary}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-brand-secondary uppercase tracking-wider block mb-2">Tactical Action Recommendations</span>
                <ul className="space-y-2.5">
                  {insights.tips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-700 dark:text-zinc-300">
                      <div className="bg-slate-100 text-slate-600 dark:bg-brand-secondary/15 dark:text-brand-secondary rounded-lg px-2 py-0.5 font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right: Affordability Testing Box */}
        <div className="lg:col-span-6 bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 shadow-sm">
          <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2 mb-2 text-left">
            <HelpCircle className="text-blue-600 dark:text-brand-primary" size={18} />
            <span>Affordability Evaluation Box</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-dark-muted text-left mb-5">
            Test whether major one-off expenditures fit your current net liquid capital and monthly surplus cashflow.
          </p>

          <form onSubmit={handleCheckAffordability} className="space-y-4 text-left">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Can I afford a laptop for ₹65,000?"
                className="flex-1 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-3 px-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                required
              />
              <button
                type="submit"
                disabled={loadingAffordability || !question.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-primary dark:hover:bg-brand-secondary dark:text-dark-bg rounded-xl py-3 px-4 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {loadingAffordability ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span>Evaluate</span>
                )}
              </button>
            </div>
          </form>

          {affordabilityVerdict && (
            <div className="mt-5 text-left bg-slate-50 border border-slate-100 dark:bg-dark-card/40 dark:border-dark-border rounded-2xl p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-dark-muted uppercase tracking-wide">Diagnosis verdict</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  affordabilityVerdict.verdict === 'AFFORDABLE' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-brand-emerald/10 dark:border-brand-emerald/30 dark:text-brand-emerald'
                    : affordabilityVerdict.verdict === 'STRETCH'
                    ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-500'
                    : 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-brand-rose/10 dark:border-brand-rose/30 dark:text-brand-rose'
                }`}>
                  {affordabilityVerdict.verdict}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                {affordabilityVerdict.reasoning}
              </p>
            </div>
          )}
        </div>

      </div>

      <footer className="mt-12 border-t border-slate-200/60 dark:border-dark-border/40 pt-6 text-center text-xs text-slate-500 dark:text-dark-muted">
        <EducationalDisclaimer />
        <p className="mt-4 font-semibold tracking-wider text-[10px] uppercase text-slate-400 dark:text-zinc-500">
          Made with <span className="text-rose-500 animate-pulse">♥</span> by Milan Tarsariya
        </p>
      </footer>

      {/* --- ADD TRANSACTION MODAL DRAWER --- */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 shadow-2xl relative animate-slide-up text-left text-slate-800 dark:text-white">
            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight mb-5">
              {editingId ? 'Edit Financial Transaction' : 'Log Financial Transaction'}
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Entry Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      type === 'expense' 
                        ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-dark-muted bg-transparent hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Variable Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      type === 'income' 
                        ? 'bg-emerald-600 text-white dark:bg-brand-emerald dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-dark-muted bg-transparent hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Ad-hoc Income
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Amount (₹) *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Category</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary appearance-none"
                  >
                    {type === 'expense' 
                      ? EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      : INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                    }
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                    required
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Memo Note (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 text-slate-400 dark:text-dark-muted" size={16} />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Weekly grocery stock"
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:border-dark-border dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-xl py-2 px-4 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-primary dark:hover:bg-brand-secondary dark:text-dark-bg rounded-xl py-2 px-4 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {adding && <Loader2 size={12} className="animate-spin" />}
                  <span>{editingId ? 'Update Record' : 'Save Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
