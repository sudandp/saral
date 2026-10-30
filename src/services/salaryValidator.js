/**
 * Salary and Template Validator
 * Validates Saral import structure, missing columns, blank rows, and data anomalies.
 */

// Canonical Saral component keys and comprehensive aliases for Saral PayPack templates
export const REQUIRED_SALARY_COMPONENTS = [
  {
    key: 'employeeId',
    label: 'Employee ID',
    required: true,
    aliases: ['ref. no.', 'ref no', 'ref no.', 'ref.no.', 'emp id', 'empid', 'emp no', 'emp code', 'employee code', 'employee id', 'token no', 'badge no']
  },
  {
    key: 'employeeName',
    label: 'Employee Name',
    required: true,
    aliases: ['name', 'emp name', 'employee name', 'staff name', 'worker name']
  },
  {
    key: 'basic',
    label: 'Basic',
    required: true,
    aliases: ['basic', 'basic pay', 'basic salary', 'basic wage', 'basic_pay']
  },
  {
    key: 'da',
    label: 'DA',
    required: false,
    aliases: ['da', 'd.a.', 'dearness allowance', 'da amount']
  },
  {
    key: 'hra',
    label: 'HRA',
    required: false,
    aliases: ['hra', 'h.r.a.', 'house rent allowance', 'house rent']
  },
  {
    key: 'standardDeduction',
    label: 'Standard Deduction',
    required: false,
    aliases: ['std ded.', 'std ded', 'std deduction', 'standard deduction', 'standard ded']
  },
  {
    key: 'variableAllowance',
    label: 'Variable Allowance',
    required: true,
    aliases: ['var allow', 'var all', 'variable allowance', 'var allowance', 'variable pay', 'special allowance', 'other allowance', 'special', 'allowance']
  },
  {
    key: 'performanceIncentive',
    label: 'Performance Incentive',
    required: false,
    aliases: ['perf incen', 'perf inc', 'performance incentive', 'performance pay', 'incentive', 'bonus', 'perf incentive']
  },
  {
    key: 'washingAllowance',
    label: 'Washing Allowance',
    required: false,
    aliases: ['wash allow', 'washing allowance', 'washing allow', 'conveyance allowance', 'washing']
  },
  {
    key: 'employerPF',
    label: 'Employer PF',
    required: false,
    aliases: ['emplr pf', 'pf employer', 'employer pf', 'employer pf contrib', 'pf er', 'co pf', 'epf employer']
  },
  {
    key: 'employeePF',
    label: 'Employee PF',
    required: false,
    aliases: ['pf', 'pf employee', 'employee pf', 'employee pf contrib', 'pf ee', 'epf employee']
  },
  {
    key: 'esi',
    label: 'ESI',
    required: false,
    aliases: ['esi', 'esic', 'employee esi', 'esi deduction']
  },
  {
    key: 'grossSalary',
    label: 'Gross Salary',
    required: false, // In rate-master sheets (like Salary Rate), Gross is computed dynamically from earnings
    aliases: ['gross total', 'gross salary', 'gross pay', 'gross', 'total earnings', 'gross wages']
  },
  {
    key: 'ctc',
    label: 'CTC',
    required: true,
    aliases: ['bill ctc', 'ctc', 'cost to company', 'total ctc', 'annual ctc / 12', 'ctc pm', 'bill amt', 'billamt']
  },
  {
    key: 'netSalary',
    label: 'Net Salary',
    required: false, // In rate-master sheets (like Salary Rate), Net is computed dynamically
    aliases: ['net amount', 'net salary', 'net pay', 'net', 'take home', 'net wages']
  },
];

/**
 * Standard Saral PayPack import template characteristics validator
 */
export function validateSaralCompatibility(headers = [], sheets = []) {
  const normalizedHeaders = headers.map(h => String(h || '').trim().toLowerCase().replace(/[_\s\-\.\/]+/g, ' '));
  
  const foundComponents = [];
  const missingComponents = [];

  for (const comp of REQUIRED_SALARY_COMPONENTS) {
    const isFound = normalizedHeaders.some(h => {
      if (h === comp.key.toLowerCase() || h === comp.label.toLowerCase()) return true;
      return comp.aliases.some(alias => {
        const normAlias = alias.toLowerCase().replace(/[_\s\-\.\/]+/g, ' ');
        return h === normAlias || h.split(' ').includes(normAlias);
      });
    });

    if (isFound) {
      foundComponents.push(comp);
    } else {
      missingComponents.push(comp);
    }
  }

  const missingRequired = missingComponents.filter(c => c.required);
  
  const requiredCount = REQUIRED_SALARY_COMPONENTS.filter(c => c.required).length;
  const matchedRequiredCount = requiredCount - missingRequired.length;
  const score = Math.round((matchedRequiredCount / requiredCount) * 100);

  const isCompatible = missingRequired.length === 0;

  let compatibilityMessage = '';
  if (isCompatible) {
    compatibilityMessage = 'Workbook matches Saral PayPack column structure.';
  } else {
    compatibilityMessage = `Incomplete Saral template structure. Missing required columns: ${missingRequired.map(c => c.label).join(', ')}.`;
  }

  return {
    isCompatible,
    confidenceScore: score,
    compatibilityMessage,
    foundComponents,
    missingComponents,
    missingRequired,
    totalHeadersFound: headers.length,
    sheetsCount: sheets.length,
  };
}

/**
 * Validates a list of employee records for anomalies
 */
export function validateEmployeeRecords(employees = []) {
  const errors = [];
  const warnings = [];
  const idMap = new Map();

  let validRowCount = 0;
  let blankRowCount = 0;

  employees.forEach((emp, index) => {
    const rowNum = emp.__rowIndex || index + 2;
    const empId = String(emp.employeeId || '').trim();
    const empName = String(emp.employeeName || '').trim();

    if (!empId && !empName) {
      blankRowCount++;
      return;
    }

    validRowCount++;

    if (empId) {
      if (idMap.has(empId)) {
        warnings.push({
          row: rowNum,
          field: 'employeeId',
          message: `Duplicate Employee ID "${empId}" detected at row ${rowNum} (first seen at row ${idMap.get(empId)}).`,
        });
      } else {
        idMap.set(empId, rowNum);
      }
    } else {
      warnings.push({
        row: rowNum,
        field: 'employeeId',
        message: `Missing Employee ID for employee "${empName}" at row ${rowNum}.`,
      });
    }

    const basic = Number(emp.basic || 0);
    const gross = Number(emp.grossSalary || 0);
    if (gross > 0 && basic > gross) {
      errors.push({
        row: rowNum,
        field: 'basic',
        message: `Basic salary (₹${basic.toLocaleString()}) exceeds Gross salary (₹${gross.toLocaleString()}) at row ${rowNum}.`,
      });
    }
  });

  return {
    validRowCount,
    blankRowCount,
    errors,
    warnings,
    hasBlockingErrors: errors.length > 0,
  };
}
