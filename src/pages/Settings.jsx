import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Wallet, Landmark, PiggyBank, 
  Plus, Trash2, ArrowLeft, Save, Loader2,
  ShieldAlert, KeyRound, HelpCircle, Lock
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function Settings() {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Basic Account Details
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Security Question & Answer
  const [securityQuestion, setSecurityQuestion] = useState(
    user?.securityQuestion || 'What was the name of your first pet?'
  );
  const [securityAnswer, setSecurityAnswer] = useState(user?.securityAnswer || '');

  // Password Change Form States (Using Current Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Forgot Password Reset Form States (Recovery Flow)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recovering, setRecovering] = useState(false);

  // Liquid / Assets Baseline
  const [income, setIncome] = useState(user?.monthlyIncome || '');
  const [balance, setBalance] = useState(user?.bankBalance || '');
  const [savings, setSavings] = useState(user?.savings || '');

  // Fixed Commitments
  const [fixedExpenses, setFixedExpenses] = useState(
    user?.fixedExpenses && user.fixedExpenses.length > 0
      ? user.fixedExpenses.map(e => ({ name: e.name, amount: e.amount }))
      : [{ name: '', amount: '' }]
  );

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Theme management handled by global AuthContext

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

  // Submit standard details
  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (!name.trim() || !email.trim()) {
      setError('Name and Email are required.');
      setSaving(true);
      return;
    }

    if (!income || !balance) {
      setError('Please provide your monthly income and bank balance.');
      setSaving(false);
      return;
    }

    if (isNaN(Number(income)) || Number(income) < 0) {
      setError('Income must be a valid positive number.');
      setSaving(false);
      return;
    }

    if (isNaN(Number(balance)) || Number(balance) < 0) {
      setError('Bank balance must be a valid positive number.');
      setSaving(false);
      return;
    }

    const filteredExpenses = fixedExpenses
      .filter(item => item.name.trim() !== '' && !isNaN(parseFloat(item.amount)))
      .map(item => ({
        name: item.name.trim(),
        amount: parseFloat(item.amount),
      }));

    try {
      const result = await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        monthlyIncome: parseFloat(income),
        bankBalance: parseFloat(balance),
        savings: savings ? parseFloat(savings) : 0,
        fixedExpenses: filteredExpenses,
        securityQuestion: securityQuestion.trim(),
        securityAnswer: securityAnswer.trim(),
      });

      if (result.success) {
        setSuccess('Foundations and profile settings updated successfully.');
      } else {
        setError(result.error || 'Failed to update settings. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle standard password change (with current password verification)
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.message || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle forgot password recovery reset (via security question validation)
  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    if (!recoveryAnswer) {
      setRecoveryError('Security answer is required.');
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryError('New passwords do not match.');
      return;
    }

    if (recoveryNewPassword.length < 6) {
      setRecoveryError('New password must be at least 6 characters.');
      return;
    }

    setRecovering(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          securityAnswer: recoveryAnswer,
          newPassword: recoveryNewPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRecoverySuccess('Password reset successfully. You can now use your new password.');
        setRecoveryAnswer('');
        setRecoveryNewPassword('');
        setRecoveryConfirmPassword('');
        setTimeout(() => {
          setShowForgotModal(false);
          setRecoverySuccess('');
        }, 3000);
      } else {
        setRecoveryError(data.message || 'Failed to verify answer or reset password.');
      }
    } catch (err) {
      setRecoveryError('An unexpected error occurred.');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans animate-slide-up text-left">
      
      {/* Header and Back Button */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 dark:bg-dark-panel dark:hover:bg-dark-card dark:text-zinc-400 dark:border-dark-border p-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none mb-1.5">
            Settings & Control Panel
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs">
            Review credentials, adjust theme settings, modify account balances, and update security questions.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-xs p-4 rounded-xl animate-slide-up">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-xs p-4 rounded-xl animate-slide-up">
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Settings Cards (Onboarding, credentials, password forms) */}
        <div className="md:col-span-8 space-y-6">
          
          <form onSubmit={handleSubmitProfile} className="space-y-6">
            
            {/* Card 1: Account Info */}
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-dark-border/50 pb-2 mb-2">
                Account Credentials
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Milan"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="milan@example.com"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Financial Reserves */}
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-dark-border/50 pb-2 mb-2">
                Liquid Metrics & Reserves
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Monthly Income */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Monthly Income (Net Salary)
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <input
                      type="number"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Current Bank Balance */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Current Bank Balance
                  </label>
                  <div className="relative">
                    <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <input
                      type="number"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      placeholder="e.g. 300000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Existing Savings */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Existing Savings / Buffer
                  </label>
                  <div className="relative">
                    <PiggyBank className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <input
                      type="number"
                      value={savings}
                      onChange={(e) => setSavings(e.target.value)}
                      placeholder="e.g. 500000"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Security Question Settings */}
            <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-dark-border/50 pb-2 mb-2">
                Recovery Security Configuration
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Security Reset Question
                  </label>
                  <div className="relative">
                    <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <select
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary appearance-none"
                    >
                      <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                      <option value="In what city were you born?">In what city were you born?</option>
                      <option value="What was the name of your first school?">What was the name of your first school?</option>
                      <option value="What is your favorite financial asset?">What is your favorite financial asset?</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Security Reset Answer (Case-Insensitive)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-muted" size={16} />
                    <input
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="e.g. Buddy"
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-dark-muted mt-1 leading-normal">
                Used to recover password if forgotten. Configure this answer carefully!
              </p>
            </div>

            {/* Save Profile Button bar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-brand-primary dark:text-dark-bg dark:hover:bg-brand-secondary rounded-xl py-3 px-8 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="animate-spin text-inherit" size={14} />
                ) : (
                  <Save size={14} />
                )}
                <span>Save Foundations & Security</span>
              </button>
            </div>
          </form>

          {/* Card 5: Change Password Form */}
          <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-dark-border/50 pb-2 mb-4 flex items-center gap-2">
              <KeyRound className="text-brand-secondary" size={18} />
              <span>Update Password Credentials</span>
            </h3>

            {passwordError && (
              <div className="mb-4 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-xs p-3.5 rounded-xl text-left animate-slide-up">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-xs p-3.5 rounded-xl text-left animate-slide-up">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-left">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                    Current Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryError('');
                      setRecoverySuccess('');
                      setShowForgotModal(true);
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-brand-primary hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Forgot current password?
                  </button>
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-slate-800 hover:bg-slate-900 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl py-2.5 px-6 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {changingPassword && <Loader2 className="animate-spin mr-1.5 inline" size={12} />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Fixed Commitments */}
        <div className="md:col-span-4 bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 flex flex-col justify-between min-h-[460px] shadow-sm">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-dark-border/50 pb-2 mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Fixed Obligations
              </h3>
              <button
                type="button"
                onClick={handleAddFixed}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-brand-primary hover:text-blue-700 dark:hover:text-brand-secondary bg-transparent border-0 cursor-pointer font-semibold"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {fixedExpenses.map((expense, index) => (
                <div key={index} className="flex gap-2 items-center animate-slide-up">
                  <input
                    type="text"
                    value={expense.name}
                    onChange={(e) => handleFixedChange(index, 'name', e.target.value)}
                    placeholder="e.g. Rent, EMI, WiFi"
                    className="flex-1 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                    required
                  />
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => handleFixedChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="w-20 md:w-28 bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary transition-all"
                    required
                  />
                  {fixedExpenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFixed(index)}
                      className="bg-transparent border-0 hover:text-brand-rose text-slate-400 dark:text-dark-muted p-2 cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Commitments Summary */}
          <div className="bg-slate-50 border border-slate-100 dark:bg-dark-card/50 dark:border-dark-border/50 rounded-2xl p-4.5 mt-6">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Total Monthly Fixed Commitments:</span>
              <span className="text-brand-rose font-bold text-sm">
                {formatINR(calculateTotalFixed())}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Panel */}
      <div className="border-t border-slate-200 dark:border-dark-border/40 pt-6 mt-8 flex flex-col md:flex-row gap-6 justify-end items-center">

        <div className="flex gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full md:w-auto bg-transparent border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-dark-border dark:hover:bg-zinc-800 dark:text-zinc-400 rounded-xl py-3 px-6 font-semibold text-xs transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* --- RECOVERY SECURITY QUESTION RESET MODAL --- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-dark-bg/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 shadow-2xl relative animate-slide-up text-left">
            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight mb-2 flex items-center gap-2">
              <ShieldAlert className="text-brand-rose" size={20} />
              <span>Forgot Password Recovery</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-muted mb-5 leading-normal">
              Answer your preset security verification question below to override credentials.
            </p>

            {recoveryError && (
              <div className="mb-4 bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-xs p-3.5 rounded-xl text-left">
                {recoveryError}
              </div>
            )}

            {recoverySuccess && (
              <div className="mb-4 bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-xs p-3.5 rounded-xl text-left">
                {recoverySuccess}
              </div>
            )}

            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Preset Question
                </span>
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border p-3 rounded-xl">
                  {user.securityQuestion || "No security question configured yet."}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Your Answer
                </label>
                <input
                  type="text"
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  placeholder="Security question answer"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  New Password
                </label>
                <input
                  type="password"
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={recoveryConfirmPassword}
                  onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-brand-primary"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="bg-transparent border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-dark-border dark:hover:bg-zinc-800 dark:text-zinc-400 rounded-xl py-2.5 px-4 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recovering}
                  className="bg-brand-rose hover:bg-rose-600 text-white rounded-xl py-2.5 px-4 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {recovering && <Loader2 size={12} className="animate-spin" />}
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
