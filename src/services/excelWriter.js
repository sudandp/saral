import ExcelJS from 'exceljs';

/**
 * Generate a revised Saral Excel workbook by modifying ONLY intended salary cells
 * for cleanly validated employees in a clone of the original workbook.
 * 
 * Preserves every original worksheet, sheet names, styles, fonts, borders, widths,
 * formulas, merged cells, and non-salary columns.
 * 
 * @param {ArrayBuffer} originalBuffer - Original file buffer
 * @param {Array} processedResults - Array of processed employee objects from salaryCalculator
 * @param {Object} defaultColumnMapping - Fallback column mapping
 * @param {string} targetSheetName - Target sheet name
 * @returns {Promise<Blob>} Blob representing the revised .xlsx file
 */
export async function generateRevisedWorkbook(originalBuffer, processedResults, defaultColumnMapping, targetSheetName) {
  const newWorkbook = new ExcelJS.Workbook();
  await newWorkbook.xlsx.load(originalBuffer);

  const worksheet = newWorkbook.getWorksheet(targetSheetName) || newWorkbook.worksheets[0];
  if (!worksheet) {
    throw new Error(`Target worksheet "${targetSheetName}" not found in workbook.`);
  }

  // Component key to value extractor
  const componentValueMap = {
    basic: (res) => res.newBasic,
    variableAllowance: (res) => res.newVariableAllowance,
    employerPF: (res) => res.newEmployerPF,
    employeePF: (res) => res.newEmployeePF,
    grossSalary: (res) => res.newGross,
    ctc: (res) => res.newCTC,
    netSalary: (res) => res.newNet,
  };

  // Modify only validly restructured records
  // For records requiring review or excluded records, NEVER write invalid/negative values to Excel!
  for (const result of processedResults) {
    if (!result.rowIndex) continue;
    if (result.status !== 'VALID') continue; // Preserve original spreadsheet cells untouched!

    const row = worksheet.getRow(result.rowIndex);
    // Use section-specific column mapping if available, else fallback
    const colMapping = result.columnMapping || defaultColumnMapping;

    Object.entries(componentValueMap).forEach(([key, getValue]) => {
      const colIdx = colMapping[key];
      if (colIdx !== null && colIdx !== undefined && colIdx >= 0) {
        const cell = row.getCell(colIdx + 1); // 1-based index
        const newVal = getValue(result);

        const existingNumFmt = cell.numFmt;
        const existingStyle = { ...cell.style };

        // Update formula ceiling from 15,000 to 25,000 if formula exists
        if (cell.formula) {
          const updatedFormula = cell.formula.replace(/15000/g, '25000');
          cell.value = {
            formula: updatedFormula,
            result: newVal,
          };
        } else if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
          const updatedFormula = cell.value.formula.replace(/15000/g, '25000');
          cell.value = {
            ...cell.value,
            formula: updatedFormula,
            result: newVal,
          };
        } else {
          cell.value = newVal;
        }

        if (Object.keys(existingStyle).length > 0) {
          cell.style = existingStyle;
        }
        if (existingNumFmt) {
          cell.numFmt = existingNumFmt;
        }
      }
    });

    row.commit();
  }

  const buffer = await newWorkbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate a separate detailed Processing Summary & Error Audit Report workbook
 * 
 * @param {Array} processedResults - All employee results
 * @param {Object} stats - Batch processing statistics
 * @param {Object} config - Used configuration settings
 * @returns {Promise<Blob>}
 */
export async function generateSummaryAuditWorkbook(processedResults, stats, config) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Saral Salary Converter';
  wb.created = new Date();

  // Sheet 1: Restructuring Audit Report
  const wsReport = wb.addWorksheet('Restructuring Audit');

  wsReport.columns = [
    { header: 'Employee ID', key: 'employeeId', width: 14 },
    { header: 'Employee Name', key: 'employeeName', width: 24 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Old Basic (₹)', key: 'oldBasic', width: 14 },
    { header: 'New Basic (₹)', key: 'newBasic', width: 14 },
    { header: 'DA (₹)', key: 'da', width: 12 },
    { header: 'Basic + DA (₹)', key: 'basicPlusDA', width: 14 },
    { header: 'Old HRA (₹)', key: 'oldHRA', width: 14 },
    { header: 'New HRA (₹)', key: 'newHRA', width: 14 },
    { header: 'Old Var Allow (₹)', key: 'oldVariableAllowance', width: 16 },
    { header: 'New Var Allow (₹)', key: 'newVariableAllowance', width: 16 },
    { header: 'Old EE PF (₹)', key: 'oldEmployeePF', width: 14 },
    { header: 'New EE PF (₹)', key: 'newEmployeePF', width: 14 },
    { header: 'Old ER PF (₹)', key: 'oldEmployerPF', width: 14 },
    { header: 'New ER PF (₹)', key: 'newEmployerPF', width: 14 },
    { header: 'Orig PF Basis (₹)', key: 'originalPFBasis', width: 16 },
    { header: 'New PF Basis (₹)', key: 'newPFBasis', width: 16 },
    { header: 'Old Gross (₹)', key: 'oldGross', width: 14 },
    { header: 'New Gross (₹)', key: 'newGross', width: 14 },
    { header: 'Old CTC (₹)', key: 'oldCTC', width: 14 },
    { header: 'New CTC (₹)', key: 'newCTC', width: 14 },
    { header: 'Old Net (₹)', key: 'oldNet', width: 14 },
    { header: 'New Net (₹)', key: 'newNet', width: 14 },
    { header: 'Review / Deficit Notes', key: 'notes', width: 50 },
  ];

  // Header style
  const headerRow = wsReport.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  processedResults.forEach(res => {
    const row = wsReport.addRow({
      employeeId: res.employeeId,
      employeeName: res.employeeName,
      status: res.status,
      oldBasic: res.oldBasic,
      newBasic: res.newBasic,
      da: res.newDA,
      basicPlusDA: res.newBasic + res.newDA,
      oldHRA: res.oldHRA,
      newHRA: res.newHRA,
      oldVariableAllowance: res.oldVariableAllowance,
      newVariableAllowance: res.newVariableAllowance,
      oldEmployeePF: res.oldEmployeePF,
      newEmployeePF: res.newEmployeePF,
      oldEmployerPF: res.oldEmployerPF,
      newEmployerPF: res.newEmployerPF,
      originalPFBasis: res.originalPFBasis,
      newPFBasis: res.newPFBasis,
      oldGross: res.oldGross,
      newGross: res.newGross,
      oldCTC: res.oldCTC,
      newCTC: res.newCTC,
      oldNet: res.oldNet,
      newNet: res.newNet,
      notes: res.reviewReasons && res.reviewReasons.length > 0
        ? res.reviewReasons.join(' | ')
        : (res.infoNotes && res.infoNotes.length > 0 ? res.infoNotes.join(' | ') : 'Validated successfully'),
    });

    const statusCell = row.getCell('status');
    if (res.status === 'VALID') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      statusCell.font = { color: { argb: 'FF166534' }, bold: true };
    } else if (res.status === 'EXCLUDED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      statusCell.font = { color: { argb: 'FF475569' }, bold: true };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
    }
  });

  // Sheet 2: Configuration & Summary
  const wsSummary = wb.addWorksheet('Configuration Summary');
  wsSummary.columns = [
    { header: 'Parameter', key: 'param', width: 34 },
    { header: 'Configured Value', key: 'value', width: 44 },
  ];

  const sumHeader = wsSummary.getRow(1);
  sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sumHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const employerRate = (config.employerEPFRate || 0) + (config.employerEPSRate || 0) + (config.employerEDLIRate || 0) + (config.employerAdminRate || 0);

  const configRows = [
    { param: 'Target PF Wage (₹)', value: config.targetPFWage },
    { param: 'Basic Restructuring Method', value: config.basicMethod },
    { param: 'Employer PF Rate (%)', value: `${employerRate}% (EPF: ${config.employerEPFRate}%, EPS: ${config.employerEPSRate}%, EDLI: ${config.employerEDLIRate}%, Admin: ${config.employerAdminRate}%)` },
    { param: 'Employee PF Rate (%)', value: `${config.employeePFRate}%` },
    { param: 'Statutory Wage Ceiling Applied', value: config.applyStatutoryCeiling ? `Yes (Cap at ₹${config.statutoryCeilingLimit})` : 'No (Uncapped)' },
    { param: 'DA Included in PF Wage', value: config.includeDAInPF ? 'Yes' : 'No' },
    { param: 'Standard Deduction Excluded', value: 'Yes (Statutory Compliance)' },
    { param: 'Salary Preservation Mode', value: config.preservationMode },
    { param: 'Total Employees Evaluated', value: stats.total },
    { param: 'Cleanly Restructured (Valid)', value: stats.valid },
    { param: 'Requiring Review (Deficit / Preserved)', value: stats.requiresReview },
    { param: 'Excluded / Inactive Records', value: stats.excluded || 0 },
    { param: 'Total Monthly Employer Cost Variance (₹)', value: `₹${Math.round(stats.totalEmployerCostDiff || 0).toLocaleString()}` },
    { param: 'Timestamp', value: new Date().toLocaleString() },
  ];

  configRows.forEach(item => wsSummary.addRow(item));

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
