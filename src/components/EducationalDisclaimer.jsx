import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function EducationalDisclaimer() {
  return (
    <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-xl p-4 flex gap-3 text-left animate-slide-up">
      <div className="text-yellow-500 shrink-0 mt-0.5">
        <ShieldAlert size={20} />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-yellow-500 mb-1">
          Educational & Informational Only
        </h4>
        <p className="text-xs text-yellow-600/90 leading-relaxed">
          All financial calculations, projections, and AI-generated advisory commentary in this application are for 
          <strong> educational and illustrative purposes only</strong>. They do not constitute formal investment advice, 
          legal advice, or tax advice. Fixed Deposits and Mutual Funds are subject to risks, including potential loss of 
          principal. Please consult a qualified, registered financial planner before making actual financial commitments.
        </p>
      </div>
    </div>
  );
}
