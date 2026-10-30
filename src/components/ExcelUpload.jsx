import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, Sparkles } from 'lucide-react';
import { createSampleSaralWorkbookBuffer } from '../sampleData';

export default function ExcelUpload({
  file,
  sheets,
  selectedSheet,
  onSheetChange,
  compatibility,
  onFileUpload,
  onLoadSample,
  isProcessing,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        onFileUpload(droppedFile);
      } else {
        alert('Please upload a valid Excel (.xlsx) file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const buffer = await createSampleSaralWorkbookBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Saral_Payroll_Sample_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download sample file', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Excel Payroll Workbook
          </h2>
          <p className="text-sm text-slate-500">
            Upload an existing Saral payroll Excel workbook (.xlsx) to restructure salary components.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Download Saral Template
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Load Sample Data
          </button>
        </div>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : file
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>

          {file ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB • Click or drag to replace workbook
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-800">
                <span className="font-semibold text-emerald-700 hover:underline">Click to browse</span> or drag and drop your Saral workbook
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports Microsoft Excel (.xlsx)</p>
            </div>
          )}
        </div>
      </div>

      {/* Multi-sheet selector & Compatibility report */}
      {file && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {sheets && sheets.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="sheet-select" className="text-xs font-semibold text-slate-700">
                Worksheet:
              </label>
              <select
                id="sheet-select"
                value={selectedSheet}
                onChange={(e) => onSheetChange(e.target.value)}
                className="text-xs font-medium border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {sheets.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          {compatibility && (
            <div className="flex items-center gap-2 text-xs">
              {compatibility.isCompatible ? (
                <div className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Verified Saral Template ({compatibility.confidenceScore}% match)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>Structure Review Needed ({compatibility.missingRequired?.length || 0} unmapped required columns)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

