import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Package, Calendar, Clock, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shipments/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useShipmentStats, useShipments } from '@/hooks/useShipments';
import { readSyncState } from '@/db/repositories/syncStateRepository';
import { formatDate, formatDateTime, formatShipmentId } from '@/utils/date';

export function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const { total, today, failed } = useShipmentStats();
  const { shipments } = useShipments();
  const syncState = useLiveQuery(() => readSyncState(), []);

  const recentShipments = shipments.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Shipments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{today}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {syncState?.lastSyncAt ? formatDateTime(syncState.lastSyncAt) : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outlook</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-lg font-semibold">{isAuthenticated ? 'Connected' : 'Disconnected'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {failed > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">
                {failed} email{failed !== 1 ? 's' : ''} need attention.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/shipments?status=failed">View Failed</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentShipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No shipment records yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Shipment From</TableHead>
                  <TableHead>Shipment Date</TableHead>
                  <TableHead>Email Received</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-mono text-sm">{formatShipmentId(shipment.id)}</TableCell>
                    <TableCell>{shipment.shipmentFrom || '—'}</TableCell>
                    <TableCell>{formatDate(shipment.shipmentDate)}</TableCell>
                    <TableCell>{formatDateTime(shipment.emailReceivedAt)}</TableCell>
                    <TableCell><StatusBadge status={shipment.extractionStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
