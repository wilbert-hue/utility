const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const REFERENCE_FILE =
  'refer only proposition 3 of Sample Framework_Customer Database_U.K. Composite Utility Transmission Pole Market.xlsx';
const REFERENCE_SHEET = 'Revised Proposition 3';
const OUTPUT_FILE = path.join(__dirname, 'public', 'data', 'customer-intelligence.json');
const TOTAL_ROWS = 15;

const PROP1_COLS = [
  'customerCompanyName',
  'businessOverview',
  'customerTypeAndNetworkResponsibility',
  'compositePoleApplicationUseCase',
  'annualRevenueOrNetworkBudgetSignal',
  'sizeOperatingScale',
  'keyContactPerson',
  'designationDecisionMakerRole',
  'emailAddress',
  'telephoneWhatsappNumber',
  'linkedInProfile',
  'website',
];

const PROP2_EXTRA = [
  'compositePolePurchaseCriteria',
  'networkPainPoints',
  'gridComplianceAndOperationalIssues',
  'digitalMaturity',
  'riskExposure',
];

const PROP3_EXTRA = [
  'assetRenewalCycleAndBuyingTriggers',
  'budgetOwner',
  'procurementModel',
  'vendorSelectionCriteria',
  'preferredEngagementMode',
  'preferredDeploymentServiceContract',
  'preferredSolutionType',
  'integrationTechnicalServiceRequirement',
  'potentialCustomerDetails',
  'additionalCmiNotes',
];

const ENTITY_NOTE =
  '(Entity Across Transmission System Operators and Transmission Utilities, Distribution Network Operators, EPC and Grid Infrastructure Contractors, Industrial Power Network Owners, Government and Public Transmission Agencies)';

function normalizeCell(value) {
  return String(value ?? '')
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitleLines(rows) {
  const raw = String(rows[0]?.[0] || rows[0]?.[1] || '');
  return raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function findCompanyNameColumn(rows) {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const idx = rows[r].findIndex(
      (cell) => String(cell).trim() === 'Customer / Company Name'
    );
    if (idx !== -1) {
      return { headerRowIdx: r, companyColIdx: idx };
    }
  }
  return null;
}

function appendMultilineField(existing, value) {
  const next = normalizeCell(value);
  if (!next) return existing;
  return existing ? `${existing}\n${next}` : next;
}

function parseReferenceSheet(wb, extraColsAfterBase = []) {
  const ws = wb.Sheets[REFERENCE_SHEET];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const titleLines = extractTitleLines(rows);
  const header = findCompanyNameColumn(rows);

  if (!header) {
    throw new Error(`Could not find header row in sheet "${REFERENCE_SHEET}"`);
  }

  const { headerRowIdx, companyColIdx } = header;
  const sNoColIdx = companyColIdx - 1;
  const allCols = [...PROP1_COLS, ...extraColsAfterBase];
  const dataRows = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const sNo = row[sNoColIdx];
    const company = row[companyColIdx];
    if (String(company).trim() === 'Customer / Company Name') continue;

    if (!company) {
      const prev = dataRows[dataRows.length - 1];
      const altContact = normalizeCell(row[companyColIdx + 6]);
      if (prev && altContact) {
        prev.keyContactPerson = appendMultilineField(prev.keyContactPerson, altContact);
        prev.designationDecisionMakerRole = appendMultilineField(
          prev.designationDecisionMakerRole,
          row[companyColIdx + 7]
        );
        prev.emailAddress = appendMultilineField(prev.emailAddress, row[companyColIdx + 8]);
        prev.telephoneWhatsappNumber = appendMultilineField(
          prev.telephoneWhatsappNumber,
          row[companyColIdx + 9]
        );
        prev.linkedInProfile = appendMultilineField(prev.linkedInProfile, row[companyColIdx + 10]);
        prev.website = appendMultilineField(prev.website, row[companyColIdx + 11]);
      }
      continue;
    }

    if (!sNo && !company) continue;
    if (String(company).startsWith('Customer ')) continue;

    const record = { sNo: normalizeCell(sNo) };
    allCols.forEach((key, idx) => {
      record[key] = normalizeCell(row[companyColIdx + idx] ?? '');
    });
    dataRows.push(record);
  }

  return { titleLines, rows: dataRows };
}

function pickColumns(record, columns, sNo) {
  const picked = { sNo: String(sNo) };
  for (const col of columns) {
    picked[col] = record[col] ?? '';
  }
  return picked;
}

function createPlaceholderRow(sNo, columns, dataRowCount) {
  const row = { sNo: String(sNo) };
  const placeholderIndex = sNo - dataRowCount;
  const label =
    sNo === TOTAL_ROWS ? 'Customer N' : `Customer ${placeholderIndex + 4}`;

  for (const col of columns) {
    row[col] = col === 'customerCompanyName' ? label : 'xx';
  }

  return row;
}

function buildPropositionRows(fullRows, columns) {
  const rows = fullRows.map((record, idx) => pickColumns(record, columns, idx + 1));

  for (let sNo = rows.length + 1; sNo <= TOTAL_ROWS; sNo++) {
    rows.push(createPlaceholderRow(sNo, columns, fullRows.length));
  }

  return rows;
}

function main() {
  const wb = XLSX.readFile(REFERENCE_FILE);
  const parsed = parseReferenceSheet(wb, [...PROP2_EXTRA, ...PROP3_EXTRA]);
  const fullRows = parsed.rows;

  const prop3Columns = [...PROP1_COLS, ...PROP2_EXTRA, ...PROP3_EXTRA];
  const prop2Columns = [...PROP1_COLS, ...PROP2_EXTRA];
  const prop1Columns = [...PROP1_COLS];

  const output = {
    marketTitle: 'U.K. Composite Utility Transmission Pole Market - Customer Database',
    subtitle: 'Verified directory and insight on customers',
    entityNote: ENTITY_NOTE,
    proposition1: {
      id: 'proposition-1',
      label: 'Proposition 1 - Basic',
      titleLines: parsed.titleLines,
      rows: buildPropositionRows(fullRows, prop1Columns),
    },
    proposition2: {
      id: 'proposition-2',
      label: 'Proposition 2 - Advance',
      titleLines: parsed.titleLines,
      rows: buildPropositionRows(fullRows, prop2Columns),
    },
    proposition3: {
      id: 'proposition-3',
      label: 'Proposition 3 - Premium',
      titleLines: parsed.titleLines,
      rows: buildPropositionRows(fullRows, prop3Columns),
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log('Written', OUTPUT_FILE);
  console.log('Source:', REFERENCE_FILE, '>', REFERENCE_SHEET);
  console.log('Customers loaded:', fullRows.length);
  console.log('P1 rows:', output.proposition1.rows.length);
  console.log('P2 rows:', output.proposition2.rows.length);
  console.log('P3 rows:', output.proposition3.rows.length);
}

main();
