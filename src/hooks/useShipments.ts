import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import {
  getAllShipments,
  deleteShipment as deleteShipmentRepo,
} from '@/db/repositories/shipmentRepository';

export function useShipments() {
  const shipments = useLiveQuery(() => getAllShipments(), [], []);

  const deleteShipment = async (id: string) => {
    await deleteShipmentRepo(id);
  };

  return {
    shipments: shipments ?? [],
    isLoading: shipments === undefined,
    deleteShipment,
  };
}

export function useShipmentStats() {
  const total = useLiveQuery(() => db.shipments.count(), [], 0);
  const today = useLiveQuery(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return db.shipments
      .filter((s) => new Date(s.createdAt) >= start)
      .count();
  }, [], 0);
  const failed = useLiveQuery(
    () => db.shipments.where('extractionStatus').equals('failed').count(),
    [],
    0
  );

  return { total: total ?? 0, today: today ?? 0, failed: failed ?? 0 };
}
