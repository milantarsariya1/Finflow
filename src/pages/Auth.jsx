import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Wallet, ShieldCheck, Mail, Lock, User, ArrowRight, ShieldAlert, HelpCircle, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password recovery states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter email, 2: Answer question & reset
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      setForgotLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/auth/security-question?email=${encodeURIComponent(forgotEmail.trim())}`);
      const data = await res.json();

      if (res.ok) {
        if (data.securityQuestion) {
          setRecoveryQuestion(data.securityQuestion);
          setForgotStep(2);
        } else {
          setForgotError('This account does not have a security question configured. Please contact support.');
        }
      } else {
        setForgotError(data.message || 'Could not retrieve security question for this email.');
      }
    } catch (err) {
      setForgotError('An unexpected error occurred. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!recoveryAnswer.trim()) {
      setForgotError('Security answer is required.');
      return;
    }

    if (!recoveryNewPassword) {
      setForgotError('New password is required.');
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    if (recoveryNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          securityAnswer: recoveryAnswer.trim(),
          newPassword: recoveryNewPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setForgotSuccess('Password reset successfully. You can now log in.');
        setRecoveryAnswer('');
        setRecoveryNewPassword('');
        setRecoveryConfirmPassword('');
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotSuccess('');
        }, 3000);
      } else {
        setForgotError(data.message || 'Incorrect security answer or reset failed.');
      }
    } catch (err) {
      setForgotError('An unexpected error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const action = isLogin 
        ? await login(email, password) 
        : await signup(name, email, password);

      if (action.success) {
        // Redirection logic: if onboarding was never completed (e.g. monthlyIncome is 0), go to onboarding, else to dashboard
        // Wait, how do we know if onboarding is complete? We can check inside AuthContext or fetch right after.
        // Let's navigate to a temporary loading router or directly based on standard dashboard checks
        navigate('/');
      } else {
        setError(action.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100/40 dark:bg-brand-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-slate-200/40 dark:bg-brand-secondary/10 rounded-full blur-[120px]" />

      <div className="max-w-5xl w-full grid md:grid-cols-12 bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl overflow-hidden shadow-2xl z-10 animate-slide-up">
        {/* Left Side: Branding / Marketing */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-50/50 via-blue-50/20 to-slate-100/30 dark:from-slate-900/40 dark:via-zinc-800/10 dark:to-dark-panel p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 border-b-slate-200 dark:border-dark-border">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-blue-600 dark:bg-brand-primary p-2.5 rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-brand-primary/20 text-white">
                <TrendingUp size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                Finflow
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-slate-800 dark:text-white tracking-tight mb-4">
              Real Surplus Engine & Smart Advisory
            </h1>
            <p className="text-slate-500 dark:text-dark-muted text-sm leading-relaxed mb-6">
              Track your variable spend, filter fixed commitments, evaluate emergency reserves, and construct calculated scenarios for FDs and Mutual Funds (SIP) with data-driven AI counseling.
            </p>

            <ul className="space-y-3.5">
              <li className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-300">
                <Wallet size={16} className="text-emerald-600 dark:text-brand-emerald shrink-0" />
                <span>Calculate true surplus, subtracting fixed obligations</span>
              </li>
              <li className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-300">
                <ShieldCheck size={16} className="text-blue-600 dark:text-brand-primary shrink-0" />
                <span>6x fixed expense emergency shield diagnostics</span>
              </li>
              <li className="flex items-center gap-3 text-xs text-slate-600 dark:text-zinc-300">
                <TrendingUp size={16} className="text-slate-400 dark:text-brand-secondary shrink-0" />
                <span>Compound simulations + Scenario comparisons</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-dark-border/40">
            <p className="text-[10px] text-slate-400 dark:text-dark-muted uppercase tracking-wider mb-2">Developed With</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
              <span>React Vite</span>
              <span className="text-slate-300 dark:text-dark-border">•</span>
              <span>Groq AI</span>
              <span className="text-slate-300 dark:text-dark-border">•</span>
              <span>SQLite</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Inputs */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-slate-50/50 dark:bg-dark-card/35 border-t border-slate-100 md:border-t-0">
          <div className="w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-500 dark:text-dark-muted text-sm mb-6">
              {isLogin ? 'Access your dashboard and financial plans.' : 'Get started by establishing your secure credentials.'}
            </p>

            {error && (
              <div className="mb-5 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-xs p-3.5 rounded-xl text-left animate-slide-up">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all duration-300"
                    required
                  />
                </div>
                {isLogin && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotError('');
                        setForgotSuccess('');
                        setForgotEmail(email);
                        setForgotStep(1);
                        setShowForgotModal(true);
                      }}
                      className="text-xs text-blue-600 dark:text-brand-primary hover:text-blue-700 dark:hover:text-brand-secondary hover:underline bg-transparent border-0 cursor-pointer focus:outline-none font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-gradient-to-r dark:from-brand-primary dark:to-brand-secondary dark:text-dark-bg rounded-xl py-3 px-4 font-bold text-sm hover:from-brand-secondary hover:to-brand-primary focus:outline-none transition-all duration-300 flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/10 dark:shadow-none"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Login to Account' : 'Sign Up Now'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-xs text-blue-600 dark:text-brand-primary hover:underline bg-transparent border-0 cursor-pointer focus:outline-none font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
              </button>
            </div>

            <div className="mt-4" />
          </div>
        </div>
      </div>

      {/* --- FORGOT PASSWORD MODAL --- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-dark-bg/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 shadow-2xl relative animate-slide-up text-left text-slate-800 dark:text-white">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight mb-2 flex items-center gap-2">
              <ShieldAlert className="text-rose-600 dark:text-brand-rose" size={20} />
              <span>Forgot Password Recovery</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mb-5 leading-normal">
              Recover your password using your configured security question.
            </p>

            {forgotError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-brand-rose/10 dark:border-brand-rose/30 dark:text-brand-rose text-xs p-3.5 rounded-xl text-left animate-slide-up">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-brand-emerald/10 dark:border-brand-emerald/30 dark:text-brand-emerald text-xs p-3.5 rounded-xl text-left animate-slide-up">
                {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleFetchQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={18} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:border-dark-border dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-xl py-2.5 px-4 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-primary dark:hover:bg-brand-secondary dark:text-dark-bg font-bold rounded-xl py-2.5 px-4 text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {forgotLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>Get Question</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                    Security Question
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border p-3.5 rounded-xl leading-normal flex items-start gap-2">
                    <HelpCircle size={16} className="text-slate-400 dark:text-brand-secondary shrink-0 mt-0.5" />
                    <span>{recoveryQuestion}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">Your Answer</label>
                  <input
                    type="text"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    placeholder="Enter answer"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 uppercase tracking-wider mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:border-dark-border dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-xl py-2.5 px-4 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white dark:bg-brand-rose dark:hover:bg-rose-600 dark:text-white rounded-xl py-2.5 px-4 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {forgotLoading && <Loader2 size={12} className="animate-spin" />}
                    <span>Reset Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
