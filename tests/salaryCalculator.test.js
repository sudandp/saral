import { describe, it, expect } from 'vitest';
import {
  calculateEmployeeSalary,
  calculateBatchSalaries,
  PRESERVATION_MODES,
  ROUNDING_MODES,
  BASIC_CALCULATION_METHODS,
  applyRounding
} from '../src/services/salaryCalculator.js';

describe('Salary Calculator Engine', () => {
  const baseEmployee = {
    employeeId: 'EMP001',
    employeeName: 'Rahul Sharma',
    basic: 15000,
    da: 0,
    hra: 7500,
    standardDeduction: 0,
    variableAllowance: 15000,
    performanceIncentive: 2500,
    washingAllowance: 1000,
    employerPF: 1800,
    employeePF: 1800,
    esi: 0,
    grossSalary: 41000,
    ctc: 42800,
    netSalary: 39200,
  };

  const validConfig = {
    targetPFWage: 25000,
    employerPFRate: 12,
    employerEPFRate: 0,
    employerEPSRate: 0,
    employerEDLIRate: 0,
    employerAdminRate: 0,
    employeePFRate: 12,
    applyStatutoryCeiling: false,
    statutoryCeilingLimit: 15000,
    basicMethod: BASIC_CALCULATION_METHODS.GOAL_SEEK,
    includeDAInPF: true,
    excludeStandardDeduction: true,
    preservationMode: PRESERVATION_MODES.RECALCULATE_ALL,
    roundingMode: ROUNDING_MODES.ROUND,
    confirmedStatutory: true,
  };

  it('restructures Basic to target PF wage and transfers difference from Variable Allowance', () => {
    const result = calculateEmployeeSalary(baseEmployee, validConfig);

    expect(result.isValidRow).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.newBasic).toBe(25000);
    expect(result.deltaBasic).toBe(10000); // 25000 - 15000

    // Variable allowance absorbs 10000: 15000 - 10000 = 5000
    expect(result.newVariableAllowance).toBe(5000);
    expect(result.deltaVariable).toBe(-10000);

    // PF recalculated: 12% of 25000 = 3000
    expect(result.newEmployerPF).toBe(3000);
    expect(result.newEmployeePF).toBe(3000);

    expect(result.newGross).toBe(41000);
    expect(result.newCTC).toBe(44000);
    expect(result.newNet).toBe(38000);
  });

  it('calculates Basic using percentage method (e.g. 50% of Gross)', () => {
    const pctConfig = {
      ...validConfig,
      basicMethod: BASIC_CALCULATION_METHODS.PERCENTAGE,
      basicPercentage: 50, // 50% of 41,000 = 20,500
    };

    const result = calculateEmployeeSalary(baseEmployee, pctConfig);
    expect(result.newBasic).toBe(20500);
    // Variable allowance adjusts: 15000 - (20500 - 15000) = 9500
    expect(result.newVariableAllowance).toBe(9500);
    expect(result.newEmployeePF).toBe(2460); // 12% of 20500
  });

  it('calculates Basic using manual target amount', () => {
    const manualConfig = {
      ...validConfig,
      basicMethod: BASIC_CALCULATION_METHODS.MANUAL_TARGET,
      manualTargetBasic: 22000,
    };

    const result = calculateEmployeeSalary(baseEmployee, manualConfig);
    expect(result.newBasic).toBe(22000);
    expect(result.newVariableAllowance).toBe(8000); // 15000 - 7000
  });

  it('applies employee-wise override if provided', () => {
    const override = { customBasic: 28000 };
    const result = calculateEmployeeSalary(baseEmployee, validConfig, override);
    expect(result.newBasic).toBe(28000);
    expect(result.newVariableAllowance).toBe(2000); // 15000 - 13000
  });

  it('respects employee exclusion and leaves values untouched', () => {
    const override = { isExcluded: true };
    const result = calculateEmployeeSalary(baseEmployee, validConfig, override);
    expect(result.status).toBe('EXCLUDED');
    expect(result.newBasic).toBe(baseEmployee.basic);
    expect(result.newVariableAllowance).toBe(baseEmployee.variableAllowance);
    expect(result.deltaCTC).toBe(0);
  });

  it('excludes non-PF eligible employees when excludeNonPFEligible is enabled', () => {
    const nonPFEmp = {
      ...baseEmployee,
      employeeId: 'EMP_NON_PF',
      employeePF: 0,
      employerPF: 0,
    };

    const config = {
      ...validConfig,
      excludeNonPFEligible: true,
    };

    const result = calculateEmployeeSalary(nonPFEmp, config);
    expect(result.status).toBe('EXCLUDED');
    expect(result.newBasic).toBe(nonPFEmp.basic);
  });

  it('supports employer PF charge breakdown (EPF + EPS + EDLI + Admin = 13%)', () => {
    const breakdownConfig = {
      ...validConfig,
      employerPFRate: 0,
      employerEPFRate: 3.67,
      employerEPSRate: 8.33,
      employerEDLIRate: 0.5,
      employerAdminRate: 0.5, // total 13.0%
    };

    const result = calculateEmployeeSalary(baseEmployee, breakdownConfig);
    // 13.0% of 25000 = 3250
    expect(result.newEmployerPF).toBe(3250);
  });

  it('NEVER allows negative Variable Allowance: preserves original values and flags review', () => {
    const lowVariableEmp = {
      ...baseEmployee,
      basic: 10000,
      variableAllowance: 5000, // needs 15000 increase, but only has 5000
    };

    const result = calculateEmployeeSalary(lowVariableEmp, validConfig);
    expect(result.status).toBe('REVIEW');
    // Original variable allowance is preserved; NEVER forced to negative!
    expect(result.newVariableAllowance).toBe(5000);
    expect(result.newVariableAllowance).toBeGreaterThanOrEqual(0);
    expect(result.reviewReasons.some(r => r.includes('Insufficient Variable Allowance'))).toBe(true);
  });

  it('respects statutory ceiling of 15000 if enabled', () => {
    const cappedConfig = {
      ...validConfig,
      applyStatutoryCeiling: true,
      statutoryCeilingLimit: 15000,
    };

    const result = calculateEmployeeSalary(baseEmployee, cappedConfig);
    expect(result.status).toBe('VALID');
    expect(result.newBasic).toBe(25000);
    // 12% of 15000 = 1800
    expect(result.newEmployerPF).toBe(1800);
    expect(result.newEmployeePF).toBe(1800);
  });

  it('detects mathematical impossibility in PRESERVE_GROSS_NET when PF changes', () => {
    const preserveGrossNetConfig = {
      ...validConfig,
      preservationMode: PRESERVATION_MODES.PRESERVE_GROSS_NET,
    };

    const result = calculateEmployeeSalary(baseEmployee, preserveGrossNetConfig);
    expect(result.status).toBe('REVIEW');
    expect(result.reviewReasons.some(r => r.includes('Cannot preserve both Gross and Net'))).toBe(true);
  });

  it('detects mathematical impossibility in PRESERVE_CTC_NET when total PF changes', () => {
    const preserveCtcNetConfig = {
      ...validConfig,
      preservationMode: PRESERVATION_MODES.PRESERVE_CTC_NET,
    };

    const result = calculateEmployeeSalary(baseEmployee, preserveCtcNetConfig);
    expect(result.status).toBe('REVIEW');
    expect(result.reviewReasons.some(r => r.includes('Cannot preserve both CTC and Net'))).toBe(true);
  });

  it('flags unconfirmed statutory configuration', () => {
    const unconfirmedConfig = {
      ...validConfig,
      confirmedStatutory: false,
    };

    const result = calculateEmployeeSalary(baseEmployee, unconfirmedConfig);
    expect(result.status).toBe('REVIEW');
    expect(result.reviewReasons.some(r => r.includes('Statutory configuration has not been confirmed'))).toBe(true);
  });

  it('calculates batch statistics and employer cost difference accurately', () => {
    const employees = [
      baseEmployee,
      { ...baseEmployee, employeeId: 'EMP002', variableAllowance: 2000 },
      { employeeId: '', employeeName: '' },
    ];

    const batch = calculateBatchSalaries(employees, validConfig);
    expect(batch.stats.total).toBe(2);
    expect(batch.stats.valid).toBe(1);
    expect(batch.stats.requiresReview).toBe(1);
    expect(batch.stats.emptyRowsSkipped).toBe(1);
    expect(batch.stats.totalEmployerCostDiff).toBeGreaterThan(0);
  });
});
