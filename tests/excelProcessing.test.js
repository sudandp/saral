import { describe, it, expect } from 'vitest';
import { createSampleSaralWorkbookBuffer, SAMPLE_EMPLOYEES } from '../src/sampleData';
import { readSaralWorkbook, detectColumnMapping, extractEmployeesFromSheet } from '../src/services/excelReader';
import { validateSaralCompatibility, validateEmployeeRecords } from '../src/services/salaryValidator';
import { calculateBatchSalaries, PRESERVATION_MODES, ROUNDING_MODES } from '../src/services/salaryCalculator';
import { generateRevisedWorkbook, generateSummaryAuditWorkbook } from '../src/services/excelWriter';
import ExcelJS from 'exceljs';

describe('Excel Processing & Validation Suite', () => {
  it('generates and reads a valid Saral workbook buffer', async () => {
    const buffer = await createSampleSaralWorkbookBuffer();
    expect(buffer).toBeDefined();

    const parsed = await readSaralWorkbook(buffer);
    expect(parsed.sheets.length).toBeGreaterThan(0);
    expect(parsed.selectedSheetName).toBe('Saral_Salary_Master');
    expect(parsed.employees.length).toBe(SAMPLE_EMPLOYEES.length);

    // Verify column mapping
    expect(parsed.columnMapping.employeeId).toBe(0);
    expect(parsed.columnMapping.employeeName).toBe(1);
    expect(parsed.columnMapping.basic).toBe(2);
    expect(parsed.columnMapping.variableAllowance).toBe(6);

    // Verify compatibility
    expect(parsed.compatibility.isCompatible).toBe(true);
    expect(parsed.compatibility.confidenceScore).toBe(100);
  });

  it('validates employee records for anomalies or missing fields', () => {
    const records = [
      { employeeId: 'EMP001', employeeName: 'Alice', basic: 20000, grossSalary: 30000 },
      { employeeId: 'EMP001', employeeName: 'Duplicate Alice', basic: 20000, grossSalary: 30000 }, // duplicate
      { employeeId: 'EMP003', employeeName: 'Bob', basic: 40000, grossSalary: 30000 }, // basic > gross
      { employeeId: '', employeeName: '' }, // blank row
    ];

    const validation = validateEmployeeRecords(records);
    expect(validation.validRowCount).toBe(3);
    expect(validation.blankRowCount).toBe(1);
    expect(validation.warnings.length).toBe(1); // duplicate EMP001
    expect(validation.errors.length).toBe(1); // basic > gross
  });

  it('generates revised Excel workbook preserving original structure and styles', async () => {
    const originalBuffer = await createSampleSaralWorkbookBuffer();
    const parsed = await readSaralWorkbook(originalBuffer);

    const config = {
      targetPFWage: 25000,
      employerPFRate: 12,
      employeePFRate: 12,
      applyStatutoryCeiling: false,
      includeDAInPF: true,
      preservationMode: PRESERVATION_MODES.RECALCULATE_ALL,
      roundingMode: ROUNDING_MODES.ROUND,
      confirmedStatutory: true,
    };

    const batch = calculateBatchSalaries(parsed.employees, config);
    expect(batch.results.length).toBe(SAMPLE_EMPLOYEES.length);

    // Generate revised workbook
    const blob = await generateRevisedWorkbook(
      parsed.rawBuffer,
      batch.results,
      parsed.columnMapping,
      parsed.selectedSheetName
    );
    expect(blob).toBeDefined();

    // Re-read exported blob to verify values in revised sheet
    const revisedBuffer = await blob.arrayBuffer();
    const revisedWb = new ExcelJS.Workbook();
    await revisedWb.xlsx.load(revisedBuffer);

    const ws = revisedWb.getWorksheet('Saral_Salary_Master');
    expect(ws).toBeDefined();

    // Check row 3 (first employee: Aarav Patel)
    // Old Basic was 18000, new Basic should be 23000 (target 25000 - DA 2000)
    const emp1Row = ws.getRow(3);
    const basicCellVal = emp1Row.getCell(parsed.columnMapping.basic + 1).value;
    expect(basicCellVal).toBe(23000);

    // Variable allowance should have absorbed the 5000 difference (old: 16000 -> new: 11000)
    const varCellVal = emp1Row.getCell(parsed.columnMapping.variableAllowance + 1).value;
    expect(varCellVal).toBe(11000);
  });

  it('generates processing audit report with configuration summary', async () => {
    const originalBuffer = await createSampleSaralWorkbookBuffer();
    const parsed = await readSaralWorkbook(originalBuffer);
    const config = {
      targetPFWage: 25000,
      employerPFRate: 12,
      employeePFRate: 12,
      applyStatutoryCeiling: false,
      includeDAInPF: true,
      preservationMode: PRESERVATION_MODES.RECALCULATE_ALL,
      roundingMode: ROUNDING_MODES.ROUND,
      confirmedStatutory: true,
    };

    const batch = calculateBatchSalaries(parsed.employees, config);
    const auditBlob = await generateSummaryAuditWorkbook(batch.results, batch.stats, config);
    expect(auditBlob).toBeDefined();

    const auditBuffer = await auditBlob.arrayBuffer();
    const auditWb = new ExcelJS.Workbook();
    await auditWb.xlsx.load(auditBuffer);

    expect(auditWb.getWorksheet('Restructuring Audit')).toBeDefined();
    expect(auditWb.getWorksheet('Configuration Summary')).toBeDefined();
  });
});

