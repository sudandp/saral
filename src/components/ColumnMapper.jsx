import React from 'react';
import { Columns3, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { REQUIRED_SALARY_COMPONENTS } from '../services/salaryValidator';

export default function ColumnMapper({
  isOpen,
  onClose,
  headers = [],
  mapping = {},
  onMappingChange,
  onApply,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Configurable Column Mapping</h3>
              <p className="text-xs text-slate-500">
                Map columns from your Saral template to the required payroll components.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REQUIRED_SALARY_COMPONENTS.map((comp) => {
              const selectedIndex = mapping[comp.key];
              const isMapped = selectedIndex !== null && selectedIndex !== undefined && selectedIndex >= 0;

              return (
                <div
                  key={comp.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isMapped
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : comp.required
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      {comp.label}
                      {comp.required && <span className="text-rose-500 font-bold">*</span>}
                    </label>

                    {isMapped ? (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mapped
                      </span>
                    ) : comp.required ? (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Required
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Optional</span>
                    )}
                  </div>

                  <select
                    value={selectedIndex !== null && selectedIndex !== undefined ? selectedIndex : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      onMappingChange(comp.key, val);
                    }}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Not Mapped / Ignore --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        Col {idx + 1}: {h || `(Column ${idx + 1})`}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            *Red asterisks denote critical columns required for full Saral payroll restructuring.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              Apply Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

