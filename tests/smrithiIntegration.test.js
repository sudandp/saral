import { describe, it, expect } from 'vitest';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { readSaralWorkbook } from '../src/services/excelReader.js';
import { calculateBatchSalaries, BASIC_CALCULATION_METHODS, PRESERVATION_MODES, ROUNDING_MODES } from '../src/services/salaryCalculator.js';
import { generateRevisedWorkbook } from '../src/services/excelWriter.js';

describe('Smrithi.xlsx End-to-End Restructuring & Validation Audit', () => {
  const filePath = 'C:\\Users\\sudhan\\Downloads\\Smrithi.xlsx';
  const hasSmrithiFile = fs.existsSync(filePath);

  it.skipIf(!hasSmrithiFile)('processes all employees in Smrithi.xlsx cleanly and satisfies all statutory and preservation rules', async () => {
    const buffer = fs.readFileSync(filePath);
    const parsed = await readSaralWorkbook(buffer);

    // 1. Verify Sheet Count & Names
    expect(parsed.sheets.length).toBe(3);
    const sheetNames = parsed.sheets.map(s => s.name);
    expect(sheetNames).toContain('Salary Oct-26 2025 April');
    expect(sheetNames).toContain('Staff Breakup');
    expect(sheetNames).toContain('Admins');

    // 2. Verify Employee Detection across multiple sections
    // Section 1 has 59 employees (rows 2-60), Section 2 has 3 employees (rows 64-66)
    expect(parsed.employees.length).toBe(62);

    // 3. Configure Restructuring Parameters: 13% Employer PF, 12% Employee PF, Target 25000
    const config = {
      targetPFWage: 25000,
      statutoryCeilingLimit: 15000,
      applyStatutoryCeiling: false,
      basicMethod: BASIC_CALCULATION_METHODS.GOAL_SEEK,
      includeDAInPF: true,
      excludeStandardDeduction: true,
      employeePFRate: 12,
      employerPFRate: 13,
      employerEPFRate: 3.67,
      employerEPSRate: 8.33,
      employerEDLIRate: 0.5,
      employerAdminRate: 0.5,
      preservationMode: PRESERVATION_MODES.RECALCULATE_ALL,
      roundingMode: ROUNDING_MODES.ROUND,
      confirmedStatutory: true,
    };

    const batch = calculateBatchSalaries(parsed.employees, config);
    expect(batch.results.length).toBe(62);

    // 4. Verify that ZERO employees have negative Variable Allowance
    const negativeVarAllow = batch.results.filter(r => r.newVariableAllowance < 0);
    expect(negativeVarAllow.length).toBe(0);

    // 5. Verify that ZERO employees have negative Net Salary
    const negativeNet = batch.results.filter(r => r.newNet < 0);
    expect(negativeNet.length).toBe(0);

    // 6. Verify that for all restructured employees (status === 'VALID'), Basic + DA == 25000.00 exactly
    const validRecords = batch.results.filter(r => r.status === 'VALID');
    expect(validRecords.length).toBeGreaterThan(0);
    validRecords.forEach(v => {
      const basicPlusDA = Math.round((v.newBasic + v.newDA) * 100) / 100;
      expect(basicPlusDA).toBe(25000.00);
      // Verify Employer PF = 13% of 25000 = 3250
      expect(v.newEmployerPF).toBe(3250);
      // Verify Employee PF = 12% of 25000 = 3000
      expect(v.newEmployeePF).toBe(3000);
    });

    // 7. Verify Inactive Records (Rows 57-60)
    const inactiveRecords = batch.results.filter(r => ['HKB-2079', 'HKL-7132', 'HKB-2076', 'HKL-7151'].includes(r.employeeId));
    expect(inactiveRecords.length).toBe(4);
    inactiveRecords.forEach(rec => {
      expect(rec.newBasic).toBe(0);
      expect(rec.newVariableAllowance).toBe(0);
      expect(rec.status).toBe('EXCLUDED');
    });

    // 8. Generate Revised Workbook and verify Excel roundtrip
    const blob = await generateRevisedWorkbook(
      parsed.rawBuffer,
      batch.results,
      parsed.columnMapping,
      parsed.selectedSheetName
    );
    expect(blob).toBeDefined();

    const revisedBuffer = await blob.arrayBuffer();
    const wbRevised = new ExcelJS.Workbook();
    await wbRevised.xlsx.load(revisedBuffer);

    // Verify all 3 worksheets are preserved
    expect(wbRevised.worksheets.length).toBe(3);
    expect(wbRevised.worksheets.map(w => w.name)).toEqual(['Salary Oct-26 2025 April', 'Staff Breakup', 'Admins']);

    // Verify that the salary sheet has NO negative numbers in Variable Allowance column
    const wsSalary = wbRevised.getWorksheet('Salary Oct-26 2025 April');
    for (let r = 2; r <= 60; r++) {
      const row = wsSalary.getRow(r);
      const varCellVal = Number(row.getCell(9).value || 0);
      expect(varCellVal).toBeGreaterThanOrEqual(0);
    }
  });

  it.skipIf(!hasSmrithiFile)('processes Smrithi.xlsx under Salary Neutral Restructuring mode (Sudhan J-to-K reference)', async () => {
    const buffer = fs.readFileSync(filePath);
    const parsed = await readSaralWorkbook(buffer);

    const neutralConfig = {
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      targetGoalSeekWage: 15000,
      roundingMode: ROUNDING_MODES.ROUND,
      confirmedStatutory: true,
    };

    const batch = calculateBatchSalaries(parsed.employees, neutralConfig);
    expect(batch.results.length).toBe(62);

    // 1. Zero negative Variable Allowance
    const negativeVarAllow = batch.results.filter(r => r.newVariableAllowance < 0);
    expect(negativeVarAllow.length).toBe(0);

    // 2. Zero negative Net Salary
    const negativeNet = batch.results.filter(r => r.newNet < 0);
    expect(negativeNet.length).toBe(0);

    // 3. Valid employees have Gross and PF preserved
    const validRecords = batch.results.filter(r => r.status === 'VALID');
    expect(validRecords.length).toBeGreaterThan(30);
    validRecords.forEach(v => {
      expect(Math.abs(v.newGross - v.oldGross)).toBeLessThanOrEqual(1);
      expect(v.newEmployerPF).toBe(v.oldEmployerPF);
      expect(v.newEmployeePF).toBe(v.oldEmployeePF);
      expect(v.newVariableAllowance).toBeGreaterThanOrEqual(0);
    });

    // 4. Test Excel generation with formula ceiling update
    const blob = await generateRevisedWorkbook(
      parsed.rawBuffer,
      batch.results,
      parsed.columnMapping,
      parsed.selectedSheetName
    );
    expect(blob).toBeDefined();

    const revisedBuffer = await blob.arrayBuffer();
    const wbRevised = new ExcelJS.Workbook();
    await wbRevised.xlsx.load(revisedBuffer);
    expect(wbRevised.worksheets.length).toBe(3);
  });
});

