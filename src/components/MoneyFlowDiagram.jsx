import React from 'react';
import { ArrowRight, Minus, ArrowDown, Wallet, ShieldX, Receipt, BadgeIndianRupee } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function MoneyFlowDiagram({ income, fixedCosts, variableSpend, surplus }) {
  return (
    <div className="bg-white border border-slate-200 dark:bg-dark-panel dark:border-dark-border rounded-3xl p-6 md:p-8 animate-slide-up relative overflow-hidden shadow-sm">
      {/* Decorative background overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-1/2 bg-blue-500/5 dark:bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white tracking-wide mb-6 text-left flex items-center gap-2">
        <BadgeIndianRupee className="text-blue-600 dark:text-brand-primary animate-pulse" size={20} />
        <span>Surplus Money Flow Engine</span>
      </h2>

      {/* Horizontal Flow layout on desktop, stacked layout on mobile */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3 relative z-10 w-full">
        
        {/* Node 1: Gross Monthly Income */}
        <div className="w-full md:w-[22%] bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl p-5 md:p-6 shadow-sm hover:border-emerald-500/40 dark:hover:border-brand-emerald/40 transition-all duration-300 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-emerald-600 dark:text-brand-emerald uppercase tracking-wider">Source</span>
            <Wallet className="text-emerald-600 dark:text-brand-emerald" size={16} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Monthly Income</p>
          <p className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatINR(income)}</p>
        </div>

        {/* Math connector: Minus fixed costs */}
        <div className="flex items-center justify-center shrink-0 my-1 md:my-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 border border-slate-200 dark:bg-dark-card dark:border-dark-border shadow-sm dark:shadow-[0_0_10px_rgba(204,128,133,0.1)]">
            <span className="md:hidden"><ArrowDown size={16} className="text-rose-600 dark:text-brand-rose" /></span>
            <span className="hidden md:block"><Minus size={16} className="text-rose-600 dark:text-brand-rose" /></span>
          </div>
        </div>

        {/* Node 2: Fixed Obligations */}
        <div className="w-full md:w-[22%] bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl p-5 md:p-6 shadow-sm hover:border-rose-500/40 dark:hover:border-brand-rose/40 transition-all duration-300 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-rose-600 dark:text-brand-rose uppercase tracking-wider">Commitments</span>
            <ShieldX className="text-rose-600 dark:text-brand-rose" size={16} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Fixed Expenses</p>
          <p className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatINR(fixedCosts)}</p>
        </div>

        {/* Math connector: Minus variable expenses */}
        <div className="flex items-center justify-center shrink-0 my-1 md:my-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 border border-slate-200 dark:bg-dark-card dark:border-dark-border shadow-sm dark:shadow-[0_0_10px_rgba(204,128,133,0.1)]">
            <span className="md:hidden"><ArrowDown size={16} className="text-rose-600 dark:text-brand-rose" /></span>
            <span className="hidden md:block"><Minus size={16} className="text-rose-600 dark:text-brand-rose" /></span>
          </div>
        </div>

        {/* Node 3: Living / Variable Expenses */}
        <div className="w-full md:w-[22%] bg-slate-50 border border-slate-200 dark:bg-dark-card dark:border-dark-border rounded-2xl p-5 md:p-6 shadow-sm hover:border-orange-500/40 dark:hover:border-orange-400/40 transition-all duration-300 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">Living</span>
            <Receipt className="text-orange-600 dark:text-orange-400" size={16} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Avg Variable Spend</p>
          <p className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatINR(variableSpend)}</p>
        </div>

        {/* Math connector: Equals Surplus */}
        <div className="flex items-center justify-center shrink-0 my-1 md:my-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 border border-slate-200 dark:bg-dark-card dark:border-dark-border shadow-sm dark:shadow-[0_0_10px_rgba(136,189,242,0.1)]">
            <span className="md:hidden"><ArrowDown size={16} className="text-blue-600 dark:text-brand-primary" /></span>
            <span className="hidden md:block"><ArrowRight size={16} className="text-blue-600 dark:text-brand-primary" /></span>
          </div>
        </div>

        {/* Node 4: Real Surplus */}
        <div className={`w-full md:w-[22%] bg-slate-50 dark:bg-dark-card border rounded-2xl p-5 md:p-6 shadow-sm hover:border-blue-500/40 dark:hover:border-brand-primary/40 transition-all duration-300 text-left ${
          surplus >= 0 
            ? 'border-slate-200 dark:border-brand-primary/40' 
            : 'border-rose-200 dark:border-brand-rose/40'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-blue-600 dark:text-brand-primary uppercase tracking-wider">Investable</span>
            <BadgeIndianRupee className="text-blue-600 dark:text-brand-primary" size={16} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-1">Real Monthly Surplus</p>
          <p className={`text-lg md:text-xl font-extrabold tracking-tight ${
            surplus >= 0 
              ? 'text-slate-800 dark:text-white' 
              : 'text-rose-600 dark:text-brand-rose'
          }`}>
            {formatINR(surplus)}
          </p>
        </div>

      </div>

      <div className="mt-6 text-left bg-slate-50 border border-slate-100 dark:bg-dark-card/40 dark:border-dark-border/40 rounded-xl p-4 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-brand-primary animate-pulse shrink-0" />
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
          {surplus >= 0 
            ? `Fantastic! You have a surplus of ${formatINR(surplus)} that can be allocated directly to wealth accumulation, FD interest buffers, or SIPs.`
            : `Warning: Your average monthly expenses exceed your income. Trim variable spending or negotiate fixed costs to establish a positive surplus.`}
        </p>
      </div>
    </div>
  );
}

