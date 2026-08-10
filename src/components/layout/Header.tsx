import { RefreshCw, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useToast } from '@/hooks/use-toast';
import { SyncDialog } from '@/components/outlook/SyncDialog';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Shipment Dashboard',
  '/shipments': 'Shipments',
  '/outlook': 'Outlook',
  '/check-shipment': 'Check Shipment',
  '/inbox': 'Outlook Inbox',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const { account, isAuthenticated, logout } = useAuth();
  const { sync, isSyncing, currentStep, result, error, clearResult } = useSync();
  const { toast } = useToast();

  const title = PAGE_TITLES[location.pathname] || 'Shipment Mail Extractor';

  const handleSync = async () => {
    if (!isAuthenticated) {
      toast({ title: 'Connect Outlook first', variant: 'destructive' });
      return;
    }
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast({ title: 'Sign out failed', variant: 'destructive' });
    }
  };

  return (
    <>
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <Button onClick={handleSync} disabled={isSyncing} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Outlook
            </Button>
          )}
          {isAuthenticated && account && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                {account.name?.charAt(0) || '?'}
              </div>
              <span className="hidden sm:inline text-muted-foreground">{account.username}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      <SyncDialog
        open={isSyncing || !!result || !!error}
        isSyncing={isSyncing}
        currentStep={currentStep}
        result={result}
        error={error}
        onClose={() => {
          clearResult();
        }}
      />
    </>
  );
}
