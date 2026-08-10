import * as Dialog from '@radix-ui/react-dialog';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SyncResult } from '@/types/outlook';
import type { SyncStep } from '@/services/syncService';

const STEPS: { key: SyncStep; label: string }[] = [
  { key: 'connecting', label: 'Connected to Microsoft' },
  { key: 'searching', label: 'Searching shipment emails' },
  { key: 'processing', label: 'Processing messages' },
  { key: 'extracting', label: 'Extracting shipment information' },
  { key: 'duplicates', label: 'Checking duplicates' },
  { key: 'saving', label: 'Saving shipment records' },
];

const STEP_INDEX: Record<SyncStep, number> = {
  connecting: 0,
  searching: 1,
  processing: 2,
  extracting: 3,
  duplicates: 4,
  saving: 5,
  done: 6,
};

interface SyncDialogProps {
  open: boolean;
  isSyncing: boolean;
  currentStep: SyncStep | null;
  result: SyncResult | null;
  error: string | null;
  onClose: () => void;
}

export function SyncDialog({ open, isSyncing, currentStep, result, error, onClose }: SyncDialogProps) {
  const currentIndex = currentStep ? STEP_INDEX[currentStep] : -1;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && !isSyncing && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {isSyncing ? 'Syncing Outlook...' : error ? 'Sync Failed' : 'Sync completed'}
            </Dialog.Title>
            {!isSyncing && (
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="space-y-2">
              {STEPS.map((step, index) => {
                const done = currentIndex > index || (!isSyncing && result);
                const active = currentIndex === index && isSyncing;
                return (
                  <div key={step.key} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        done ? 'bg-green-100 text-green-700' : active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : '·'}
                    </span>
                    <span className={done || active ? 'text-foreground' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {result && !isSyncing && !error && (
            <div className="mt-4 pt-4 border-t text-sm space-y-1">
              <p>Emails checked: {result.emailsChecked}</p>
              <p>New shipments: {result.newShipments}</p>
              <p>Already imported: {result.duplicates}</p>
              <p>Failed: {result.failedExtractions}</p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
