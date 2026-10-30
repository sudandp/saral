import React, { useState } from 'react';
import { Settings, ShieldCheck, AlertCircle, Info, RefreshCw, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import {
  PRESERVATION_MODES,
  ROUNDING_MODES,
  BASIC_CALCULATION_METHODS,
  ELIGIBILITY_MODES,
} from '../services/salaryCalculator';

export default function SalarySettings({
  config,
  onChange,
  onReset,
}) {
  const [showEmployerBreakdown, setShowEmployerBreakdown] = useState(false);

  const handleChange = (field, value) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  // Sync employer PF breakdown rates
  const handleBreakdownChange = (field, val) => {
    const updated = {
      ...config,
      [field]: val,
    };
    const total = (
      (field === 'employerEPFRate' ? val : (config.employerEPFRate || 0)) +
      (field === 'employerEPSRate' ? val : (config.employerEPSRate || 0)) +
      (field === 'employerEDLIRate' ? val : (config.employerEDLIRate || 0)) +
      (field === 'employerAdminRate' ? val : (config.employerAdminRate || 0))
    );
    updated.employerPFRate = Math.round(total * 100) / 100;
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Salary Restructuring Configuration</h2>
            <p className="text-xs text-slate-500">
              Statutory PF rules, basic calculation method, allowance balancing, and preservation modes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Section 1: Basic Calculation Method */}
      <div className="mb-6 pb-6 border-b border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-emerald-600" />
          Basic Restructuring Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Method 1: Goal Seek */}
          <div
            onClick={() => handleChange('basicMethod', BASIC_CALCULATION_METHODS.GOAL_SEEK)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              config.basicMethod === BASIC_CALCULATION_METHODS.GOAL_SEEK
                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Goal Seek Target Basic</span>
              <input
                type="radio"
                name="basicMethod"
                checked={config.basicMethod === BASIC_CALCULATION_METHODS.GOAL_SEEK}
                onChange={() => handleChange('basicMethod', BASIC_CALCULATION_METHODS.GOAL_SEEK)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Derives Basic to match Target PF Wage (`Basic = Target PF Wage - DA`).
            </p>
          </div>

          {/* Method 2: Percentage */}
          <div
            onClick={() => handleChange('basicMethod', BASIC_CALCULATION_METHODS.PERCENTAGE)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              config.basicMethod === BASIC_CALCULATION_METHODS.PERCENTAGE
                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Percentage of Gross</span>
              <input
                type="radio"
                name="basicMethod"
                checked={config.basicMethod === BASIC_CALCULATION_METHODS.PERCENTAGE}
                onChange={() => handleChange('basicMethod', BASIC_CALCULATION_METHODS.PERCENTAGE)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Sets Basic as a fixed percentage of Gross Salary (e.g. 50% or 40%).
            </p>
          </div>

          {/* Method 3: Manual Target */}
          <div
            onClick={() => handleChange('basicMethod', BASIC_CALCULATION_METHODS.MANUAL_TARGET)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              config.basicMethod === BASIC_CALCULATION_METHODS.MANUAL_TARGET
                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Manual Target Basic</span>
              <input
                type="radio"
                name="basicMethod"
                checked={config.basicMethod === BASIC_CALCULATION_METHODS.MANUAL_TARGET}
                onChange={() => handleChange('basicMethod', BASIC_CALCULATION_METHODS.MANUAL_TARGET)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Applies a uniform fixed Target Basic across all employees.
            </p>
          </div>
        </div>

        {/* Dynamic Parameter based on method */}
        <div className="mt-4 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-wrap items-center gap-4">
          {config.basicMethod === BASIC_CALCULATION_METHODS.GOAL_SEEK && (
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="target-pf-wage" className="block text-xs font-bold text-slate-700 mb-1">
                Target PF Wage (₹)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold">₹</span>
                <input
                  id="target-pf-wage"
                  type="number"
                  min="0"
                  step="500"
                  value={config.targetPFWage}
                  onChange={(e) => handleChange('targetPFWage', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Target qualifying wage for PF calculation (default ₹25,000).
              </span>
            </div>
          )}

          {config.basicMethod === BASIC_CALCULATION_METHODS.PERCENTAGE && (
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="basic-pct" className="block text-xs font-bold text-slate-700 mb-1">
                Basic as Percentage of Gross (%)
              </label>
              <div className="relative max-w-xs">
                <input
                  id="basic-pct"
                  type="number"
                  min="10"
                  max="100"
                  step="1"
                  value={config.basicPercentage}
                  onChange={(e) => handleChange('basicPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Sets New Basic = {config.basicPercentage}% of each employee's Gross salary.
              </span>
            </div>
          )}

          {config.basicMethod === BASIC_CALCULATION_METHODS.MANUAL_TARGET && (
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="manual-basic" className="block text-xs font-bold text-slate-700 mb-1">
                Manual Target Basic Amount (₹)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold">₹</span>
                <input
                  id="manual-basic"
                  type="number"
                  min="0"
                  step="500"
                  value={config.manualTargetBasic}
                  onChange={(e) => handleChange('manualTargetBasic', parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Sets New Basic directly to ₹{Number(config.manualTargetBasic).toLocaleString()} for all employees.
              </span>
            </div>
          )}

          <div className="text-xs text-slate-500 italic flex items-center gap-1.5 self-end pb-1">
            <Info className="w-4 h-4 text-slate-400" />
            Any difference between old and new Basic is automatically transferred to/from Variable Allowance.
          </div>
        </div>
      </div>

      {/* Section 2: PF Statutory Rates & Ceilings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Statutory Ceiling */}
        <div>
          <label htmlFor="statutory-ceiling" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Statutory PF Ceiling (₹)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">₹</span>
            <input
              id="statutory-ceiling"
              type="number"
              min="0"
              step="500"
              value={config.statutoryCeilingLimit}
              onChange={(e) => handleChange('statutoryCeilingLimit', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={config.applyStatutoryCeiling}
              onChange={(e) => handleChange('applyStatutoryCeiling', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            Cap PF contribution at ₹{Number(config.statutoryCeilingLimit).toLocaleString()}
          </label>
        </div>

        {/* Employer PF Rate with Breakdown Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="employer-pf-rate" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Employer PF Total (%)
            </label>
            <button
              type="button"
              onClick={() => setShowEmployerBreakdown(!showEmployerBreakdown)}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
            >
              {showEmployerBreakdown ? 'Hide Breakdown' : 'Breakdown (EPF/EPS/EDLI)'}
              {showEmployerBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <div className="relative">
            <input
              id="employer-pf-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={config.employerPFRate}
              onChange={(e) => handleChange('employerPFRate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-medium">%</span>
          </div>

          {/* Collapsible Breakdown */}
          {showEmployerBreakdown && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">EPF Rate:</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.employerEPFRate}
                  onChange={(e) => handleBreakdownChange('employerEPFRate', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-right font-medium border border-slate-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">EPS (Pension) Rate:</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.employerEPSRate}
                  onChange={(e) => handleBreakdownChange('employerEPSRate', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-right font-medium border border-slate-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">EDLI (Insurance) Rate:</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.employerEDLIRate}
                  onChange={(e) => handleBreakdownChange('employerEDLIRate', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-right font-medium border border-slate-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Admin Charges:</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.employerAdminRate}
                  onChange={(e) => handleBreakdownChange('employerAdminRate', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-right font-medium border border-slate-300 rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Employee PF Rate */}
        <div>
          <label htmlFor="employee-pf-rate" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Employee PF Rate (%)
          </label>
          <div className="relative">
            <input
              id="employee-pf-rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={config.employeePFRate}
              onChange={(e) => handleChange('employeePFRate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-medium">%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard employee deduction (12%).
          </p>
        </div>
      </div>

      {/* Section 3: Preservation & Rounding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100 mb-6">
        {/* Preservation Mode */}
        <div>
          <label htmlFor="preservation-mode" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Salary Preservation Mode
          </label>
          <select
            id="preservation-mode"
            value={config.preservationMode}
            onChange={(e) => handleChange('preservationMode', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={PRESERVATION_MODES.SALARY_NEUTRAL}>
              Salary Neutral Restructuring (Recommended - Column K Pattern)
            </option>
            <option value={PRESERVATION_MODES.RECALCULATE_ALL}>
              Recalculate all values (Standard Restructuring)
            </option>
            <option value={PRESERVATION_MODES.PRESERVE_CTC_NET}>
              Preserve CTC and Net Salary (Strict mathematical validation)
            </option>
            <option value={PRESERVATION_MODES.PRESERVE_GROSS_NET}>
              Preserve Gross and Net Salary (Strict mathematical validation)
            </option>
            <option value={PRESERVATION_MODES.PRESERVE_GROSS_CTC_NET}>
              Preserve Gross, CTC and Net Salary (Strict mathematical validation)
            </option>
          </select>
        </div>

        {/* Rounding Method */}
        <div>
          <label htmlFor="rounding-mode" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Rounding Method
          </label>
          <select
            id="rounding-mode"
            value={config.roundingMode}
            onChange={(e) => handleChange('roundingMode', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={ROUNDING_MODES.ROUND}>Nearest Rupee (e.g. ₹25,000.40 → ₹25,000)</option>
            <option value={ROUNDING_MODES.CEIL}>Round Up (Ceiling)</option>
            <option value={ROUNDING_MODES.FLOOR}>Round Down (Floor)</option>
            <option value={ROUNDING_MODES.EXACT}>Exact (Two decimal places)</option>
            <option value={ROUNDING_MODES.DECIMAL_4}>Four Decimal Places (Sudhan Reference Match)</option>
          </select>
        </div>
      </div>

      {/* Section 4: Wage Components & Employee Eligibility Options */}
      <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeDAInPF}
              onChange={(e) => handleChange('includeDAInPF', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            Include DA in PF-qualifying wages (Basic + DA)
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={config.excludeStandardDeduction}
              disabled
              readOnly
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 bg-slate-100"
            />
            <span>Exclude Standard Deduction from PF wages (Mandatory)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            <input
              type="checkbox"
              checked={config.excludeNonPFEligible}
              onChange={(e) => handleChange('excludeNonPFEligible', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Exclude non-PF employees (Leave employees with ₹0 current PF unchanged)</span>
          </label>
        </div>
      </div>

      {/* Mandatory Statutory Confirmation */}
      <div className={`mt-5 p-4 rounded-xl border transition-colors ${
        config.confirmedStatutory
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-300'
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.confirmedStatutory}
            onChange={(e) => handleChange('confirmedStatutory', e.target.checked)}
            className="w-5 h-5 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
          />
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider block ${
              config.confirmedStatutory ? 'text-emerald-900' : 'text-amber-900'
            }`}>
              Statutory Applicability Confirmation (Required)
            </span>
            <p className={`text-xs mt-0.5 ${
              config.confirmedStatutory ? 'text-emerald-800' : 'text-amber-800'
            }`}>
              I confirm that the configured PF rates ({config.employerPFRate}% ER / {config.employeePFRate}% EE),
              qualifying wages, and ceiling parameters comply with statutory labor laws and company payroll policies.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
