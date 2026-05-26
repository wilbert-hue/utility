const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_FILE =
  'Sample Framework_Customer Database_U.K. Composite Utility Transmission Pole Market.xlsx';
const OUTPUT_FILE = path.join(__dirname, 'public', 'data', 'customer-intelligence.json');

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

function parseSheet(wb, sheetName, extraColsAfterBase = []) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const titleLines = extractTitleLines(rows);
  const header = findCompanyNameColumn(rows);

  if (!header) {
    throw new Error(`Could not find header row in sheet "${sheetName}"`);
  }

  const { headerRowIdx, companyColIdx } = header;
  const sNoColIdx = companyColIdx - 1;
  const allCols = [...PROP1_COLS, ...extraColsAfterBase];
  const dataRows = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const sNo = row[sNoColIdx];
    const company = row[companyColIdx];
    if (!sNo && !company) continue;
    if (String(company).trim() === 'Customer / Company Name') continue;

    const record = { sNo: normalizeCell(sNo) };
    allCols.forEach((key, idx) => {
      record[key] = normalizeCell(row[companyColIdx + idx] ?? '');
    });
    dataRows.push(record);
  }

  return { titleLines, rows: dataRows };
}

function main() {
  const wb = XLSX.readFile(EXCEL_FILE);

  const output = {
    marketTitle: 'U.K. Composite Utility Transmission Pole Market - Customer Database',
    subtitle: 'Verified directory and insight on customers',
    entityNote:
      '(Entity Across Transmission System Operators and Transmission Utilities, Distribution Network Operators, EPC and Grid Infrastructure Contractors, Industrial Power Network Owners, Government and Public Transmission Agencies)',
    proposition1: {
      id: 'proposition-1',
      label: 'Proposition 1 - Basic',
      ...parseSheet(wb, 'Proposition 1 - Basic'),
    },
    proposition2: {
      id: 'proposition-2',
      label: 'Proposition 2 - Advance',
      ...parseSheet(wb, 'Proposition 2 - Advance', PROP2_EXTRA),
    },
    proposition3: {
      id: 'proposition-3',
      label: 'Proposition 3 - Premium',
      ...parseSheet(wb, 'Proposition 3 - Premium', [...PROP2_EXTRA, ...PROP3_EXTRA]),
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log('Written', OUTPUT_FILE);
  console.log('P1 rows:', output.proposition1.rows.length);
  console.log('P2 rows:', output.proposition2.rows.length);
  console.log('P3 rows:', output.proposition3.rows.length);
}

main();
