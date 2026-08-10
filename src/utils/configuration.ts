import type { ShipmentConfiguration } from '@/types/configuration';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSenderEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }

  return result;
}

export function getSenderEmails(
  config: Pick<ShipmentConfiguration, 'senderEmails' | 'senderEmail'>
): string[] {
  if (config.senderEmails?.length) {
    return normalizeSenderEmails(config.senderEmails);
  }
  if (config.senderEmail?.trim()) {
    return [config.senderEmail.trim().toLowerCase()];
  }
  return [];
}

export function isValidSenderEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function migrateConfiguration(
  raw: Partial<ShipmentConfiguration> & { senderEmail?: string }
): ShipmentConfiguration {
  const senderEmails =
    raw.senderEmails?.length
      ? normalizeSenderEmails(raw.senderEmails)
      : raw.senderEmail?.trim()
        ? [raw.senderEmail.trim().toLowerCase()]
        : ['shipment@example.com'];

  return {
    id: raw.id ?? 1,
    senderEmails,
    senderName: raw.senderName ?? 'ABC Logistics',
    subjectContains: raw.subjectContains ?? 'Shipment',
    shipmentFromLabel: raw.shipmentFromLabel ?? 'Shipment From:',
    shipmentDateLabel: raw.shipmentDateLabel ?? 'Shipment Date:',
    enableInboxViewer: raw.enableInboxViewer ?? true,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}
