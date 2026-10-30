import { describe, it, expect } from 'vitest';
import {
  calculateStatutoryEmployerPF,
  calculateStatutoryEmployeePF,
  solveGoalSeekBasic,
  calculateEmployeeSalary,
  calculateBatchSalaries,
  ROUNDING_MODES,
  PRESERVATION_MODES,
  REVIEW_CATEGORIES,
} from '../src/services/salaryCalculator.js';
import { ARVIND_REFERENCE, SRINIVASA_REFERENCE, SAMPLE_EMPLOYEES } from '../src/sampleData.js';

describe('Corrected PF Calculation Engine (Statutory Compliance & Goal Seek)', () => {
  describe('1. Exact Statutory PF Formulas & Rounding', () => {
    it('Employer PF: =ROUNDUP(IF((Basic+DA)>=25000, 25000*13%, (Basic+DA)*13%), 0)', () => {
      // 1. Below ceiling (e.g. 15,000): 15000 * 13% = 1950
      expect(calculateStatutoryEmployerPF(12174, 2826)).toBe(1950);

      // 2. Fractional wage with ROUNDUP to next rupee: 14500.50 * 0.13 = 1885.065 -> 1886
      expect(calculateStatutoryEmployerPF(12500.50, 2000)).toBe(1886);

      // 3. Exactly at ceiling (25,000): 25000 * 13% = 3250
      expect(calculateStatutoryEmployerPF(20000, 5000)).toBe(3250);

      // 4. Above ceiling (e.g. 30,000): capped at 25000 * 13% = 3250
      expect(calculateStatutoryEmployerPF(25000, 5000)).toBe(3250);
    });

    it('Employee PF: =ROUNDUP(IF((Basic+DA)>=25000, 25000*12%, (Basic+DA)*12%), 0)', () => {
      // 1. Below ceiling (e.g. 15,000): 15000 * 12% = 1800
      expect(calculateStatutoryEmployeePF(12174, 2826)).toBe(1800);

      // 2. Fractional wage with ROUNDUP to next rupee: 14500.50 * 0.12 = 1740.06 -> 1741
      expect(calculateStatutoryEmployeePF(12500.50, 2000)).toBe(1741);

      // 3. Exactly at ceiling (25,000): 25000 * 12% = 3000
      expect(calculateStatutoryEmployeePF(20000, 5000)).toBe(3000);

      // 4. Above ceiling (e.g. 35,000): capped at 25000 * 12% = 3000
      expect(calculateStatutoryEmployeePF(30000, 5000)).toBe(3000);
    });
  });

  describe('2. Goal Seek Solver with Independent Target Verification', () => {
    it('verifies both contribution targets independently and solves revised Basic when compatible', () => {
      // Target: ER PF = 1950, EE PF = 1800, DA = 2826
      const result = solveGoalSeekBasic(1950, 1800, 2826);

      expect(result.canSatisfyBoth).toBe(true);
      expect(result.erMatches).toBe(true);
      expect(result.eeMatches).toBe(true);
      expect(result.chosenWage).toBe(15000);
      expect(result.revisedBasic).toBe(12174);
      expect(result.newEmployerPF).toBe(1950);
      expect(result.newEmployeePF).toBe(1800);
    });

    it('flags when contribution targets cannot be satisfied together under statutory formulas', () => {
      // Target: ER PF = 1950 (implies wage ~15,000), EE PF = 1818 (implies wage ~15,150)
      const result = solveGoalSeekBasic(1950, 1818, 3254.40);

      expect(result.canSatisfyBoth).toBe(false);
      expect(result.erMatches).toBe(true);
      expect(result.eeMatches).toBe(false); // 1800 !== 1818
    });
  });

  describe('3. Arvind Reference Test (Arvind for GR Sankalpa.xlsx)', () => {
    const config = {
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      roundingMode: ROUNDING_MODES.EXACT,
      confirmedStatutory: true,
    };

    it('processes Arvind cleanly with 100% preservation of Gross, CTC, and Net', () => {
      const result = calculateEmployeeSalary(ARVIND_REFERENCE, config);

      expect(result.isValidRow).toBe(true);
      expect(result.status).toBe('VALID');
      expect(result.reviewReasons.length).toBe(0);

      // 1. Goal Seek Revised Basic: 15000 - 2826 = 12174
      expect(result.newBasic).toBe(12174);

      // 2. DA unchanged
      expect(result.newDA).toBe(2826);

      // 3. Standard Deduction unchanged (excluded from PF wages)
      expect(result.newStandardDeduction).toBeCloseTo(4166.67, 2);

      // 4. HRA recalculated at 40% of (Basic + DA): 15000 * 0.40 = 6000
      expect(result.newHRA).toBe(6000);

      // 5. Variable Allowance balances Gross:
      // Old VA (20054.73) + (16423 - 12174) + (7699.60 - 6000) = 26003.33
      expect(result.newVariableAllowance).toBeCloseTo(26003.33, 2);

      // 6. Performance Incentive unchanged
      expect(result.newPerformanceIncentive).toBe(12080);

      // 7. Employer PF matches target independently
      expect(result.newEmployerPF).toBe(1950);
      expect(result.deltaEmployerPF).toBe(0);

      // 8. Employee PF matches target independently
      expect(result.newEmployeePF).toBe(1800);
      expect(result.deltaPF).toBe(0);

      // 9. Gross Salary preserved
      expect(result.newGross).toBe(63250);
      expect(result.deltaGross).toBe(0);

      // 10. CTC preserved
      expect(result.newCTC).toBe(65200);
      expect(result.deltaCTC).toBe(0);

      // 11. Net Salary preserved exactly
      expect(result.newNet).toBe(60400);
      expect(result.deltaNet).toBe(0);
    });
  });

  describe('4. Srinivasa R Reference Test', () => {
    const config = {
      preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
      roundingMode: ROUNDING_MODES.EXACT,
      confirmedStatutory: true,
    };

    it('flags Srinivasa R for review when original targets conflict (ER: 1950 vs EE: 1818)', () => {
      // With conflicting original targets: ER 1950 (from 15k ceiling) and EE 1818 (from uncapped 15149.45 * 12%)
      const result = calculateEmployeeSalary(SRINIVASA_REFERENCE, config);

      expect(result.isValidRow).toBe(true);
      // Rule 9: If targets cannot be satisfied together, flag the employee
      expect(result.status).toBe('REVIEW');
      expect(result.reviewCategories).toContain(REVIEW_CATEGORIES.PF_MISMATCH);
      expect(result.reviewReasons.some(r => r.includes('cannot be satisfied together under statutory formulas'))).toBe(true);

      // Does not silently alter other salary components
      expect(result.newDA).toBe(3254.40);
      expect(result.newWashingAllowance).toBe(300);
      expect(result.newLeavePay).toBe(1037.63);
      expect(result.newBonus).toBe(1261.94);
    });

    it('successfully restructures Srinivasa R when statutory targets align at ₹15,000 ceiling (ER: 1950, EE: 1800)', () => {
      const srinivasaAligned = {
        ...SRINIVASA_REFERENCE,
        employeePF: 1800, // Capped at ₹15,000 ceiling matching Employer PF
      };

      const result = calculateEmployeeSalary(srinivasaAligned, config);

      expect(result.isValidRow).toBe(true);
      expect(result.status).toBe('VALID');

      // Basic: 15000 - 3254.40 = 11745.60
      expect(result.newBasic).toBe(11745.60);
      expect(result.newDA).toBe(3254.40);

      // HRA: 15000 * 0.40 = 6000
      expect(result.newHRA).toBe(6000);

      // Variable Allowance balances Gross
      expect(result.newVariableAllowance).toBeCloseTo(10650.41, 2);

      // PF Contributions
      expect(result.newEmployerPF).toBe(1950);
      expect(result.newEmployeePF).toBe(1800);

      // Reconciled Gross, CTC, and Net
      expect(result.newGross).toBe(34249.98);
      expect(result.newCTC).toBe(35000);
      expect(result.newNet).toBe(31382);
    });
  });

  describe('5. Bulk Processing Verification (Test.xlsx Sample Data)', () => {
    it('processes all 55 employees with verified statutory PF formulas', () => {
      const config = {
        preservationMode: PRESERVATION_MODES.SALARY_NEUTRAL,
        roundingMode: ROUNDING_MODES.EXACT,
        confirmedStatutory: true,
      };

      const batch = calculateBatchSalaries(SAMPLE_EMPLOYEES, config);

      expect(batch.stats.total).toBe(55);
      expect(batch.stats.valid).toBe(55);
      expect(batch.stats.requiresReview).toBe(0);
      expect(batch.stats.excluded).toBe(0);
      expect(batch.results.every(r => r.newVariableAllowance >= 0)).toBe(true);
    });
  });
});
