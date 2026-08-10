import type { Shipment } from '@/types/shipment';
import { formatShipmentId } from '@/utils/date';

const HEADERS = [
  'Shipment ID',
  'Shipment From',
  'Shipment Date',
  'Email Sender',
  'Email Received',
  'Email Subject',
  'Extraction Status',
];

export function shipmentsToCsv(shipments: Shipment[]): string {
  const rows = shipments.map((s) => [
    formatShipmentId(s.id),
    s.shipmentFrom || '',
    s.shipmentDate || '',
    s.emailSender,
    s.emailReceivedAt,
    s.emailSubject,
    s.extractionStatus,
  ]);

  return [HEADERS, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadCsv(shipments: Shipment[], filename = 'shipments.csv'): void {
  const csv = shipmentsToCsv(shipments);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
