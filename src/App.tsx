import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIsAuthenticated } from '@azure/msal-react';
import { AuthProvider } from '@/auth/AuthProvider';
import { ToastContextProvider } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { ShipmentsPage } from '@/pages/Shipments';
import { OutlookPage } from '@/pages/Outlook';
import { InboxPage } from '@/pages/Inbox';
import { CheckShipmentPage } from '@/pages/CheckShipment';
import { SettingsPage } from '@/pages/Settings';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/outlook" element={<OutlookPage />} />
        <Route path="/check-shipment" element={<CheckShipmentPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastContextProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
