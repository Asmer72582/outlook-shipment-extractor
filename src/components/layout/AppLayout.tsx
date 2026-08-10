import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Mail, Settings, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Header } from './Header';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/shipments', label: 'Shipments', icon: Package },
  { to: '/outlook', label: 'Outlook', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { account, isAuthenticated } = useAuth();

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-sm leading-tight">Shipment Mail</h1>
              <p className="text-xs text-muted-foreground">Extractor</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {isAuthenticated && account && (
          <div className="p-4 border-t text-xs text-muted-foreground">
            <p className="font-medium text-foreground truncate">{account.name}</p>
            <p className="truncate">{account.username}</p>
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
