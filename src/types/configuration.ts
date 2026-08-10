export interface ShipmentConfiguration {
  id: number;
  senderEmail: string;
  senderName: string;
  subjectContains: string;
  shipmentFromLabel: string;
  shipmentDateLabel: string;
  updatedAt: string;
}

export const DEFAULT_CONFIGURATION: Omit<ShipmentConfiguration, 'id' | 'updatedAt'> = {
  senderEmail: 'shipment@example.com',
  senderName: 'ABC Logistics',
  subjectContains: 'Shipment',
  shipmentFromLabel: 'Shipment From:',
  shipmentDateLabel: 'Shipment Date:',
};
