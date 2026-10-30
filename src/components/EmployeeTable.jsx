import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UserX,
  Edit2,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function EmployeeTable({
  results = [],
  overrides = {},
  onToggleExclude,
  onSetCustomBasic,
  onResetOverride,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'REVIEW' | 'EXCLUDED'
  const [expandedRows, setExpandedRows] = useState({});
  const [editingBasicFor, setEditingBasicFor] = useState(null);
  const [tempBasicValue, setTempBasicValue] = useState('');
  const [isCompact, setIsCompact] = useState(true); // Compact fit mode by default to show all columns on screen
  const [pageSize, setPageSize] = useState('ALL'); // 'ALL' | 25 | 50 | 100
  const [currentPage, setCurrentPage] = useState(1);

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleStartEditBasic = (empId, currentBasic, e) => {
    e.stopPropagation();
    setEditingBasicFor(empId);
    setTempBasicValue(String(currentBasic || ''));
  };

  const handleSaveEditBasic = (empId, e) => {
    e.stopPropagation();
    const val = parseFloat(tempBasicValue);
    if (!isNaN(val) && val >= 0) {
      onSetCustomBasic(empId, val);
    }
    setEditingBasicFor(null);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingBasicFor(null);
  };

  const filteredResults = useMemo(() => {
    return results.filter((res) => {
      const matchesSearch =
        (res.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (res.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'VALID' && res.status === 'VALID') ||
        (statusFilter === 'REVIEW' && res.status === 'REVIEW') ||
        (statusFilter === 'EXCLUDED' && res.status === 'EXCLUDED');

      return matchesSearch && matchesStatus;
    });
  }, [results, searchTerm, statusFilter]);

  // Pagination calculation
  const totalRecords = filteredResults.length;
  const isAllPages = pageSize === 'ALL';
  const effectivePageSize = isAllPages ? (totalRecords || 1) : Number(pageSize);
  const totalPages = isAllPages ? 1 : Math.ceil(totalRecords / effectivePageSize);
  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedResults = useMemo(() => {
    if (isAllPages) return filteredResults;
    const start = (safePage - 1) * effectivePageSize;
    return filteredResults.slice(start, start + effectivePageSize);
  }, [filteredResults, isAllPages, safePage, effectivePageSize]);

  const formatCurr = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '₹0';
    return `₹${Math.round(Number(val)).toLocaleString()}`;
  };

  const renderDelta = (delta, isReverseGood = false) => {
    const rounded = Math.round(delta || 0);
    if (rounded === 0) return <span className="text-slate-400 text-xs ml-1">(0)</span>;
    const isPositive = rounded > 0;
    const color = isPositive
      ? (isReverseGood ? 'text-rose-600' : 'text-emerald-700')
      : (isReverseGood ? 'text-emerald-700' : 'text-rose-600');
    return (
      <span className={`text-[10px] font-semibold ${color} ml-1`}>
        ({isPositive ? '+' : ''}{rounded.toLocaleString()})
      </span>
    );
  };

  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <p className="text-slate-500 font-medium">No employee records processed yet.</p>
        <p className="text-xs text-slate-400 mt-1">Upload an Excel file or load sample data and click "Preview Calculations" or "Process All Employees".</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] flex-wrap items-center">
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({results.length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('VALID'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'VALID'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Valid ({results.filter((r) => r.status === 'VALID').length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('REVIEW'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'REVIEW'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Review ({results.filter((r) => r.status === 'REVIEW').length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('EXCLUDED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'EXCLUDED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Excluded ({results.filter((r) => r.status === 'EXCLUDED').length})
            </button>
          </div>
        </div>

        {/* View Controls: Fit Mode Toggle + Records Per Page */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Fit to Screen (Compact / Wide) Toggle */}
          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              isCompact
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title={isCompact ? 'Current: Fit All Columns to Screen (Compact Mode). Click to expand spacing.' : 'Current: Wide Mode with horizontal scrolling. Click to fit columns to screen.'}
          >
            {isCompact ? <Minimize2 className="w-3.5 h-3.5 text-emerald-600" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{isCompact ? 'Fit to Screen' : 'Wide View'}</span>
          </button>

          {/* Records per page selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs">
            <span className="text-[11px] font-medium text-slate-500">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All ({filteredResults.length})</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className={`w-full text-left border-collapse ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
          <thead>
            <tr className="bg-slate-900 text-white font-semibold whitespace-nowrap">
              <th className={`text-center ${isCompact ? 'py-2 px-1.5 w-8' : 'py-3 px-3 w-10'}`}>Inc</th>
              <th className={`${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Emp ID</th>
              <th className={`${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Employee Name</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Basic (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>DA</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>HRA (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Var Allow (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>EE PF (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>ER PF (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Gross (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>CTC (Old → New)</th>
              <th className={`text-right ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Net (Old → New)</th>
              <th className={`text-center ${isCompact ? 'py-2 px-2' : 'py-3 px-3'}`}>Status</th>
              <th className={`text-center ${isCompact ? 'py-2 px-1' : 'py-3 px-2'}`}>Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedResults.map((emp, idx) => {
              const actualIndex = isAllPages ? idx : (safePage - 1) * effectivePageSize + idx;
              const isExpanded = !!expandedRows[actualIndex];
              const isValid = emp.status === 'VALID';
              const isExcluded = emp.status === 'EXCLUDED';
              const isEditingThisBasic = editingBasicFor === emp.employeeId;
              const hasOverride = overrides[emp.employeeId]?.customBasic !== undefined;

              return (
                <React.Fragment key={`${emp.employeeId || idx}-${idx}`}>
                  <tr
                    onClick={() => toggleRow(actualIndex)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                      isExcluded
                        ? 'bg-slate-100/50 opacity-75'
                        : !isValid
                        ? 'bg-rose-50/40'
                        : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Include / Exclude Checkbox */}
                    <td className={`text-center ${isCompact ? 'py-1.5 px-1.5' : 'py-3 px-3'}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!emp.isExcluded}
                        onChange={() => onToggleExclude(emp.employeeId)}
                        className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        title={emp.isExcluded ? 'Include this employee' : 'Exclude from restructuring'}
                      />
                    </td>

                    <td className={`font-bold text-slate-800 whitespace-nowrap ${isCompact ? 'py-1.5 px-2 text-[11px]' : 'py-3 px-3'}`}>
                      {emp.employeeId}
                    </td>
                    <td className={`font-semibold text-slate-900 whitespace-nowrap ${isCompact ? 'py-1.5 px-2 text-[11px]' : 'py-3 px-3'}`}>
                      {emp.employeeName}
                      {hasOverride && (
                        <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-bold">
                          Override
                        </span>
                      )}
                    </td>

                    {/* Basic with Inline Override button */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`} onClick={(e) => e.stopPropagation()}>
                      {isEditingThisBasic ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={tempBasicValue}
                            onChange={(e) => setTempBasicValue(e.target.value)}
                            className="w-18 px-1 py-0.5 border border-emerald-500 rounded text-xs font-bold text-slate-900 text-right"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveEditBasic(emp.employeeId, e)}
                            className="p-0.5 text-emerald-700 hover:bg-emerald-100 rounded"
                            title="Save custom basic"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end group">
                          <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldBasic)}</span>
                          <span className={`font-bold ${hasOverride ? 'text-indigo-700' : 'text-slate-900'}`}>
                            {formatCurr(emp.newBasic)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleStartEditBasic(emp.employeeId, emp.newBasic, e)}
                            className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 text-slate-400 hover:text-emerald-700 rounded transition-opacity"
                            title="Custom Basic Override for this employee"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      {!isEditingThisBasic && renderDelta(emp.deltaBasic)}
                    </td>

                    {/* DA */}
                    <td className={`text-right font-medium text-slate-700 whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      {formatCurr(emp.newDA)}
                    </td>

                    {/* HRA */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldHRA)}</span>
                        <span className="font-bold text-slate-900">{formatCurr(emp.newHRA)}</span>
                      </div>
                      {renderDelta(emp.deltaHRA)}
                    </td>

                    {/* Variable Allowance */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldVariableAllowance)}</span>
                        <span className={`font-bold ${emp.newVariableAllowance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatCurr(emp.newVariableAllowance)}
                        </span>
                      </div>
                      {renderDelta(emp.deltaVariable)}
                    </td>

                    {/* Employee PF */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldEmployeePF)}</span>
                        <span className="font-bold text-slate-900">{formatCurr(emp.newEmployeePF)}</span>
                      </div>
                      {renderDelta(emp.deltaPF)}
                    </td>

                    {/* Employer PF */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldEmployerPF)}</span>
                        <span className="font-bold text-slate-900">{formatCurr(emp.newEmployerPF)}</span>
                      </div>
                      {renderDelta(emp.deltaEmployerPF)}
                    </td>

                    {/* Gross */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldGross)}</span>
                        <span className="font-bold text-slate-900">{formatCurr(emp.newGross)}</span>
                      </div>
                      {renderDelta(emp.deltaGross)}
                    </td>

                    {/* CTC */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldCTC)}</span>
                        <span className="font-bold text-slate-900">{formatCurr(emp.newCTC)}</span>
                      </div>
                      {renderDelta(emp.deltaCTC)}
                    </td>

                    {/* Net */}
                    <td className={`text-right font-medium whitespace-nowrap ${isCompact ? 'py-1.5 px-2' : 'py-3 px-3'}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-slate-400 line-through mr-1 text-[10px]">{formatCurr(emp.oldNet)}</span>
                        <span className="font-bold text-slate-900">{formatCurr(emp.newNet)}</span>
                      </div>
                      {renderDelta(emp.deltaNet)}
                    </td>

                    {/* Status */}
                    <td className={`text-center whitespace-nowrap ${isCompact ? 'py-1.5 px-1.5' : 'py-3 px-3'}`}>
                      {isExcluded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          <UserX className="w-2.5 h-2.5 text-slate-500" />
                          Excluded
                        </span>
                      ) : isValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                          Validated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          Review
                        </span>
                      )}
                    </td>

                    {/* Details icon */}
                    <td className={`text-center text-slate-400 ${isCompact ? 'py-1.5 px-1' : 'py-3 px-2'}`}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 mx-auto" /> : <ChevronDown className="w-3.5 h-3.5 mx-auto" />}
                    </td>
                  </tr>

                  {/* Expanded Audit Card */}
                  {isExpanded && (
                    <tr className={isExcluded ? 'bg-slate-100/70' : isValid ? 'bg-slate-50/70' : 'bg-rose-50/80'}>
                      <td colSpan={14} className="p-4">
                        <div className="border rounded-lg p-3 bg-white shadow-xs border-slate-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                            <div>
                              <span className="font-bold text-slate-900 text-xs">
                                Detailed Restructuring Breakdown for {emp.employeeName} ({emp.employeeId})
                              </span>
                              <span className="text-xs text-slate-500 ml-2">
                                PF Qualifying Wage: {formatCurr(emp.effectivePFBase)}
                              </span>
                            </div>

                            {hasOverride && (
                              <button
                                type="button"
                                onClick={() => onResetOverride(emp.employeeId)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reset Override
                              </button>
                            )}
                          </div>

                          {/* Review Reasons / Categories / Notes */}
                          {emp.reviewReasons && emp.reviewReasons.length > 0 ? (
                            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-md">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <p className="text-xs font-bold text-rose-900 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  Review Reasons & Deficit Analysis:
                                </p>
                                {emp.reviewCategories && emp.reviewCategories.map((cat, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                              <ul className="list-disc list-inside text-xs text-rose-800 space-y-0.5">
                                {emp.reviewReasons.map((reason, rIdx) => (
                                  <li key={rIdx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          ) : isExcluded ? (
                            <div className="mb-3 p-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                              <UserX className="w-3.5 h-3.5 text-slate-500" />
                              This employee is excluded from salary restructuring. All existing components are preserved verbatim.
                            </div>
                          ) : (
                            <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Salary components restructured cleanly. Variable Allowance absorbed the Basic difference without deficit.
                            </div>
                          )}

                          {/* Complete Component Comparison */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-[11px]">
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">Basic (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldBasic)} → </span>
                              <span className="font-bold text-emerald-700">{formatCurr(emp.newBasic)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">DA (Dearness)</span>
                              <span className="font-bold text-slate-900">{formatCurr(emp.newDA)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">HRA (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldHRA)} → </span>
                              <span className="font-bold text-slate-900">{formatCurr(emp.newHRA)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">Var Allow (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldVariableAllowance)} → </span>
                              <span className={`font-bold ${emp.newVariableAllowance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {formatCurr(emp.newVariableAllowance)}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">EE PF (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldEmployeePF)} → </span>
                              <span className="font-bold text-slate-900">{formatCurr(emp.newEmployeePF)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">ER PF (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldEmployerPF)} → </span>
                              <span className="font-bold text-slate-900">{formatCurr(emp.newEmployerPF)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">Gross (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldGross)} → </span>
                              <span className="font-bold text-slate-900">{formatCurr(emp.newGross)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">CTC (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldCTC)} → </span>
                              <span className="font-bold text-indigo-700">{formatCurr(emp.newCTC)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <span className="text-slate-500 block text-[10px]">Net (Old → New)</span>
                              <span className="font-semibold text-slate-700">{formatCurr(emp.oldNet)} → </span>
                              <span className="font-bold text-emerald-800">{formatCurr(emp.newNet)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Record Counts and Pagination Controls */}
      <div className="p-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/70 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            Showing {isAllPages ? paginatedResults.length : Math.min(filteredResults.length, (safePage - 1) * effectivePageSize + 1)}
            {!isAllPages && ` to ${Math.min(filteredResults.length, safePage * effectivePageSize)}`} of {filteredResults.length} records
          </span>
          {isAllPages && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              All Records Displayed
            </span>
          )}
        </div>

        {!isAllPages && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={`px-2.5 py-1 rounded border text-xs font-semibold ${
                safePage <= 1
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              Previous
            </button>
            <span className="px-2 text-xs font-bold text-slate-800">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={`px-2.5 py-1 rounded border text-xs font-semibold ${
                safePage >= totalPages
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
