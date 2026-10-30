import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { readSaralWorkbook } from '../src/services/excelReader.js';
import { calculateBatchSalaries, PRESERVATION_MODES, ROUNDING_MODES } from '../src/services/salaryCalculator.js';
import { generateRevisedWorkbook } from '../src/services/excelWriter.js';

describe('Test.xlsx (Salary Rate Template) Support Audit', () => {
  const testFilePath = 'C:/Users/sudhan/Downloads/Test.xlsx';
  const hasFile = fs.existsSync(testFilePath);

  it.skipIf(!hasFile)('reads and correctly parses 55 employee records from Test.xlsx', async () => {
    const buf = fs.readFileSync(testFilePath);
    const parsed = await readSaralWorkbook(buf);

    expect(parsed.sheets.length).toBeGreaterThanOrEqual(1);
    expect(parsed.selectedSheetName).toBe('Salary Rate');
    expect(parsed.employees.length).toBe(55);
    expect(parsed.compatibility.isCompatible).toBe(true);

    // Verify first employee
    const firstEmp = parsed.employees[0];
    expect(firstEmp.employeeId).toBe('MT-59');
    expect(firstEmp.employeeName).toBe('LALIT MOHAN SENAPATI');
    expect(Number(firstEmp.basic)).toBeCloseTo(11895.05, 2);
    expect(Number(firstEmp.da)).toBeCloseTo(3254.40, 2);
    expect(Number(firstEmp.hra)).toBeCloseTo(6059.78, 2);
    expect(Number(firstEmp.variableAllowance)).toBeCloseTo(16390.84, 2);

    // Verify FT-24 (SRINIVASA R)
    const ft24 = parsed.employees.find(e => e.employeeId === 'FT-24');
    expect(ft24).toBeDefined();
    expect(ft24.employeeName).toBe('SRINIVASA R');
    expect(Number(ft24.basic)).toBeCloseTo(11895.05, 2);
    expect(Number(ft24.da)).toBeCloseTo(3254.40, 2);
    expect(Number(ft24.hra)).toBeCloseTo(6059.78, 2);
    expect(Number(ft24.variableAllowance)).toBeCloseTo(10441.18, 2);
  }, 30000);

  it.skipIf(!hasFile)('restructures all 55 employees cleanly under Salary Neutral Restructuring', async () => {
    const buf = fs.readFileSync(testFilePath);
    const parsed = await readSaralWorkbook(buf);

    const config = {
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      targetGoalSeekWage: 15000,
      roundingMode: ROUNDING_MODES.EXACT,
      confirmedStatutory: true,
    };

    const { results, stats } = calculateBatchSalaries(parsed.employees, config);

    expect(stats.total).toBe(55);
    expect(stats.valid).toBe(55);
    expect(stats.requiresReview).toBe(0);
    expect(stats.excluded).toBe(0);

    // Verify FT-24 exact figures
    const ft24Result = results.find(r => r.employeeId === 'FT-24');
    expect(ft24Result).toBeDefined();
    expect(ft24Result.status).toBe('VALID');
    expect(ft24Result.newBasic).toBe(7578.93);
    expect(ft24Result.newDA).toBe(3254.40);
    expect(ft24Result.newHRA).toBe(4333.33);
    expect(ft24Result.newVariableAllowance).toBe(16483.75);
    expect(ft24Result.newEmployerPF).toBe(ft24Result.oldEmployerPF);
    expect(ft24Result.newEmployeePF).toBe(ft24Result.oldEmployeePF);
    expect(ft24Result.deltaNet).toBe(0);

    // Verify revised workbook generation
    const revisedBlob = await generateRevisedWorkbook(
      parsed.rawBuffer,
      results,
      parsed.columnMapping,
      parsed.selectedSheetName
    );

    const arrayBuf = await revisedBlob.arrayBuffer();
    const outWb = new ExcelJS.Workbook();
    await outWb.xlsx.load(arrayBuf);
    const outWs = outWb.getWorksheet('Salary Rate');
    expect(outWs).toBeDefined();

    // Verify cell values in exported workbook
    const ft24Row = outWs.getRow(ft24Result.rowIndex);
    expect(ft24Row.getCell(4).value).toBe(7578.93); // Basic
    expect(ft24Row.getCell(5).value).toBe(3254.40); // DA
    expect(ft24Row.getCell(6).value).toBe(4333.33); // HRA
    expect(ft24Row.getCell(8).value).toBe(16483.75); // Variable Allowance
  }, 60000);
});
