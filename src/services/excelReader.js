import ExcelJS from 'exceljs';
import { REQUIRED_SALARY_COMPONENTS, validateSaralCompatibility } from './salaryValidator.js';

/**
 * Normalizes text for header matching
 */
function normalizeHeader(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/[_\s\-\.\/]+/g, ' ');
}

/**
 * Auto-detect column mapping by inspecting header row values
 */
export function detectColumnMapping(headers) {
  const mapping = {};

  REQUIRED_SALARY_COMPONENTS.forEach(comp => {
    let bestMatchIndex = -1;
    let highestPriority = -1;

    headers.forEach((h, idx) => {
      const normalized = normalizeHeader(h);
      if (!normalized) return;

      // 1. Highest priority: Exact match with key or label
      if (normalized === comp.key.toLowerCase() || normalized === comp.label.toLowerCase()) {
        if (highestPriority < 4) {
          highestPriority = 4;
          bestMatchIndex = idx;
        }
        return;
      }

      // 2. Exact match with any configured alias
      for (const alias of comp.aliases) {
        const normAlias = normalizeHeader(alias);
        if (normalized === normAlias) {
          if (highestPriority < 3) {
            highestPriority = 3;
            bestMatchIndex = idx;
          }
          return;
        }
      }

      // 3. Word boundary match
      const words = normalized.split(/\s+/);
      for (const alias of comp.aliases) {
        const normAlias = normalizeHeader(alias);
        if (normAlias.length >= 3 || normAlias === 'pf' || normAlias === 'da') {
          if (words.includes(normAlias) || normalized.startsWith(normAlias + ' ') || normalized.endsWith(' ' + normAlias)) {
            // Avoid false positives like "Sup.PF" or "PFVOL" when looking for employee "PF"
            if (comp.key === 'employeePF' && (normalized.includes('vol') || normalized.includes('sup') || normalized.includes('emplr') || normalized.includes('er'))) {
              continue;
            }
            // Avoid "Perf flag" or "OTLY INC A" when matching incentive
            if (comp.key === 'performanceIncentive' && normalized.includes('flag')) {
              continue;
            }
            if (highestPriority < 2) {
              highestPriority = 2;
              bestMatchIndex = idx;
            }
          }
        }
      }
    });

    if (bestMatchIndex !== -1) {
      mapping[comp.key] = bestMatchIndex;
    } else {
      mapping[comp.key] = null;
    }
  });

  return mapping;
}

/**
 * Check if a row's values look like a header row
 */
export function isCandidateHeaderRow(rowValues) {
  const normalized = rowValues.map(v => normalizeHeader(v));
  const hasBasic = normalized.some(v => v.includes('basic'));
  const hasName = normalized.some(v => v === 'name' || v.includes('name') || v.includes('emp name'));
  const hasId = normalized.some(v => v.includes('ref') || v.includes('id') || v.includes('emp'));
  return hasBasic && (hasName || hasId);
}

/**
 * Extract all sections and employees from a worksheet, supporting multiple sections and blank rows.
 */
export function extractSectionsAndEmployeesFromSheet(worksheet) {
  const sections = [];
  let currentSection = null;
  const employees = [];

  for (let r = 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const rowValues = [];
    let hasAnyValue = false;

    for (let c = 1; c <= worksheet.columnCount; c++) {
      const cellVal = row.getCell(c).value;
      const textVal = (cellVal !== null && cellVal !== undefined)
        ? (typeof cellVal === 'object' && cellVal.result !== undefined ? String(cellVal.result) : String(cellVal))
        : '';
      rowValues.push(textVal.trim());
      if (textVal.trim() !== '') hasAnyValue = true;
    }

    if (!hasAnyValue) continue;

    // Check if this row is a header row
    if (isCandidateHeaderRow(rowValues)) {
      const mapping = detectColumnMapping(rowValues);
      currentSection = {
        headerRowNumber: r,
        headers: rowValues,
        columnMapping: mapping,
        sectionIndex: sections.length,
      };
      sections.push(currentSection);
      continue;
    }

    // If we have an active section, try extracting employee data
    if (currentSection) {
      const emp = {
        __rowIndex: r,
        __sheetName: worksheet.name,
        __sectionHeaderRow: currentSection.headerRowNumber,
        __columnMapping: currentSection.columnMapping,
      };

      REQUIRED_SALARY_COMPONENTS.forEach(comp => {
        const colIndex = currentSection.columnMapping[comp.key];
        if (colIndex !== null && colIndex !== undefined && colIndex >= 0) {
          const cell = row.getCell(colIndex + 1);
          let cellValue = cell.value;

          if (cellValue && typeof cellValue === 'object') {
            if (cellValue.result !== undefined) {
              cellValue = cellValue.result;
            } else if (cellValue.text) {
              cellValue = cellValue.text;
            }
          }
          emp[comp.key] = cellValue !== null && cellValue !== undefined ? cellValue : '';
        } else {
          emp[comp.key] = '';
        }
      });

      // Avoid picking up totals or summary footer rows
      const empIdStr = String(emp.employeeId || '').trim().toLowerCase();
      const empNameStr = String(emp.employeeName || '').trim().toLowerCase();
      if (empIdStr.includes('total') || empNameStr.includes('total') || empIdStr.includes('sum')) {
        continue;
      }

      // Valid employee row must have ID or Name
      if (emp.employeeId || emp.employeeName) {
        employees.push(emp);
      }
    }
  }

  return {
    sections,
    employees,
  };
}

/**
 * Reads an Excel file buffer or File object and parses all worksheets, sections, and employee records.
 * 
 * @param {File | ArrayBuffer | Buffer} fileInput
 * @returns {Promise<Object>} workbook metadata, worksheets, detected rows, column mappings
 */
export async function readSaralWorkbook(fileInput) {
  const workbook = new ExcelJS.Workbook();
  let arrayBuffer;

  if (fileInput instanceof ArrayBuffer) {
    arrayBuffer = fileInput;
  } else if (fileInput && typeof fileInput.arrayBuffer === 'function') {
    arrayBuffer = await fileInput.arrayBuffer();
  } else if (fileInput && fileInput.buffer instanceof ArrayBuffer) {
    arrayBuffer = fileInput.buffer;
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileInput)) {
    arrayBuffer = fileInput.buffer.slice(fileInput.byteOffset, fileInput.byteOffset + fileInput.byteLength);
  } else {
    throw new Error('Unsupported file input type. Expected File, Buffer, or ArrayBuffer.');
  }

  // Load workbook from buffer
  await workbook.xlsx.load(arrayBuffer);

  const sheetsInfo = [];
  let primarySheetData = null;
  let primarySheetName = '';
  let primarySections = [];
  let allEmployees = [];

  workbook.eachSheet((worksheet) => {
    const { sections, employees } = extractSectionsAndEmployeesFromSheet(worksheet);

    const sheetDetails = {
      id: worksheet.id,
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columnCount: worksheet.columnCount,
      hidden: worksheet.state === 'hidden',
      sectionsCount: sections.length,
      employeesCount: employees.length,
      sections,
      headerRowNumber: sections[0]?.headerRowNumber || 1,
      headers: sections[0]?.headers || [],
      columnMapping: sections[0]?.columnMapping || {},
    };
    sheetsInfo.push(sheetDetails);

    // Pick sheet with most employees as default active sheet
    if (!primarySheetData || employees.length > (primarySheetData.employeesCount || 0)) {
      primarySheetData = sheetDetails;
      primarySheetName = worksheet.name;
      primarySections = sections;
      allEmployees = employees;
    }
  });

  if (!primarySheetData) {
    throw new Error('No valid worksheets found in uploaded Excel workbook.');
  }

  // Validate Saral compatibility against primary section
  const compatibility = validateSaralCompatibility(
    primarySheetData.headers,
    sheetsInfo
  );

  return {
    rawBuffer: arrayBuffer,
    workbook, // preserved ExcelJS workbook
    sheets: sheetsInfo,
    selectedSheetName: primarySheetName,
    headerRowNumber: primarySheetData.headerRowNumber,
    headers: primarySheetData.headers,
    columnMapping: primarySheetData.columnMapping,
    sections: primarySections,
    compatibility,
    employees: allEmployees,
  };
}

/**
 * Backward compatibility extractor helper
 */
export function extractEmployeesFromSheet(worksheet, headerRowNumber, columnMapping) {
  const { employees } = extractSectionsAndEmployeesFromSheet(worksheet);
  return employees;
}
