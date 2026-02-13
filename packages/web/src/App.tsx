import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';

const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CustomersPage = lazy(() => import('@/pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const EntriesPage = lazy(() => import('@/pages/EntriesPage').then(m => ({ default: m.EntriesPage })));
const ChargesPage = lazy(() => import('@/pages/ChargesPage').then(m => ({ default: m.ChargesPage })));
const ImportPage = lazy(() => import('@/pages/ImportPage').then(m => ({ default: m.ImportPage })));
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const NewInvoicePage = lazy(() => import('@/pages/NewInvoicePage').then(m => ({ default: m.NewInvoicePage })));
const InvoiceDetailPage = lazy(() => import('@/pages/InvoiceDetailPage').then(m => ({ default: m.InvoiceDetailPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const PageLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-pulse text-gray-500">Loading...</div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="entries" element={<EntriesPage />} />
              <Route path="charges" element={<ChargesPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<NewInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
