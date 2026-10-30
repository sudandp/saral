import ExcelJS from 'exceljs';

export const SAMPLE_EMPLOYEES = [
  {
    employeeId: 'EMP101',
    employeeName: 'Aarav Patel',
    basic: 18000,
    da: 2000,
    hra: 9000,
    standardDeduction: 0,
    variableAllowance: 16000,
    performanceIncentive: 3000,
    washingAllowance: 1000,
    employerPF: 2400,
    employeePF: 2400,
    esi: 0,
    grossSalary: 49000,
    ctc: 51400,
    netSalary: 46600,
  },
  {
    employeeId: 'EMP102',
    employeeName: 'Priya Iyer',
    basic: 15000,
    da: 0,
    hra: 7500,
    standardDeduction: 0,
    variableAllowance: 14000,
    performanceIncentive: 2000,
    washingAllowance: 1000,
    employerPF: 1800,
    employeePF: 1800,
    esi: 0,
    grossSalary: 39500,
    ctc: 41300,
    netSalary: 37700,
  },
  {
    employeeId: 'EMP103',
    employeeName: 'Rohan Mehta',
    basic: 12000,
    da: 0,
    hra: 6000,
    standardDeduction: 0,
    variableAllowance: 4000, // Small variable allowance, increasing Basic to 25k will exceed this! Perfect test for Review flag
    performanceIncentive: 1000,
    washingAllowance: 1000,
    employerPF: 1440,
    employeePF: 1440,
    esi: 180,
    grossSalary: 24000,
    ctc: 25440,
    netSalary: 22380,
  },
  {
    employeeId: 'EMP104',
    employeeName: 'Sneha Kulkarni',
    basic: 22000,
    da: 3000,
    hra: 11000,
    standardDeduction: 0,
    variableAllowance: 18000,
    performanceIncentive: 4000,
    washingAllowance: 1200,
    employerPF: 3000,
    employeePF: 3000,
    esi: 0,
    grossSalary: 59200,
    ctc: 62200,
    netSalary: 56200,
  },
  {
    employeeId: 'EMP105',
    employeeName: 'Vikram Singh',
    basic: 25000,
    da: 0,
    hra: 12500,
    standardDeduction: 0,
    variableAllowance: 22000,
    performanceIncentive: 5000,
    washingAllowance: 1500,
    employerPF: 3000,
    employeePF: 3000,
    esi: 0,
    grossSalary: 66000,
    ctc: 69000,
    netSalary: 63000,
  },
  {
    employeeId: 'EMP-SUDHAN',
    employeeName: 'Sudhan (Reference Column J)',
    basic: 16099.35,
    da: 2390.40,
    hra: 7395.90,
    standardDeduction: 4166.67,
    variableAllowance: 9607.68,
    performanceIncentive: 9390,
    washingAllowance: 0,
    employerPF: 1950,
    employeePF: 1800,
    esi: 0,
    grossSalary: 49050,
    ctc: 51000,
    netSalary: 46950,
  },
  {
    employeeId: 'FT-24',
    employeeName: 'SRINIVASA R',
    basic: 11895.05,
    da: 3254.40,
    hra: 6059.78,
    standardDeduction: 4166.67,
    variableAllowance: 10441.18,
    performanceIncentive: 0,
    washingAllowance: 300,
    leavePay: 1037.63,
    bonus: 1261.94,
    employerPF: 1950,
    employeePF: 1818,
    esi: 0,
    grossSalary: 34249.98,
    ctc: 35000,
    netSalary: 31382,
  },
];

/**
 * Generates a realistic Saral PayPack style Excel workbook as an ArrayBuffer
 */
export async function createSampleSaralWorkbookBuffer() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Saral PayPack';
  wb.created = new Date();

  const ws = wb.addWorksheet('Saral_Salary_Master');

  // Realistic Saral PayPack header layout
  const headers = [
    'Emp ID',
    'Employee Name',
    'Basic Pay',
    'Dearness Allowance',
    'House Rent Allowance',
    'Standard Deduction',
    'Variable Allowance',
    'Performance Incentive',
    'Washing Allowance',
    'PF Employer Contrib',
    'PF Employee Contrib',
    'ESI Deduction',
    'Gross Salary',
    'Cost to Company',
    'Net Salary',
  ];

  // Title / Metadata row
  ws.mergeCells('A1:O1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SARAL PAYPACK - MONTHLY SALARY MASTER & RESTRUCTURING SHEET';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Header row
  const headerRow = ws.getRow(2);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });
  headerRow.height = 24;

  // Add sample employee rows
  SAMPLE_EMPLOYEES.forEach((emp, i) => {
    const row = ws.getRow(i + 3);
    const values = [
      emp.employeeId,
      emp.employeeName,
      emp.basic,
      emp.da,
      emp.hra,
      emp.standardDeduction,
      emp.variableAllowance,
      emp.performanceIncentive,
      emp.washingAllowance,
      emp.employerPF,
      emp.employeePF,
      emp.esi,
      emp.grossSalary,
      emp.ctc,
      emp.netSalary,
    ];

    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      cell.font = { name: 'Calibri', size: 10 };
      if (typeof v === 'number' && idx >= 2) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: idx === 0 ? 'center' : 'left', vertical: 'middle' };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    row.height = 20;
  });

  // Adjust column widths
  const colWidths = [12, 22, 14, 18, 20, 18, 18, 20, 18, 18, 18, 14, 16, 16, 16];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  return await wb.xlsx.writeBuffer();
}

