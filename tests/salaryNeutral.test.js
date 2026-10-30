import { describe, it, expect } from 'vitest';
import {
  calculateEmployeeSalary,
  PRESERVATION_MODES,
  BASIC_CALCULATION_METHODS,
  ROUNDING_MODES,
} from '../src/services/salaryCalculator.js';

describe('Salary Neutral Restructuring Mode (Sudhan J and K Reference)', () => {
  // Input: Original Column J salary structure from test Book2.xlsx
  const sudhanColumnJEmployee = {
    employeeId: 'EMP_SUDHAN_01',
    employeeName: 'Sudhan Reference Employee',
    basic: 16099.35,
    da: 2390.40,
    standardDeduction: 50000 / 12, // 4166.666666666667
    hra: 7395.90,
    variableAllowance: 9607.68333333333,
    performanceIncentive: 9390,
    washingAllowance: 0,
    employerPF: 1950,
    employeePF: 1800,
    esi: 0,
    grossSalary: 49050,
    ctc: 51000,
    netSalary: 46950,
  };

  const exactSudhanConfig = {
    preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
    targetGoalSeekWage: 14999.043250198887,
    roundingMode: ROUNDING_MODES.DECIMAL_4,
    confirmedStatutory: true,
  };

  const roundedConfig = {
    preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
    roundingMode: ROUNDING_MODES.ROUND,
    confirmedStatutory: true,
  };

  it('reproduces Sudhan exact J-to-K reference numbers to 4 decimal places', () => {
    const result = calculateEmployeeSalary(sudhanColumnJEmployee, exactSudhanConfig);

    expect(result.isValidRow).toBe(true);
    expect(result.status).toBe('VALID');

    // 1. Basic: 8441.9766
    expect(result.newBasic).toBeCloseTo(8441.9766, 4);

    // 2. DA: 2390.40
    expect(result.newDA).toBeCloseTo(2390.40, 2);

    // 3. Standard Deduction: 4166.6667
    expect(result.newStandardDeduction).toBeCloseTo(4166.6667, 4);

    // 4. HRA: 4332.9506
    expect(result.newHRA).toBeCloseTo(4332.9506, 4);

    // 5. Variable Allowance: 20327.6833
    expect(result.newVariableAllowance).toBeCloseTo(20327.6833, 4);

    // 6. Performance Incentive: 9390
    expect(result.newPerformanceIncentive).toBe(9390);

    // 7. Gross: 49049.6772
    expect(result.newGross).toBeCloseTo(49049.6772, 4);

    // 8. Employer PF: 1950
    expect(result.newEmployerPF).toBe(1950);

    // 9. Employee PF: 1800
    expect(result.newEmployeePF).toBe(1800);

    // 10. CTC: 51000
    expect(result.newCTC).toBe(51000);

    // 11. Net: 46950
    expect(result.newNet).toBe(46950);
  });

  it('accurately reproduces Sudhans Column K salary pattern with integer rounding', () => {
    const result = calculateEmployeeSalary(sudhanColumnJEmployee, roundedConfig);

    expect(result.isValidRow).toBe(true);
    expect(result.status).toBe('VALID');

    expect(result.newBasic).toBe(8442);
    expect(result.newDA).toBe(2390.4);
    expect(result.newStandardDeduction).toBeCloseTo(4166.67, 1);
    expect(result.newHRA).toBe(4333);
    expect(result.newVariableAllowance).toBe(20328);
    expect(result.newPerformanceIncentive).toBe(9390);
    expect(result.newGross).toBe(49050);
    expect(result.newEmployerPF).toBe(1950);
    expect(result.newEmployeePF).toBe(1800);
    expect(result.newCTC).toBe(51000);
    expect(result.newNet).toBe(46950);
  });

  it('flags employee when Variable Allowance cannot balance without turning negative', () => {
    const lowGrossEmployee = {
      employeeId: 'EMP_LOW_01',
      employeeName: 'Low Gross Worker',
      basic: 10000,
      da: 2000,
      standardDeduction: 0,
      hra: 4800,
      variableAllowance: 500, // Small allowance
      performanceIncentive: 0,
      washingAllowance: 0,
      employerPF: 1440,
      employeePF: 1440,
      esi: 0,
      grossSalary: 17300,
      ctc: 18740,
      netSalary: 15660,
    };

    // If target basic is set too high (e.g. 15000), required components will exceed Gross 17300
    const highTargetConfig = {
      ...roundedConfig,
      targetGoalSeekWage: 20000,
    };

    const result = calculateEmployeeSalary(lowGrossEmployee, highTargetConfig);
    expect(result.status).toBe('REVIEW');
    // Variable allowance is non-negative and preserved
    expect(result.newVariableAllowance).toBeGreaterThanOrEqual(0);
    expect(result.reviewReasons.some(r => r.includes('Cannot balance salary neutrally'))).toBe(true);
  });

  describe('Srinivasa R (FT-24) Reference Verification', () => {
    // Exact original salary values from user specification and Smrithi.xlsx
    const srinivasaR = {
      employeeId: 'FT-24',
      employeeName: 'SRINIVASA R',
      basic: 11895.05,
      da: 3254.40,
      standardDeduction: 0, // In Smrithi.xlsx Col 16 is 0, auto-defaults to 4166.67 in SALARY_NEUTRAL
      hra: 6059.78,
      washingAllowance: 300,
      variableAllowance: 10441.18,
      leavePay: 1037.63,
      bonus: 1261.94,
      performanceIncentive: 0,
      grossSalary: 34249.98,
      employerPF: 1950,
      employeePF: 1818,
      ctc: 35000,
      netSalary: 31382,
    };

    const config = {
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      targetGoalSeekWage: 15000,
      roundingMode: ROUNDING_MODES.EXACT, // 2 decimal places
      confirmedStatutory: true,
    };

    it('matches exact revised values for Srinivasa R (FT-24) with 100% Net Salary preservation', () => {
      const result = calculateEmployeeSalary(srinivasaR, config);

      expect(result.isValidRow).toBe(true);
      expect(result.status).toBe('VALID');

      // 1. Goal Seek Basic: 15000 - 3254.40 - 4166.67 = 7578.93
      expect(result.newBasic).toBe(7578.93);

      // 2. DA unchanged: 3254.40
      expect(result.newDA).toBe(3254.40);

      // 3. Standard Deduction: 4166.67
      expect(result.newStandardDeduction).toBe(4166.67);

      // 4. HRA: (7578.93 + 3254.40) * 40% = 4333.33
      expect(result.newHRA).toBe(4333.33);

      // 5. Washing Allowance unchanged: 300
      expect(result.newWashingAllowance).toBe(300);

      // 6. Variable Allowance: 10441.18 + (11895.05 - 7578.93) + (6059.78 - 4333.33) = 16483.75
      expect(result.newVariableAllowance).toBeCloseTo(16483.75, 2);

      // 7. Leave Pay unchanged: 1037.63
      expect(result.newLeavePay).toBe(1037.63);

      // 8. Bonus unchanged: 1261.94
      expect(result.newBonus).toBe(1261.94);

      // 9. Employer PF unchanged: 1950
      expect(result.newEmployerPF).toBe(1950);

      // 10. Employee PF unchanged: 1818
      expect(result.newEmployeePF).toBe(1818);

      // 11. Gross Salary preserved: 34249.98
      expect(result.newGross).toBe(34249.98);

      // 12. CTC preserved: 35000
      expect(result.newCTC).toBe(35000);

      // 13. CRITICAL: Net Salary matches original EXACTLY (31382 = 31382)
      expect(result.newNet).toBe(31382);
      expect(result.deltaNet).toBe(0);
    });
  });
});

