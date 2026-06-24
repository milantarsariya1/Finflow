import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Sparkles, ShieldCheck, Landmark, BarChart2, Repeat, Target, 
  Trash2, Loader2, ArrowRight, Info, AlertTriangle, AlertCircle 
} from 'lucide-react';
import { formatINR, formatPercent } from '../utils/formatters';

export default function Advisor() {
  const { user, token } = useAuth();
  
  // Tab/Section selection state
  const [activeTab, setActiveTab] = useState('emergency');

  // Global Context (Surplus and Fixed Expenses, loaded from DB)
  const [globalContext, setGlobalContext] = useState({
    surplus: 0,
    totalFixed: 0,
    savings: 0,
    bankBalance: 0
  });

  useEffect(() => {
    const fetchContext = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/advisor/surplus', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setGlobalContext({
            surplus: data.surplus,
            totalFixed: data.totalFixed,
            savings: data.savings,
            bankBalance: data.bankBalance
          });
        }
      } catch (error) {
        console.error('Failed to load advisor context:', error);
      }
    };
    fetchContext();
  }, [token]);

  // ==========================================
  // A) EMERGENCY FUND STATE
  // ==========================================
  const [emergencyData, setEmergencyData] = useState(null);
  const [emergencyAI, setEmergencyAI] = useState('');
  const [loadingEmergency, setLoadingEmergency] = useState(false);

  const fetchEmergencyStatus = async () => {
    setLoadingEmergency(true);
    try {
      const res = await fetch('/api/advisor/emergency-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmergencyData(data);
        
        // Fetch AI commentary
        const aiRes = await fetch('/api/ai/explain-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'emergency',
            numbers: data,
            userContext: {
              fixedExpenses: globalContext.totalFixed,
              surplus: globalContext.surplus
            }
          })
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) {
          setEmergencyAI(aiData.commentary);
        }
      }
    } catch (error) {
      console.error('Emergency check error:', error);
    } finally {
      setLoadingEmergency(false);
    }
  };

  useEffect(() => {
    if (token && globalContext.totalFixed > 0) {
      fetchEmergencyStatus();
    }
  }, [token, globalContext.totalFixed]);

  // ==========================================
  // B) FIXED DEPOSIT STATE
  // ==========================================
  const [fdAmount, setFdAmount] = useState('100000');
  const [fdRate, setFdRate] = useState('7.1');
  const [fdTenure, setFdTenure] = useState('3');
  const [fdResult, setFdResult] = useState(null);
  const [fdAI, setFdAI] = useState('');
  const [loadingFd, setLoadingFd] = useState(false);

  const handleCalculateFD = async (e) => {
    if (e) e.preventDefault();
    if (!fdAmount || !fdTenure) return;

    setLoadingFd(true);
    setFdResult(null);
    setFdAI('');

    try {
      const res = await fetch('/api/advisor/calculate-fd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(fdAmount),
          rate: parseFloat(fdRate),
          tenureYears: parseFloat(fdTenure)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFdResult(data);

        // Fetch AI Explanation
        const aiRes = await fetch('/api/ai/explain-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'fd',
            numbers: data,
            userContext: {
              fixedExpenses: globalContext.totalFixed,
              surplus: globalContext.surplus
            }
          })
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) {
          setFdAI(aiData.commentary);
        }
      }
    } catch (error) {
      console.error('FD Calc error:', error);
    } finally {
      setLoadingFd(false);
    }
  };

  // ==========================================
  // C) MUTUAL FUND (SIP / LUMPSUM) STATE
  // ==========================================
  const [sipMode, setSipMode] = useState('sip'); // 'sip' | 'lumpsum'
  const [sipAmount, setSipAmount] = useState('10000');
  const [sipRate, setSipRate] = useState('12.0');
  const [sipTenure, setSipTenure] = useState('5');
  const [sipResult, setSipResult] = useState(null);
  const [sipAI, setSipAI] = useState('');
  const [loadingSip, setLoadingSip] = useState(false);

  const handleCalculateSIP = async (e) => {
    if (e) e.preventDefault();
    if (!sipAmount || !sipTenure) return;

    setLoadingSip(true);
    setSipResult(null);
    setSipAI('');

    try {
      const payload = {
        rate: parseFloat(sipRate),
        years: parseFloat(sipTenure)
      };

      if (sipMode === 'sip') {
        payload.monthlyAmount = parseFloat(sipAmount);
      } else {
        payload.lumpsumAmount = parseFloat(sipAmount);
      }

      const res = await fetch('/api/advisor/calculate-sip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        const resultNumbers = sipMode === 'sip' ? data.sipResult : data.lumpsumResult;
        setSipResult(resultNumbers);

        // Fetch AI Explanation
        const aiRes = await fetch('/api/ai/explain-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'sip',
            numbers: resultNumbers,
            userContext: {
              fixedExpenses: globalContext.totalFixed,
              surplus: globalContext.surplus
            }
          })
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) {
          setSipAI(aiData.commentary);
        }
      }
    } catch (error) {
      console.error('SIP Calc error:', error);
    } finally {
      setLoadingSip(false);
    }
  };

  // ==========================================
  // D) SCENARIO COMPARISON STATE
  // ==========================================
  const [compareAmount, setCompareAmount] = useState('100000');
  const [compareYears, setCompareYears] = useState('5');
  const [compareResult, setCompareResult] = useState(null);
  const [compareAI, setCompareAI] = useState('');
  const [loadingCompare, setLoadingCompare] = useState(false);

  const handleRunComparison = async (e) => {
    if (e) e.preventDefault();
    if (!compareAmount || !compareYears) return;

    setLoadingCompare(true);
    setCompareResult(null);
    setCompareAI('');

    try {
      const res = await fetch('/api/advisor/calculate-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(compareAmount),
          years: parseFloat(compareYears)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCompareResult(data);

        // Fetch AI commentary
        const aiRes = await fetch('/api/ai/explain-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'sip', // using generic projection descriptor
            numbers: {
              estimatedReturns: data.lumpsumCompare.sip.interest,
              maturityValue: data.lumpsumCompare.sip.maturity,
              investedAmount: data.lumpsumCompare.sip.invested,
              years: data.years,
              monthlyAmount: 0 // lumpsum trigger
            },
            userContext: {
              fixedExpenses: globalContext.totalFixed,
              surplus: globalContext.surplus
            }
          })
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) {
          setCompareAI(
            `In this lumpsum comparison over ${data.years} years: ` +
            `The safe Fixed Deposit provides a guaranteed return of ${formatINR(data.lumpsumCompare.fd.maturity)}, earning ${formatINR(data.lumpsumCompare.fd.interest)} in interest. ` +
            `Conversely, the growth-oriented Mutual Fund SIP scenario yields a projected maturity of ${formatINR(data.lumpsumCompare.sip.maturity)}, yielding ${formatINR(data.lumpsumCompare.sip.interest)} in expected returns. ` +
            `This represents a growth difference of ${formatINR(data.lumpsumCompare.sip.maturity - data.lumpsumCompare.fd.maturity)}. ` +
            aiData.commentary
          );
        }
      }
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setLoadingCompare(false);
    }
  };

  // ==========================================
  // E) GOAL PLANNER STATE
  // ==========================================
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('500000');
  const [goalYears, setGoalYears] = useState('3');
  const [goalRate, setGoalRate] = useState('12.0');
  const [goals, setGoals] = useState([]);
  const [goalCalculation, setGoalCalculation] = useState(null);
  const [goalAI, setGoalAI] = useState('');
  const [loadingGoalCalc, setLoadingGoalCalc] = useState(false);
  const [loadingGoalsList, setLoadingGoalsList] = useState(false);

  const fetchGoals = async () => {
    setLoadingGoalsList(true);
    try {
      const res = await fetch('/api/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGoals(data);
      }
    } catch (error) {
      console.error('Get goals list failed:', error);
    } finally {
      setLoadingGoalsList(false);
    }
  };

  useEffect(() => {
    if (token) fetchGoals();
  }, [token]);

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTarget || !goalYears) return;

    setLoadingGoalCalc(true);
    setGoalCalculation(null);
    setGoalAI('');

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: goalName,
          targetAmount: parseFloat(goalTarget),
          years: parseFloat(goalYears),
          rate: parseFloat(goalRate)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setGoalCalculation(data.calculation);
        setGoalName('');
        await fetchGoals();

        // Fetch AI Explanation
        const aiRes = await fetch('/api/ai/explain-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'goal',
            numbers: data.calculation,
            userContext: {
              fixedExpenses: globalContext.totalFixed,
              surplus: globalContext.surplus
            }
          })
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) {
          setGoalAI(aiData.commentary);
        }
      }
    } catch (error) {
      console.error('Goal creation failed:', error);
    } finally {
      setLoadingGoalCalc(false);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchGoals();
      }
    } catch (error) {
      console.error('Delete goal failed:', error);
    }
  };

  // Helper: auto triggers calculations on tab mount if empty
  useEffect(() => {
    if (activeTab === 'fd' && !fdResult) handleCalculateFD();
    if (activeTab === 'sip' && !sipResult) handleCalculateSIP();
    if (activeTab === 'compare' && !compareResult) handleRunComparison();
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none mb-2 text-left">
          Investment Advisory Panel
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-sm text-left">
          Leverage exact financial models backed by warm, educational AI projections tailored to your fixed billings and surplus cashflow.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Navigation Links (Glass cards) */}
        <div className="lg:col-span-3 space-y-2 bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-4.5 shadow-sm">
          <button
            onClick={() => setActiveTab('emergency')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              activeTab === 'emergency' 
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-brand-primary dark:text-dark-bg dark:border-brand-primary dark:glow-primary' 
                : 'text-slate-600 border-transparent bg-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:border-transparent dark:hover:text-white dark:hover:bg-dark-card/50'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Emergency Fund</span>
          </button>

          <button
            onClick={() => setActiveTab('fd')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              activeTab === 'fd' 
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-brand-primary dark:text-dark-bg dark:border-brand-primary dark:glow-primary' 
                : 'text-slate-600 border-transparent bg-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:border-transparent dark:hover:text-white dark:hover:bg-dark-card/50'
            }`}
          >
            <Landmark size={16} />
            <span>Fixed Deposit</span>
          </button>

          <button
            onClick={() => setActiveTab('sip')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              activeTab === 'sip' 
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-brand-primary dark:text-dark-bg dark:border-brand-primary dark:glow-primary' 
                : 'text-slate-600 border-transparent bg-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:border-transparent dark:hover:text-white dark:hover:bg-dark-card/50'
            }`}
          >
            <BarChart2 size={16} />
            <span>Mutual Fund / SIP</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              activeTab === 'compare' 
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-brand-primary dark:text-dark-bg dark:border-brand-primary dark:glow-primary' 
                : 'text-slate-600 border-transparent bg-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:border-transparent dark:hover:text-white dark:hover:bg-dark-card/50'
            }`}
          >
            <Repeat size={16} />
            <span>Scenario Compare</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              activeTab === 'goals' 
                ? 'bg-blue-600 text-white border-blue-600 dark:bg-brand-primary dark:text-dark-bg dark:border-brand-primary dark:glow-primary' 
                : 'text-slate-600 border-transparent bg-transparent hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:border-transparent dark:hover:text-white dark:hover:bg-dark-card/50'
            }`}
          >
            <Target size={16} />
            <span>Goal Planner</span>
          </button>
        </div>

        {/* Right Side: Interactive Forms/Calculations Panels */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* ==========================================
              A) EMERGENCY FUND TAB VIEW
              ========================================== */}
          {activeTab === 'emergency' && (
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 animate-slide-up text-left space-y-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                    <ShieldCheck size={20} className="text-emerald-600 dark:text-brand-emerald" />
                    <span>Emergency Fund Reserves Adequacy Check</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                    Standard guideline: retain at least 6 months of fixed monthly expenses liquid as safety reserves.
                  </p>
                </div>
                
                <button
                  onClick={fetchEmergencyStatus}
                  disabled={loadingEmergency}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer"
                >
                  Sync Check
                </button>
              </div>

              {loadingEmergency ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-dark-muted">
                  <Loader2 className="animate-spin text-blue-600 dark:text-brand-primary mb-2" size={24} />
                  <span className="text-xs">Running metrics check...</span>
                </div>
              ) : emergencyData ? (
                <div className="space-y-6">
                  {/* Progress Bar & Status Alert */}
                  <div className="grid md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-3">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-zinc-400">Current Savings Reserves: {formatINR(emergencyData.currentSavings)}</span>
                        <span className="text-slate-700 dark:text-zinc-200">Goal Recommended: {formatINR(emergencyData.recommended)}</span>
                      </div>
                      
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-3.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            emergencyData.isAdequate ? 'bg-emerald-500 dark:bg-brand-emerald' : 'bg-rose-500 dark:bg-brand-rose'
                          }`}
                          style={{ width: `${Math.min(100, (emergencyData.currentSavings / emergencyData.recommended) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border p-4 rounded-2xl flex items-center gap-3">
                      {emergencyData.isAdequate ? (
                        <>
                          <ShieldCheck className="text-emerald-600 dark:text-brand-emerald shrink-0 animate-pulse" size={24} />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">Buffer Adequate</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Ready to invest surplus</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="text-rose-600 dark:text-brand-rose shrink-0 animate-bounce" size={24} />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">Deficit Alert</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Build reserves first</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Context Values */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card/50 dark:border-dark-border/40 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-500 dark:text-dark-muted font-bold uppercase tracking-wider block mb-1">Fixed Expenses</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{formatINR(emergencyData.totalFixed)}/mo</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card/50 dark:border-dark-border/40 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-500 dark:text-dark-muted font-bold uppercase tracking-wider block mb-1">6-Month Target</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{formatINR(emergencyData.recommended)}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card/50 dark:border-dark-border/40 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-500 dark:text-dark-muted font-bold uppercase tracking-wider block mb-1">Reserves Available</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{formatINR(emergencyData.currentSavings)}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card/50 dark:border-dark-border/40 p-4 rounded-xl">
                      <span className="text-[10px] text-slate-500 dark:text-dark-muted font-bold uppercase tracking-wider block mb-1">Reserves Deficit</span>
                      <span className={`text-sm font-bold ${emergencyData.gap > 0 ? 'text-rose-600 dark:text-brand-rose' : 'text-emerald-600 dark:text-brand-emerald'}`}>
                        {formatINR(emergencyData.gap)}
                      </span>
                    </div>
                  </div>

                  {/* Advisor commentary */}
                  {emergencyAI && (
                    <div className="bg-slate-50 dark:bg-dark-card border border-blue-100 dark:border-brand-primary/20 rounded-2xl p-5 relative">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Sparkles className="text-blue-600 dark:text-brand-primary shrink-0 animate-pulse" size={16} />
                        <span className="text-[10px] font-bold text-blue-600 dark:text-brand-primary uppercase tracking-wider">AI Financial Advisor</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                        "{emergencyAI}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 dark:border-dark-border rounded-2xl bg-slate-50 dark:bg-dark-card/10 text-center">
                  <AlertCircle size={20} className="text-slate-400 dark:text-dark-muted mb-2" />
                  <p className="text-xs text-slate-500 dark:text-dark-muted">Please input fixed commitments on the onboarding panel first.</p>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              B) FIXED DEPOSIT CALCULATOR TAB
              ========================================== */}
          {activeTab === 'fd' && (
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 animate-slide-up text-left space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Landmark size={20} className="text-blue-600 dark:text-brand-primary" />
                  <span>Fixed Deposit Compounding Calculator</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                  Guaranteed compound returns (quarterly compounding formula). Includes smart liquidity suggestions.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Inputs Form */}
                <form onSubmit={handleCalculateFD} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Deposit Amount (₹)</label>
                    <input
                      type="number"
                      value={fdAmount}
                      onChange={(e) => setFdAmount(e.target.value)}
                      placeholder="e.g. 100000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Interest Rate (% p.a.)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={fdRate}
                        onChange={(e) => setFdRate(e.target.value)}
                        placeholder="7.0"
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Tenure (Years)</label>
                      <input
                        type="number"
                        step="0.25"
                        value={fdTenure}
                        onChange={(e) => setFdTenure(e.target.value)}
                        placeholder="3"
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingFd}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-primary dark:hover:bg-brand-secondary dark:text-dark-bg rounded-xl py-3 px-4 font-extrabold text-xs transition-all cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {loadingFd && <Loader2 size={13} className="animate-spin" />}
                    <span>Calculate Maturity</span>
                  </button>
                </form>

                {/* Math Output Panel */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl p-5 flex flex-col justify-between">
                  {fdResult ? (
                    <div className="space-y-4 animate-slide-up text-left">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Principal Invested</span>
                        <span className="text-base font-bold text-slate-800 dark:text-white">{formatINR(fdResult.principal)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Interest Gained</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-brand-emerald">+{formatINR(fdResult.interestEarned)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Maturity Value</span>
                          <span className="text-sm font-extrabold text-slate-800 dark:text-white">{formatINR(fdResult.maturityValue)}</span>
                        </div>
                      </div>

                      {/* Smart suggestion bubble */}
                      <div className="border-t border-slate-200 dark:border-dark-border/60 pt-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Info className="text-blue-600 dark:text-brand-primary shrink-0" size={13} />
                          <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">Liquidity Suggestion</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Your balance is {formatINR(globalContext.bankBalance)}. Based on maintaining {formatINR(fdResult.liquidKeep)} liquid cushion, you can lock in up to <strong>{formatINR(fdResult.suggestedFD)}</strong>, leaving {formatINR(fdResult.remainingLiquid)} accessible.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-dark-muted py-10">
                      Configure numbers and click calculate.
                    </div>
                  )}
                </div>
              </div>

              {/* Advisor commentary */}
              {fdAI && fdResult && (
                <div className="bg-slate-50 dark:bg-dark-card border border-blue-100 dark:border-brand-primary/20 rounded-2xl p-5 text-left">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="text-blue-600 dark:text-brand-primary shrink-0" size={16} />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-brand-primary uppercase tracking-wider">AI Financial Advisor</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                    "{fdAI}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              C) MUTUAL FUND (SIP/LUMPSUM) TAB VIEW
              ========================================== */}
          {activeTab === 'sip' && (
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 animate-slide-up text-left space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <BarChart2 size={20} className="text-emerald-600 dark:text-brand-emerald" />
                  <span>Mutual Fund Growth Compounding Calculator</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                  Project long term values using either regular monthly Systematic Investment Plans (SIP) or single deposits.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border p-1 rounded-xl max-w-sm">
                <button
                  type="button"
                  onClick={() => setSipMode('sip')}
                  className={`py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                    sipMode === 'sip' ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-white bg-transparent'
                  }`}
                >
                  Monthly SIP
                </button>
                <button
                  type="button"
                  onClick={() => setSipMode('lumpsum')}
                  className={`py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
                    sipMode === 'lumpsum' ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-dark-muted hover:text-slate-800 dark:hover:text-white bg-transparent'
                  }`}
                >
                  Lumpsum Single
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Inputs */}
                <form onSubmit={handleCalculateSIP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                      {sipMode === 'sip' ? 'Monthly SIP Amount (₹)' : 'Lumpsum Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      value={sipAmount}
                      onChange={(e) => setSipAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Assumed Return (% p.a.)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sipRate}
                        onChange={(e) => setSipRate(e.target.value)}
                        placeholder="12"
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Tenure (Years)</label>
                      <input
                        type="number"
                        step="1"
                        value={sipTenure}
                        onChange={(e) => setSipTenure(e.target.value)}
                        placeholder="5"
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingSip}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-brand-emerald dark:hover:bg-emerald-600 rounded-xl py-3 px-4 font-bold text-xs transition-all cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {loadingSip && <Loader2 size={13} className="animate-spin" />}
                    <span>Simulate Growth</span>
                  </button>
                </form>

                {/* Result */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl p-5 flex flex-col justify-between">
                  {sipResult ? (
                    <div className="space-y-4 animate-slide-up text-left">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Total Capital Invested</span>
                        <span className="text-base font-bold text-slate-800 dark:text-white">{formatINR(sipResult.investedAmount || sipResult.lumpsumAmount)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Estimated Returns</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-brand-emerald">+{formatINR(sipResult.estimatedReturns)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Accumulated Corpus</span>
                          <span className="text-sm font-extrabold text-slate-800 dark:text-white">{formatINR(sipResult.maturityValue)}</span>
                        </div>
                      </div>

                      {/* Visual gauge ratio bar */}
                      <div className="border-t border-slate-200 dark:border-dark-border/60 pt-3.5">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                          <span>INVESTED: {Math.round(((sipResult.investedAmount || sipResult.lumpsumAmount) / sipResult.maturityValue) * 100)}%</span>
                          <span>RETURNS: {Math.round((sipResult.estimatedReturns / sipResult.maturityValue) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-blue-500 dark:bg-brand-primary h-full" 
                            style={{ width: `${((sipResult.investedAmount || sipResult.lumpsumAmount) / sipResult.maturityValue) * 100}%` }}
                          />
                          <div 
                            className="bg-emerald-500 dark:bg-brand-emerald h-full" 
                            style={{ width: `${(sipResult.estimatedReturns / sipResult.maturityValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-dark-muted py-10">
                      Configure numbers and simulate portfolio.
                    </div>
                  )}
                </div>
              </div>

              {/* Advisor commentary */}
              {sipAI && sipResult && (
                <div className="bg-slate-50 dark:bg-dark-card border border-blue-100 dark:border-brand-primary/20 rounded-2xl p-5 text-left">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="text-blue-600 dark:text-brand-primary shrink-0" size={16} />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-brand-primary uppercase tracking-wider">AI Financial Advisor</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                    "{sipAI}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              D) SCENARIO COMPARISON TAB VIEW
              ========================================== */}
          {activeTab === 'compare' && (
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 animate-slide-up text-left space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Repeat size={20} className="text-slate-500 dark:text-brand-secondary" />
                  <span>Scenario Comparison Matrix (FD vs SIP)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                  Evaluate the performance of allocating identical funds into a guaranteed safe FD vs an equity growth Mutual Fund (SIP/Lumpsum).
                </p>
              </div>

              <div className="grid md:grid-cols-12 gap-6 items-start">
                {/* Inputs sidebar card */}
                <form onSubmit={handleRunComparison} className="md:col-span-4 space-y-4 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border p-4.5 rounded-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Investment Sum (₹)</label>
                    <input
                      type="number"
                      value={compareAmount}
                      onChange={(e) => setCompareAmount(e.target.value)}
                      placeholder="e.g. 100000"
                      className="w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Duration (Years)</label>
                    <input
                      type="number"
                      value={compareYears}
                      onChange={(e) => setCompareYears(e.target.value)}
                      placeholder="5"
                      className="w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingCompare}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-secondary dark:hover:bg-brand-primary dark:text-dark-bg rounded-xl py-2.5 px-4 font-extrabold text-xs transition-all cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {loadingCompare && <Loader2 size={13} className="animate-spin" />}
                    <span>Run Comparison</span>
                  </button>
                </form>

                {/* Matrix Result Card */}
                <div className="md:col-span-8 bg-white border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                  {compareResult ? (
                    <div className="divide-y divide-slate-100 dark:divide-dark-border animate-slide-up">
                      {/* Matrix Headings */}
                      <div className="grid grid-cols-3 bg-slate-100/60 dark:bg-zinc-800/40 p-4 font-bold text-[10px] text-slate-500 dark:text-dark-muted uppercase tracking-wider">
                        <span>Vehicle Type</span>
                        <span className="text-right">Guaranteed FD (~7%)</span>
                        <span className="text-right text-emerald-600 dark:text-brand-emerald">Growth Mutual Fund (~12%)</span>
                      </div>

                      {/* Invested Row */}
                      <div className="grid grid-cols-3 p-4 text-xs font-medium">
                        <span className="text-slate-500 dark:text-zinc-400">Total Invested</span>
                        <span className="text-right text-slate-800 dark:text-white">{formatINR(compareResult.lumpsumCompare.fd.invested)}</span>
                        <span className="text-right text-slate-800 dark:text-white">{formatINR(compareResult.lumpsumCompare.sip.invested)}</span>
                      </div>

                      {/* Interest Row */}
                      <div className="grid grid-cols-3 p-4 text-xs font-medium">
                        <span className="text-slate-500 dark:text-zinc-400">Yield Returns</span>
                        <span className="text-right text-emerald-600 dark:text-brand-emerald">+{formatINR(compareResult.lumpsumCompare.fd.interest)}</span>
                        <span className="text-right text-emerald-600 dark:text-brand-emerald">+{formatINR(compareResult.lumpsumCompare.sip.interest)}</span>
                      </div>

                      {/* Final Maturity Row */}
                      <div className="grid grid-cols-3 p-4 text-xs font-bold bg-slate-50/50 dark:bg-zinc-800/10">
                        <span className="text-slate-800 dark:text-white">Maturity Corpus</span>
                        <span className="text-right text-slate-800 dark:text-white">{formatINR(compareResult.lumpsumCompare.fd.maturity)}</span>
                        <span className="text-right text-emerald-600 dark:text-brand-emerald">{formatINR(compareResult.lumpsumCompare.sip.maturity)}</span>
                      </div>

                      {/* Growth Gap Bubble */}
                      <div className="p-4 bg-purple-50 dark:bg-purple-950/10 text-[10.5px] leading-relaxed text-purple-950/85 dark:text-zinc-300">
                        <div className="flex gap-2 items-start">
                          <Info className="text-purple-600 dark:text-brand-secondary shrink-0 mt-0.5" size={14} />
                          <span>
                            Equity markets introduce risk, but projecting at 12% yield generates an additional <strong>{formatINR(compareResult.lumpsumCompare.sip.maturity - compareResult.lumpsumCompare.fd.maturity)}</strong> over the Safe Fixed Deposit.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-xs text-slate-400 dark:text-dark-muted py-24">
                      Configure params to populate comparison matrix.
                    </div>
                  )}
                </div>
              </div>

              {/* Advisor commentary */}
              {compareAI && compareResult && (
                <div className="bg-slate-50 dark:bg-dark-card border border-blue-100 dark:border-brand-primary/20 rounded-2xl p-5 text-left">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="text-blue-600 dark:text-brand-primary shrink-0" size={16} />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-brand-primary uppercase tracking-wider">AI Financial Advisor</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                    "{compareAI}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              E) GOAL PLANNER TAB VIEW
              ========================================== */}
          {activeTab === 'goals' && (
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 animate-slide-up text-left space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Target size={20} className="text-blue-600 dark:text-brand-primary" />
                  <span>Interactive Goal Planner</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-muted mt-1">
                  Establish target buckets, calculate required monthly SIP allocations, and evaluate affordability against surplus.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Create Goal Form */}
                <form onSubmit={handleSaveGoal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Goal Name / Description</label>
                    <input
                      type="text"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder="e.g. Dream Car, Emergency Buffer"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Target sum (₹)</label>
                      <input
                        type="number"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        placeholder="500000"
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Tenure (Yrs)</label>
                      <input
                        type="number"
                        value={goalYears}
                        onChange={(e) => setGoalYears(e.target.value)}
                        placeholder="3"
                        className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingGoalCalc}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-primary dark:hover:bg-brand-secondary dark:text-dark-bg rounded-xl py-3 px-4 font-extrabold text-xs transition-all cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {loadingGoalCalc && <Loader2 size={13} className="animate-spin" />}
                    <span>Save & Compute Goal</span>
                  </button>
                </form>

                {/* Calculation breakdown */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl p-5 flex flex-col justify-between">
                  {goalCalculation ? (
                    <div className="space-y-4 animate-slide-up text-left">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Required Monthly Investment</span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-brand-emerald">{formatINR(goalCalculation.requiredSip)}/mo</span>
                      </div>
                      
                      <div className="border-t border-slate-200 dark:border-dark-border/60 pt-3.5 space-y-1.5">
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                          <span>Target Amount:</span>
                          <span className="font-bold text-slate-800 dark:text-white">{formatINR(goalCalculation.targetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                          <span>Investment Tenure:</span>
                          <span className="font-bold text-slate-800 dark:text-white">{goalCalculation.years} Years</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                          <span>Monthly Surplus Context:</span>
                          <span className={`font-bold ${globalContext.surplus >= goalCalculation.requiredSip ? 'text-emerald-600 dark:text-brand-emerald' : 'text-rose-600 dark:text-brand-rose'}`}>
                            {formatINR(globalContext.surplus)}/mo
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-dark-muted py-10">
                      Configure target metrics and calculate.
                    </div>
                  )}
                </div>
              </div>

              {/* Goal Advisor Commentary */}
              {goalAI && goalCalculation && (
                <div className="bg-slate-50 dark:bg-dark-card border border-blue-100 dark:border-brand-primary/20 rounded-2xl p-5 text-left">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="text-blue-600 dark:text-brand-primary shrink-0" size={16} />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-brand-primary uppercase tracking-wider">AI Financial Advisor</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                    "{goalAI}"
                  </p>
                </div>
              )}

              {/* Saved Goals Checklist list */}
              <div className="border-t border-slate-200 dark:border-dark-border/40 pt-6">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Active Savings Goals</h4>
                {loadingGoalsList ? (
                  <div className="flex justify-center py-6 text-slate-400 dark:text-dark-muted"><Loader2 className="animate-spin text-blue-600 dark:text-brand-primary" size={20} /></div>
                ) : goals.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-dark-muted text-center py-4 bg-slate-50 dark:bg-dark-card/20 border border-dashed border-slate-200 dark:border-dark-border rounded-xl">
                    No active goals configured yet. Complete the planner above.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {goals.map((g) => (
                      <div key={g.id} className="bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border p-4.5 rounded-2xl flex justify-between items-center group relative hover:border-blue-500/40 dark:hover:border-zinc-700/60 transition-all shadow-sm">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{g.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                            Target: <span className="font-semibold text-slate-800 dark:text-white">{formatINR(g.targetAmount)}</span> over {g.years} Yrs
                          </p>
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-brand-emerald">
                            Req SIP: {formatINR(g.requiredSip)}/mo
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="bg-transparent border-0 text-slate-400 hover:text-rose-600 dark:text-dark-muted dark:hover:text-brand-rose cursor-pointer transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      
      <div className="pt-2 mt-4" />
    </div>
  );
}
