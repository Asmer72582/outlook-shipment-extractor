import type { ContainerCheckResult } from '@/types/checkShipment';
import { formatDate, formatDateTime } from '@/utils/date';

const HEADERS = [
  'Container No / HAWB',
  'Invoice Number',
  'CIPL Date (Excel)',
  'CIPL Date (Email)',
  'Email Received',
  'Email Subject',
  'Email Sender',
  'Status',
];

export function containerResultsToCsv(results: ContainerCheckResult[]): string {
  const rows = results.map((r) => [
    `${r.containerNo}${r.hawb && r.hawb !== r.containerNo ? ' / ' + r.hawb : ''}`,
    r.invoiceNumber || '',
    r.excelCiplDateReceived
      ? formatDate(r.excelCiplDateReceived)
      : r.excelDocReceivedDate
        ? formatDate(r.excelDocReceivedDate)
        : '',
    r.status === 'found' && r.ciplDateReceived ? formatDate(r.ciplDateReceived) : '',
    r.emailReceivedAt ? formatDateTime(r.emailReceivedAt) : '',
    r.emailSubject || '',
    r.emailSender || '',
    r.status === 'found'
      ? 'Found'
      : r.status === 'already_in_excel'
        ? 'Already in Excel'
        : 'Not Found',
  ]);

  return [HEADERS, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadContainerResultsCsv(
  results: ContainerCheckResult[],
  filename = 'container-cipl-check.csv'
): void {
  const csv = containerResultsToCsv(results);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
