import * as XLSX from 'xlsx';
import type { ExcelContainerRow } from '@/types/checkShipment';

export interface SheetInfo {
  name: string;
  rowCount: number;
  containerCount: number;
}

export interface ParseResult {
  rows: ExcelContainerRow[];
  sheetName: string;
  availableSheets: SheetInfo[];
}

const PREFERRED_SHEETS = ['PRM DATA', 'DATA', 'Original Invoice Recieved', 'PORTAL DATA'];

const CONTAINER_COLUMN_PATTERNS = [
  /^container\s*no\s*\/?\s*hawb$/i,
  /^containerno\/?hawb$/i,
  /^container\s*no\s*\/\s*hawb$/i,
  /^container\s*number$/i,
  /^container\s*no\.?$/i,
  /^container$/i,
];

const HAWB_COLUMN_PATTERNS = [/^hbl\/?hawb$/i, /^mbl\/?mawb$/i, /^hawb$/i];

const CIPL_COLUMN_PATTERNS = [/^cipldatereceived$/i, /^cipl\s*date\s*received$/i];

const DOC_RECEIVED_PATTERNS = [
  /^doc\s*received\s*date$/i,
  /^pre-?alert\/?invoice\s*received\s*date$/i,
  /^original\s*received\s*date$/i,
];

const INVOICE_PATTERNS = [/^invoice\s*number$/i, /^shipment\s*inv\s*number$/i];

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ');
}

function headerMatches(header: string, patterns: RegExp[]): boolean {
  const normalized = normalizeHeader(header);
  const compact = normalized.replace(/\s/g, '');
  return patterns.some((p) => p.test(normalized) || p.test(compact));
}

function findColumn(headers: string[], patterns: RegExp[]): string | undefined {
  return headers.find((h) => headerMatches(h, patterns));
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Avoid scientific notation for large numeric container / HAWB values from Excel
    if (Number.isInteger(value)) return String(Math.trunc(value));
    return String(value);
  }
  return String(value).trim();
}

function excelSerialToIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && value > 30000 && value < 60000) {
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const str = cellToString(value);
  if (!str) return null;

  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return str;
}

function isEmptyDate(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'number' && value === 0) return true;
  return false;
}

function analyzeSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): { rows: Record<string, unknown>[]; containerCol?: string; containerCount: number } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], containerCount: 0 };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rows.length === 0) return { rows: [], containerCount: 0 };

  const headers = Object.keys(rows[0]);
  const containerCol = findColumn(headers, CONTAINER_COLUMN_PATTERNS);
  const hawbCol = findColumn(headers, HAWB_COLUMN_PATTERNS);

  const containerCount = rows.filter((row) => {
    const container = containerCol ? cellToString(row[containerCol]) : '';
    const hawb = hawbCol && hawbCol !== containerCol ? cellToString(row[hawbCol]) : '';
    return Boolean(container || hawb);
  }).length;

  return { rows, containerCol, containerCount };
}

function listAvailableSheets(workbook: XLSX.WorkBook): SheetInfo[] {
  return workbook.SheetNames.map((name) => {
    const { rows, containerCount } = analyzeSheet(workbook, name);
    return { name, rowCount: rows.length, containerCount };
  }).filter((s) => s.containerCount > 0);
}

function pickDefaultSheet(available: SheetInfo[]): string {
  for (const preferred of PREFERRED_SHEETS) {
    const match = available.find((s) => s.name === preferred);
    if (match) return match.name;
  }
  return available.sort((a, b) => b.containerCount - a.containerCount)[0]?.name ?? '';
}

function parseSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string
): ExcelContainerRow[] {
  const { rows } = analyzeSheet(workbook, sheetName);
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const containerCol = findColumn(headers, CONTAINER_COLUMN_PATTERNS);
  const hawbCol = findColumn(headers, HAWB_COLUMN_PATTERNS);
  const ciplCol = findColumn(headers, CIPL_COLUMN_PATTERNS);
  const docReceivedCol = findColumn(headers, DOC_RECEIVED_PATTERNS);
  const invoiceCol = findColumn(headers, INVOICE_PATTERNS);

  const result: ExcelContainerRow[] = [];

  rows.forEach((row, index) => {
    const containerNo = containerCol ? cellToString(row[containerCol]) : '';
    const hawb =
      hawbCol && hawbCol !== containerCol ? cellToString(row[hawbCol]) : '';
    const primaryId = containerNo || hawb;

    if (!primaryId) return;

    const rawCiplDate = ciplCol ? row[ciplCol] : null;
    const rawDocDate = docReceivedCol ? row[docReceivedCol] : null;

    const ciplFromExcel = isEmptyDate(rawCiplDate) ? null : excelSerialToIso(rawCiplDate);
    const docFromExcel = isEmptyDate(rawDocDate) ? null : excelSerialToIso(rawDocDate);

    // Missing CIPL is determined ONLY by CIPLDATERECEIVED column (not pre-alert dates)
    const needsLookup = ciplCol ? isEmptyDate(rawCiplDate) : !ciplFromExcel && !docFromExcel;

    result.push({
      rowIndex: index + 2,
      containerNo: primaryId,
      hawb: hawb && hawb !== primaryId ? hawb : null,
      invoiceNumber: invoiceCol ? cellToString(row[invoiceCol]) || null : null,
      excelDocReceivedDate: ciplFromExcel,
      excelCiplDateReceived: ciplFromExcel,
      needsLookup,
    });
  });

  return result;
}

export function parseContainerExcel(
  buffer: ArrayBuffer,
  preferredSheet?: string
): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const availableSheets = listAvailableSheets(workbook);

  if (availableSheets.length === 0) {
    return { rows: [], sheetName: '', availableSheets: [] };
  }

  let sheetName = preferredSheet;
  if (!sheetName || !availableSheets.some((s) => s.name === sheetName)) {
    sheetName = pickDefaultSheet(availableSheets);
  }

  const rows = parseSheetRows(workbook, sheetName);

  return { rows, sheetName, availableSheets };
}

export function getParseSummary(rows: ExcelContainerRow[]) {
  return {
    total: rows.length,
    missingDocDate: rows.filter((r) => r.needsLookup).length,
    hasDocDate: rows.filter((r) => !r.needsLookup).length,
    uniqueContainers: new Set(rows.map((r) => r.containerNo.toUpperCase())).size,
  };
}
