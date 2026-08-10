import type { ExtractionStatus } from '@/types/shipment';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: ExtractionStatus }) {
  const variant =
    status === 'success' ? 'success' : status === 'partial' ? 'warning' : 'destructive';
  const label = status === 'success' ? 'Extracted' : status === 'partial' ? 'Partial' : 'Failed';
  return <Badge variant={variant}>{label}</Badge>;
}
