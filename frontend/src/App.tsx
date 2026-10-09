import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductEditorPage } from './pages/products/ProductEditorPage';
import { ConversationsPage } from './pages/conversations/ConversationsPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { InstagramPage } from './pages/instagram/InstagramPage';
import { AISettingsPage } from './pages/settings/AISettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardOverviewPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<ProductEditorPage />} />
                <Route path="/products/:id/edit" element={<ProductEditorPage />} />
                <Route path="/conversations" element={<ConversationsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/instagram" element={<InstagramPage />} />
                <Route path="/settings/ai" element={<AISettingsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
