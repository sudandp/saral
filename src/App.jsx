import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Play,
  Download,
  FileCheck,
  Columns3,
  AlertCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import ExcelUpload from './components/ExcelUpload';
import SalarySettings from './components/SalarySettings';
import SummaryCards from './components/SummaryCards';
import EmployeeTable from './components/EmployeeTable';
import ColumnMapper from './components/ColumnMapper';

import {
  readSaralWorkbook,
  extractSectionsAndEmployeesFromSheet,
} from './services/excelReader.js';
import {
  calculateBatchSalaries,
  PRESERVATION_MODES,
  ROUNDING_MODES,
  BASIC_CALCULATION_METHODS,
} from './services/salaryCalculator.js';
import {
  generateRevisedWorkbook,
  generateSummaryAuditWorkbook,
} from './services/excelWriter.js';
import { createSampleSaralWorkbookBuffer } from './sampleData.js';

const DEFAULT_CONFIG = {
  // Target PF Wage & Statutory Ceiling
  targetPFWage: 25000,
  statutoryCeilingLimit: 15000,
  applyStatutoryCeiling: false,

  // Basic Calculation Method
  basicMethod: BASIC_CALCULATION_METHODS.GOAL_SEEK,
  basicPercentage: 50,
  manualTargetBasic: 8442,

  // Wage Components
  includeDAInPF: true,
  excludeStandardDeduction: true,
  hraPercentage: 40,
  recalculateHRA: true,

  // PF Rates - Breakdown totals 13.00%
  employeePFRate: 12,
  employerPFRate: 13,
  employerEPFRate: 3.67,
  employerEPSRate: 8.33,
  employerEDLIRate: 0.5,
  employerAdminRate: 0.5,

  // Preservation & Rounding
  preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
  roundingMode: ROUNDING_MODES.EXACT,

  // Statutory Confirmation & Exclusions
  confirmedStatutory: true,
  excludeNonPFEligible: false,
};

export default function App() {
  const [file, setFile] = useState(null);
  const [rawBuffer, setRawBuffer] = useState(null);
  const [workbookInstance, setWorkbookInstance] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headers, setHeaders] = useState([]);
  const [headerRowNumber, setHeaderRowNumber] = useState(1);
  const [columnMapping, setColumnMapping] = useState({});
  const [compatibility, setCompatibility] = useState(null);
  const [rawEmployees, setRawEmployees] = useState([]);

  // Configuration state
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Individual employee overrides: { [empId]: { isExcluded: boolean, customBasic: number } }
  const [employeeOverrides, setEmployeeOverrides] = useState({});

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [warningBanner, setWarningBanner] = useState(null);

  // Modal states
  const [isMapperOpen, setIsMapperOpen] = useState(false);

  // Handle uploaded Excel file
  const handleFileUpload = async (uploadedFile) => {
    try {
      setIsProcessing(true);
      setErrorBanner(null);
      setSuccessBanner(null);
      setWarningBanner(null);
      setFile(uploadedFile);

      const parsed = await readSaralWorkbook(uploadedFile);
      setRawBuffer(parsed.rawBuffer);
      setWorkbookInstance(parsed.workbook);
      setSheets(parsed.sheets);
      setSelectedSheet(parsed.selectedSheetName);
      setHeaders(parsed.headers);
      setHeaderRowNumber(parsed.headerRowNumber);
      setColumnMapping(parsed.columnMapping);
      setCompatibility(parsed.compatibility);
      setRawEmployees(parsed.employees);
      setEmployeeOverrides({});

      setProcessedResults(null);
      setStats({
        total: parsed.employees.length,
        valid: 0,
        requiresReview: 0,
        excluded: 0,
        emptyRowsSkipped: 0,
        totalEmployerCostDiff: 0,
      });
    } catch (err) {
      console.error(err);
      setErrorBanner(`Failed to read Excel workbook: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample data
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setErrorBanner(null);
      setSuccessBanner(null);
      setWarningBanner(null);
      const buffer = await createSampleSaralWorkbookBuffer();
      const sampleFile = new File([buffer], 'Saral_Payroll_Master_Sample.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      await handleFileUpload(sampleFile);
    } catch (err) {
      console.error(err);
      setErrorBanner(`Failed to load sample data: ${err.message}`);
      setIsProcessing(false);
    }
  };

  // Switch sheet
  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (!workbookInstance) return;

    const ws = workbookInstance.getWorksheet(sheetName);
    if (ws) {
      const { employees } = extractSectionsAndEmployeesFromSheet(ws);
      setRawEmployees(employees);
      setProcessedResults(null);
      setEmployeeOverrides({});
      setStats({
        total: employees.length,
        valid: 0,
        requiresReview: 0,
        excluded: 0,
        emptyRowsSkipped: 0,
        totalEmployerCostDiff: 0,
      });
    }
  };

  // Update a single column mapping
  const handleMappingChange = (componentKey, columnIndex) => {
    setColumnMapping((prev) => ({
      ...prev,
      [componentKey]: columnIndex,
    }));
  };

  // Apply new column mappings
  const handleApplyMapping = () => {
    setIsMapperOpen(false);
    if (!workbookInstance || !selectedSheet) return;

    const ws = workbookInstance.getWorksheet(selectedSheet);
    if (ws) {
      const { employees } = extractSectionsAndEmployeesFromSheet(ws);
      setRawEmployees(employees);
      setProcessedResults(null);
      setStats({
        total: employees.length,
        valid: 0,
        requiresReview: 0,
        excluded: 0,
        emptyRowsSkipped: 0,
        totalEmployerCostDiff: 0,
      });
    }
  };

  // Toggle individual employee exclusion
  const handleToggleExclude = (empId) => {
    setEmployeeOverrides((prev) => {
      const current = prev[empId] || {};
      const updated = {
        ...prev,
        [empId]: {
          ...current,
          isExcluded: !current.isExcluded,
        },
      };

      if (rawEmployees && rawEmployees.length > 0) {
        const { results, stats: newStats } = calculateBatchSalaries(rawEmployees, config, updated);
        setProcessedResults(results);
        setStats(newStats);
      }

      return updated;
    });
  };

  // Set custom Basic override for an employee
  const handleSetCustomBasic = (empId, customBasic) => {
    setEmployeeOverrides((prev) => {
      const current = prev[empId] || {};
      const updated = {
        ...prev,
        [empId]: {
          ...current,
          customBasic,
        },
      };

      if (rawEmployees && rawEmployees.length > 0) {
        const { results, stats: newStats } = calculateBatchSalaries(rawEmployees, config, updated);
        setProcessedResults(results);
        setStats(newStats);
      }

      return updated;
    });
  };

  // Reset override for an employee
  const handleResetOverride = (empId) => {
    setEmployeeOverrides((prev) => {
      const updated = { ...prev };
      delete updated[empId];

      if (rawEmployees && rawEmployees.length > 0) {
        const { results, stats: newStats } = calculateBatchSalaries(rawEmployees, config, updated);
        setProcessedResults(results);
        setStats(newStats);
      }

      return updated;
    });
  };

  // Run Calculations (Preview or Process)
  const runCalculations = (isFinalCommit = false) => {
    if (!rawEmployees || rawEmployees.length === 0) {
      setErrorBanner('No employee records detected to process.');
      return;
    }

    if (!config.confirmedStatutory) {
      setErrorBanner('Please review and check the Statutory Applicability Confirmation before processing.');
      return;
    }

    setIsProcessing(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    setWarningBanner(null);

    try {
      const { results, stats: newStats } = calculateBatchSalaries(rawEmployees, config, employeeOverrides);
      setProcessedResults(results);
      setStats(newStats);

      if (newStats.requiresReview > 0) {
        setWarningBanner(
          `Calculation completed: ${newStats.valid} records cleanly restructured, ${newStats.requiresReview} records require review (insufficient Variable Allowance to absorb target Basic). Original values are preserved for review records to prevent illegal negative allowances.`
        );
      } else {
        setSuccessBanner(
          `All ${newStats.total} employee records were restructured and validated with zero negative allowances!`
        );
      }
    } catch (err) {
      console.error('Calculation error', err);
      setErrorBanner(`Salary restructuring error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download revised workbook
  const handleDownloadRevised = async () => {
    if (!rawBuffer || !processedResults) return;

    try {
      setIsProcessing(true);
      const blob = await generateRevisedWorkbook(
        rawBuffer,
        processedResults,
        columnMapping,
        selectedSheet
      );

      const originalName = file ? file.name.replace(/\.[^/.]+$/, '') : 'Saral_Payroll';
      const fileName = `${originalName}_Restructured_PF${config.targetPFWage}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error', err);
      setErrorBanner(`Failed to export revised workbook: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download audit report
  const handleDownloadAuditReport = async () => {
    if (!processedResults || !stats) return;

    try {
      setIsProcessing(true);
      const blob = await generateSummaryAuditWorkbook(processedResults, stats, config);
      const originalName = file ? file.name.replace(/\.[^/.]+$/, '') : 'Saral_Payroll';
      const fileName = `${originalName}_Restructuring_Audit_Report.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Audit report export error', err);
      setErrorBanner(`Failed to export audit report: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-sm">
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Saral Salary Converter
                </h1>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 border border-slate-700/80 px-2 py-0.5 rounded">
                  Enterprise Payroll
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Statutory Wage Restructuring & Variable Allowance Balancer for Saral PayPack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headers && headers.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMapperOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700 shadow-xs"
              >
                <Columns3 className="w-3.5 h-3.5 text-slate-400" />
                Column Mapping
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Error Banner */}
        {errorBanner && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-900">Attention Required</p>
              <p className="text-xs text-rose-800 mt-0.5">{errorBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs text-rose-500 hover:text-rose-800 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Warning Banner */}
        {warningBanner && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Validation Notice</p>
              <p className="text-xs text-amber-800 mt-0.5">{warningBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setWarningBanner(null)}
              className="text-xs text-amber-600 hover:text-amber-900 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successBanner && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">Processing Complete</p>
              <p className="text-xs text-emerald-800 mt-0.5">{successBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-xs text-emerald-600 hover:text-emerald-900 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Upload & Template Validation */}
        <section>
          <ExcelUpload
            file={file}
            sheets={sheets}
            selectedSheet={selectedSheet}
            onSheetChange={handleSheetChange}
            compatibility={compatibility}
            onFileUpload={handleFileUpload}
            onLoadSample={handleLoadSample}
            isProcessing={isProcessing}
          />
        </section>

        {/* 2. Enhanced Salary Configuration Panel */}
        <section>
          <SalarySettings
            config={config}
            onChange={(newConfig) => {
              setConfig(newConfig);
              if (rawEmployees && rawEmployees.length > 0 && processedResults) {
                const { results, stats: newStats } = calculateBatchSalaries(rawEmployees, newConfig, employeeOverrides);
                setProcessedResults(results);
                setStats(newStats);
              }
            }}
            onReset={() => setConfig(DEFAULT_CONFIG)}
          />
        </section>

        {/* 3. Action Bar & Summary Stats */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Execute Restructuring Engine
              </h3>
              <p className="text-xs text-slate-500">
                {rawEmployees.length > 0
                  ? `${rawEmployees.length} employees detected across all sections in sheet "${selectedSheet}". Preview calculations or commit restructuring.`
                  : 'Upload an Excel workbook or load sample data to begin.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => runCalculations(false)}
                disabled={isProcessing || rawEmployees.length === 0}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all border ${
                  isProcessing || rawEmployees.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs active:scale-98'
                }`}
                title="Evaluate calculations and review before/after comparisons"
              >
                <Eye className="w-4 h-4 text-emerald-600" />
                Preview Calculations
              </button>

              {/* Process All Employees Button */}
              <button
                type="button"
                onClick={() => runCalculations(true)}
                disabled={isProcessing || rawEmployees.length === 0}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                  isProcessing || rawEmployees.length === 0
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:scale-98'
                }`}
              >
                <Play className="w-4 h-4 fill-white" />
                Process All Employees
              </button>

              {/* Download Saral Excel Button - Only enabled after validation */}
              <button
                type="button"
                onClick={handleDownloadRevised}
                disabled={isProcessing || !processedResults || (stats && stats.valid === 0)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all ${
                  !processedResults || (stats && stats.valid === 0) || isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'text-white bg-slate-900 hover:bg-slate-800'
                }`}
                title={
                  !processedResults
                    ? 'Run Preview or Process All Employees to validate calculations before downloading'
                    : stats && stats.valid === 0
                    ? 'No employee records satisfied validation criteria'
                    : `Download revised Excel workbook modifying only the ${stats.valid} cleanly validated records`
                }
              >
                <Download className="w-4 h-4" />
                {processedResults && stats && stats.valid > 0
                  ? `Download Saral Excel (${stats.valid} Validated)`
                  : 'Download Saral Excel'}
              </button>

              {processedResults && (
                <button
                  type="button"
                  onClick={handleDownloadAuditReport}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                  title="Export comprehensive before/after variance audit report"
                >
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Audit Report
                </button>
              )}
            </div>
          </div>

          {/* Statistics Dashboard */}
          <SummaryCards stats={stats} results={processedResults} />
        </section>

        {/* 4. Employee Before/After Salary Comparison Table */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Salary Restructuring Preview & Audit Table
            </h3>
            <span className="text-xs text-slate-500">
              {processedResults ? `${processedResults.length} records evaluated` : 'Pending calculation'}
            </span>
          </div>

          <EmployeeTable
            results={processedResults || []}
            overrides={employeeOverrides}
            onToggleExclude={handleToggleExclude}
            onSetCustomBasic={handleSetCustomBasic}
            onResetOverride={handleResetOverride}
          />
        </section>
      </main>

      {/* Column Mapping Modal */}
      <ColumnMapper
        isOpen={isMapperOpen}
        onClose={() => setIsMapperOpen(false)}
        headers={headers}
        mapping={columnMapping}
        onMappingChange={handleMappingChange}
        onApply={handleApplyMapping}
      />
    </div>
  );
}
