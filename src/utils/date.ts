import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDate(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, ' ');

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return toIsoDate(+isoMatch[1], +isoMatch[2], +isoMatch[3]);
  }

  const dmySlash = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmySlash) {
    return toIsoDate(+dmySlash[3], +dmySlash[2], +dmySlash[1]);
  }

  const namedMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (namedMatch) {
    const month = MONTHS[namedMatch[2].toLowerCase()];
    if (month) return toIsoDate(+namedMatch[3], month, +namedMatch[1]);
  }

  const namedMatch2 = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMatch2) {
    const month = MONTHS[namedMatch2[1].toLowerCase()];
    if (month) return toIsoDate(+namedMatch2[3], month, +namedMatch2[2]);
  }

  return null;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date.includes('T') ? date : `${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShipmentId(id: string): string {
  return `SH-${id.slice(-6).toUpperCase()}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}
