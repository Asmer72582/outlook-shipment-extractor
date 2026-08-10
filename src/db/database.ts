import Dexie, { type Table } from 'dexie';
import type { Shipment } from '@/types/shipment';
import type { ShipmentConfiguration } from '@/types/configuration';
import type { SyncState } from '@/types/outlook';

export class ShipmentMailExtractorDB extends Dexie {
  shipments!: Table<Shipment, string>;
  configuration!: Table<ShipmentConfiguration, number>;
  syncState!: Table<SyncState, number>;

  constructor() {
    super('ShipmentMailExtractorDB');

    this.version(1).stores({
      shipments: 'id, &outlookMessageId, shipmentDate, shipmentFrom, emailReceivedAt, createdAt, extractionStatus',
      configuration: 'id',
      syncState: 'id',
    });
  }
}

export const db = new ShipmentMailExtractorDB();
