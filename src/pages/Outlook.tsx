import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Mail, CheckCircle, RefreshCw, Unplug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useToast } from '@/hooks/use-toast';
import { testConnection } from '@/services/graphService';
import { readSyncState } from '@/db/repositories/syncStateRepository';
import { formatDateTime } from '@/utils/date';
import { SyncDialog } from '@/components/outlook/SyncDialog';

export function OutlookPage() {
  const { account, isAuthenticated, login, logout, getAccessToken } = useAuth();
  const { sync, isSyncing, currentStep, result, error, clearResult } = useSync();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  const syncState = useLiveQuery(() => readSyncState(), []);

  const handleTest = async () => {
    setTesting(true);
    try {
      const token = await getAccessToken();
      const user = await testConnection(token);
      toast({
        title: 'Connection successful',
        description: `Connected as ${user.mail || user.userPrincipalName}`,
      });
    } catch (err) {
      toast({
        title: 'Unable to connect to Outlook',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setShowSyncDialog(true);
    try {
      const syncResult = await sync();
      if (syncResult) {
        toast({
          title: `${syncResult.newShipments} new shipment${syncResult.newShipments !== 1 ? 's' : ''} imported.`,
        });
      }
    } catch (err) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Outlook? Your shipment records will be kept.')) return;
    await logout();
    toast({ title: 'Outlook disconnected' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Outlook Connection
          </CardTitle>
          <CardDescription>Manage your Microsoft Outlook connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAuthenticated && account ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="font-medium">Connected</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Connected account: </span>
                  <span className="font-medium">{account.username}</span>
                </div>
                {syncState?.lastSyncAt && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last sync: </span>
                    <span className="font-medium">{formatDateTime(syncState.lastSyncAt)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Emails
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  <Unplug className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">
                Connect your Outlook mailbox to begin extracting shipments.
              </p>
              <Button onClick={() => login()}>Connect Outlook</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SyncDialog
        open={showSyncDialog && (isSyncing || !!result || !!error)}
        isSyncing={isSyncing}
        currentStep={currentStep}
        result={result}
        error={error}
        onClose={() => {
          setShowSyncDialog(false);
          clearResult();
        }}
      />
    </div>
  );
}
