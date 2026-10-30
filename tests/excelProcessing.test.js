import { describe, it, expect } from 'vitest';
import { createSampleSaralWorkbookBuffer, SAMPLE_EMPLOYEES } from '../src/sampleData';
import { readSaralWorkbook } from '../src/services/excelReader';
import { validateEmployeeRecords } from '../src/services/salaryValidator';
import { calculateBatchSalaries, PRESERVATION_MODES, ROUNDING_MODES } from '../src/services/salaryCalculator';
import { generateRevisedWorkbook, generateSummaryAuditWorkbook } from '../src/services/excelWriter';
import ExcelJS from 'exceljs';

describe('Excel Processing & Validation Suite (Salary Rate Template)', () => {
  it('generates and reads a valid Salary Rate template workbook buffer', async () => {
    const buffer = await createSampleSaralWorkbookBuffer();
    expect(buffer).toBeDefined();

    const parsed = await readSaralWorkbook(buffer);
    expect(parsed.sheets.length).toBeGreaterThan(0);
    expect(parsed.selectedSheetName).toBe('Salary Rate');
    expect(parsed.employees.length).toBe(SAMPLE_EMPLOYEES.length);

    // Verify column mapping
    expect(parsed.columnMapping.employeeId).toBe(1); // Ref. No.
    expect(parsed.columnMapping.employeeName).toBe(2); // Name
    expect(parsed.columnMapping.basic).toBe(3); // BASIC
    expect(parsed.columnMapping.da).toBe(4); // DA
    expect(parsed.columnMapping.hra).toBe(5); // HRA
    expect(parsed.columnMapping.variableAllowance).toBe(7); // Var Allow

    // Verify compatibility
    expect(parsed.compatibility.isCompatible).toBe(true);
    expect(parsed.compatibility.confidenceScore).toBeGreaterThanOrEqual(90);
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
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      targetGoalSeekWage: 15000,
      roundingMode: ROUNDING_MODES.EXACT,
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

    const ws = revisedWb.getWorksheet('Salary Rate');
    expect(ws).toBeDefined();

    // Check row 4 (first employee: MT-59 LALIT MOHAN SENAPATI)
    const emp1Row = ws.getRow(4);
    const basicCellVal = emp1Row.getCell(parsed.columnMapping.basic + 1).value;
    expect(basicCellVal).toBeCloseTo(7578.93, 2);

    const hraCellVal = emp1Row.getCell(parsed.columnMapping.hra + 1).value;
    expect(hraCellVal).toBeCloseTo(4333.33, 2);

    // Variable allowance should have absorbed the difference
    const varCellVal = emp1Row.getCell(parsed.columnMapping.variableAllowance + 1).value;
    expect(varCellVal).toBeCloseTo(22433.41, 2);
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
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      roundingMode: ROUNDING_MODES.EXACT,
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
