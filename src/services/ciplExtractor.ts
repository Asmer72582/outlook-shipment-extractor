import { parseDate } from '@/utils/date';
import { normalizeEmailBody } from '@/utils/htmlToText';

/** Primark franchise invoice emails, e.g. "container number DEL00003301" */
const PRIMARK_CONTAINER_PATTERN = /\bcontainer\s+number\s+([A-Z]{3}\d{8})\b/gi;

const CONTAINER_REFERENCE_PATTERNS = [
  PRIMARK_CONTAINER_PATTERN,
  /\bcontainer\s+number\s+([A-Z]{4}\d{7})\b/gi,
  /\bcontainer\s+no\.?\s*:?\s*([A-Z]{3}\d{8})\b/gi,
  /\bcontainer\s+no\.?\s*:?\s*([A-Z]{4}\d{7})\b/gi,
];

export function isPrimarkInvoiceEmail(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('primark') &&
    (lower.includes('commercial invoice') ||
      lower.includes('new invoice from primark') ||
      /\bcontainer\s+number\s+[a-z]{3}\d{8}\b/i.test(text))
  );
}

export function extractContainerReferences(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of CONTAINER_REFERENCE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[1];
      if (value) found.add(normalizeContainerId(value));
    }
  }

  return [...found];
}

export function extractCiplDateReceived(
  text: string,
  emailReceivedAt?: string | null
): string | null {
  const patterns = [
    /CIPL\s*DATE\s*RECEIVED\s*:?\s*(.+?)(?:\r?\n|$)/i,
    /CIPLDATERECEIVED\s*:?\s*(.+?)(?:\r?\n|$)/i,
    /CIPL\s*RECEIVED\s*DATE\s*:?\s*(.+?)(?:\r?\n|$)/i,
    /CI\s*PL\s*DATE\s*RECEIVED\s*:?\s*(.+?)(?:\r?\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = parseDate(match[1].trim());
      if (parsed) return parsed;
      const raw = match[1].trim();
      if (raw) return raw;
    }
  }

  // Primark invoice emails attach the CIPL — use email received date as CIPLDATERECEIVED
  if (isPrimarkInvoiceEmail(text) && emailReceivedAt) {
    return emailReceivedAt.slice(0, 10);
  }

  return null;
}

export function normalizeContainerId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function containerAppearsInText(containerNo: string, text: string): boolean {
  const normalized = normalizeContainerId(containerNo);
  if (!normalized || normalized.length < 4) return false;

  const haystack = normalizeContainerId(text);
  if (haystack.includes(normalized)) return true;

  // Primark container IDs: DEL00003301 (3 letters + 8 digits)
  if (/^[A-Z]{3}\d{8}$/.test(normalized)) {
    return haystack.includes(normalized);
  }

  // ISO container numbers are sometimes written with a space: "MRSU 0440557"
  if (/^[A-Z]{4}\d{7}$/.test(normalized)) {
    const spaced = `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
    if (haystack.includes(normalizeContainerId(spaced))) return true;
  }

  return false;
}

export function extractEmailText(
  body: string,
  contentType?: 'text' | 'html'
): string {
  const isHtml =
    contentType === 'html' || (!contentType && /<[a-z][\s\S]*>/i.test(body));
  return normalizeEmailBody(body, isHtml ? 'html' : 'text');
}

/** Combined subject + body text used to locate container / HAWB references. */
export function buildMessageSearchText(
  subject: string | undefined,
  body: string | undefined,
  contentType?: 'text' | 'html'
): string {
  const bodyText = body ? extractEmailText(body, contentType) : '';
  const parts = [subject?.trim(), bodyText].filter(Boolean);
  return parts.join('\n');
}
