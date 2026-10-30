import React from 'react';
import { Users, CheckCircle2, AlertTriangle, TrendingUp, UserX } from 'lucide-react';

export default function SummaryCards({ stats, results }) {
  let totalDeltaBasic = 0;
  let totalDeltaPF = 0;
  let totalEmployerCostDiff = stats?.totalEmployerCostDiff || 0;

  if (results && results.length > 0) {
    results.forEach((r) => {
      totalDeltaBasic += (r.deltaBasic || 0);
      totalDeltaPF += (r.deltaPF || 0);
    });
  }

  const formatCurrency = (val) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}₹${Math.abs(Math.round(val)).toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Employees */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Employees
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.total : 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {stats?.excluded ? `${stats.excluded} excluded • ` : ''}
            {stats?.emptyRowsSkipped ? `${stats.emptyRowsSkipped} blank skipped` : 'Detected in sheet'}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Successfully Processed */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Successfully Validated
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {stats ? stats.valid : 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Clean restructuring
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* Requiring Review */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Requiring Review
          </p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {stats ? stats.requiresReview : 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Negative allowance or variance
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* Total Monthly Employer Cost Difference */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Monthly Employer Cost Diff
          </p>
          <p className={`text-xl font-black mt-1 ${
            totalEmployerCostDiff > 0 ? 'text-indigo-700' : totalEmployerCostDiff < 0 ? 'text-emerald-700' : 'text-slate-900'
          }`}>
            {formatCurrency(totalEmployerCostDiff)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Net Basic: <span className="font-semibold text-slate-800">{formatCurrency(totalDeltaBasic)}</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
