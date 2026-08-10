import { db } from '@/db/database';
import type { Shipment } from '@/types/shipment';
import { generateId } from '@/utils/date';

export async function getAllShipments(): Promise<Shipment[]> {
  return db.shipments.orderBy('emailReceivedAt').reverse().toArray();
}

export async function getShipmentById(id: string): Promise<Shipment | undefined> {
  return db.shipments.get(id);
}

export async function getShipmentByOutlookId(outlookMessageId: string): Promise<Shipment | undefined> {
  return db.shipments.where('outlookMessageId').equals(outlookMessageId).first();
}

export async function createShipment(
  data: Omit<Shipment, 'id' | 'createdAt'>
): Promise<Shipment> {
  const shipment: Shipment = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await db.shipments.add(shipment);
  return shipment;
}

export async function deleteShipment(id: string): Promise<void> {
  await db.shipments.delete(id);
}

export async function getShipmentCount(): Promise<number> {
  return db.shipments.count();
}

export async function getTodayShipmentCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return db.shipments
    .filter((s) => {
      const created = new Date(s.createdAt);
      return created >= today && created < tomorrow;
    })
    .count();
}

export async function getFailedShipmentCount(): Promise<number> {
  return db.shipments.where('extractionStatus').equals('failed').count();
}
