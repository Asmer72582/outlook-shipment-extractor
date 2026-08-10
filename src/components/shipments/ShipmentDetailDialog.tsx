import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Shipment } from '@/types/shipment';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { formatDate, formatDateTime, formatShipmentId } from '@/utils/date';

interface ShipmentDetailDialogProps {
  shipment: Shipment;
  onClose: () => void;
}

export function ShipmentDetailDialog({ shipment, onClose }: ShipmentDetailDialogProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">{formatShipmentId(shipment.id)}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Shipment From</dt>
              <dd className="font-medium text-right">{shipment.shipmentFrom || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Shipment Date</dt>
              <dd className="font-medium">{formatDate(shipment.shipmentDate)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email Sender</dt>
              <dd className="font-medium text-right">{shipment.emailSender}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email Received</dt>
              <dd className="font-medium">{formatDateTime(shipment.emailReceivedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email Subject</dt>
              <dd className="font-medium text-right max-w-[60%]">{shipment.emailSubject}</dd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <dt className="text-muted-foreground">Extraction Status</dt>
              <dd><StatusBadge status={shipment.extractionStatus} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Extraction Confidence</dt>
              <dd className="font-medium">{Math.round(shipment.extractionConfidence * 100)}%</dd>
            </div>
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
