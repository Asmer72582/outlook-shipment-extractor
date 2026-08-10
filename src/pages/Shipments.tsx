import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { ShipmentDetailDialog } from '@/components/shipments/ShipmentDetailDialog';
import { useShipments } from '@/hooks/useShipments';
import { useToast } from '@/hooks/use-toast';
import { downloadCsv } from '@/utils/csv';
import { formatDate, formatDateTime, formatShipmentId } from '@/utils/date';
import type { Shipment } from '@/types/shipment';

const PAGE_SIZE = 20;

export function ShipmentsPage() {
  const [searchParams] = useSearchParams();
  const { shipments, deleteShipment } = useShipments();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'emailReceivedAt' | 'shipmentDate' | 'shipmentFrom'>('emailReceivedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Shipment | null>(null);

  const statusFilter = searchParams.get('status') || '';

  const filtered = useMemo(() => {
    let result = [...shipments];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.shipmentFrom?.toLowerCase().includes(q) ||
          s.emailSubject.toLowerCase().includes(q) ||
          s.emailSender.toLowerCase().includes(q)
      );
    }

    if (origin) {
      result = result.filter((s) => s.shipmentFrom?.toLowerCase().includes(origin.toLowerCase()));
    }

    if (dateFrom) {
      result = result.filter((s) => s.shipmentDate && s.shipmentDate >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((s) => s.shipmentDate && s.shipmentDate <= dateTo);
    }

    if (statusFilter) {
      result = result.filter((s) => s.extractionStatus === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [shipments, search, origin, dateFrom, dateTo, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipment?')) return;
    await deleteShipment(id);
    toast({ title: 'Shipment deleted.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{filtered.length} shipment record{filtered.length !== 1 ? 's' : ''}</p>
        <Button variant="outline" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search shipments..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-auto" />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-auto" />
            <Input placeholder="Filter by origin" value={origin} onChange={(e) => { setOrigin(e.target.value); setPage(1); }} className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No shipment records yet.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('shipmentFrom')}>
                      Shipment From {sortBy === 'shipmentFrom' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('shipmentDate')}>
                      Shipment Date {sortBy === 'shipmentDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Email Sender</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('emailReceivedAt')}>
                      Email Received {sortBy === 'emailReceivedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono text-sm">{formatShipmentId(shipment.id)}</TableCell>
                      <TableCell>{shipment.shipmentFrom || '—'}</TableCell>
                      <TableCell>{formatDate(shipment.shipmentDate)}</TableCell>
                      <TableCell className="text-sm">{shipment.emailSender}</TableCell>
                      <TableCell>{formatDateTime(shipment.emailReceivedAt)}</TableCell>
                      <TableCell><StatusBadge status={shipment.extractionStatus} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelected(shipment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(shipment.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selected && <ShipmentDetailDialog shipment={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
