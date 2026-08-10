import { parseDate } from '@/utils/date';
import type { ShipmentConfiguration } from '@/types/configuration';
import type { ExtractionResult } from '@/types/shipment';
import { normalizeEmailBody } from '@/utils/htmlToText';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractField(body: string, label: string): string | null {
  const escapedLabel = escapeRegex(label.replace(/:$/, '').trim());
  const pattern = new RegExp(`${escapedLabel}\\s*:?\\s*(.+?)(?:\\n|$)`, 'i');
  const match = body.match(pattern);
  return match ? match[1].trim() : null;
}

export function extractShipmentDetails(
  emailBody: string,
  contentType: 'text' | 'html',
  configuration: Pick<ShipmentConfiguration, 'shipmentFromLabel' | 'shipmentDateLabel'>
): ExtractionResult {
  const text = normalizeEmailBody(emailBody, contentType);

  const fromRaw = extractField(text, configuration.shipmentFromLabel);
  const dateRaw = extractField(text, configuration.shipmentDateLabel);

  const shipmentFrom = fromRaw || null;
  const shipmentDate = dateRaw ? parseDate(dateRaw) : null;

  let confidence = 0;
  if (shipmentFrom) confidence += 0.5;
  if (shipmentDate) confidence += 0.5;

  let status: ExtractionResult['status'];
  if (shipmentFrom && shipmentDate) {
    status = 'success';
  } else if (shipmentFrom || shipmentDate) {
    status = 'partial';
  } else {
    status = 'failed';
  }

  return { shipmentFrom, shipmentDate, confidence, status };
}
