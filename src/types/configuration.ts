export interface ShipmentConfiguration {
  id: number;
  senderEmails: string[];
  senderName: string;
  subjectContains: string;
  shipmentFromLabel: string;
  shipmentDateLabel: string;
  enableInboxViewer: boolean;
  updatedAt: string;
  /** @deprecated migrated to senderEmails */
  senderEmail?: string;
}

export const DEFAULT_CONFIGURATION: Omit<ShipmentConfiguration, 'id' | 'updatedAt'> = {
  senderEmails: ['FranchiseInvoices@primark.com'],
  senderName: 'Primark Franchise',
  subjectContains: '',
  shipmentFromLabel: 'Shipment From:',
  shipmentDateLabel: 'Shipment Date:',
  enableInboxViewer: true,
};

export type ShipmentConfigInput = Omit<ShipmentConfiguration, 'id' | 'updatedAt' | 'senderEmail'>;
