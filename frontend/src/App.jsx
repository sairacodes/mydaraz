import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import StoresPage from './pages/StoresPage';
import StorePage from './pages/StorePage';
import ProductPage from './pages/ProductPage';
import SearchPage from './pages/SearchPage';

// Seller pages
import {
  SellerDashboard,
  SellerOnboard,
  SellerProducts,
  ProductForm,
  SellerOrders,
} from './pages/SellerPages';

// Admin pages
import {
  AdminDashboard,
  AdminTenants,
  AdminCollections,
  CustomerOrders,
} from './pages/AdminPages';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Navbar />
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/stores/:tenantSlug" element={<StorePage />} />
            <Route path="/stores/:tenantSlug/products/:productId" element={<ProductPage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Seller routes */}
            <Route path="/seller" element={
              <ProtectedRoute roles={['tenant_admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/onboard" element={
              <ProtectedRoute roles={['tenant_admin']}>
                <SellerOnboard />
              </ProtectedRoute>
            } />
            <Route path="/seller/products" element={
              <ProtectedRoute roles={['tenant_admin']}>
                <SellerProducts />
              </ProtectedRoute>
            } />
            <Route path="/seller/products/new" element={
              <ProtectedRoute roles={['tenant_admin']}>
                <ProductForm />
              </ProtectedRoute>
            } />
            <Route path="/seller/orders" element={
              <ProtectedRoute roles={['tenant_admin']}>
                <SellerOrders />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['superadmin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/tenants" element={
              <ProtectedRoute roles={['superadmin']}>
                <AdminTenants />
              </ProtectedRoute>
            } />
            <Route path="/admin/collections" element={
              <ProtectedRoute roles={['superadmin']}>
                <AdminCollections />
              </ProtectedRoute>
            } />

            {/* Customer routes */}
            <Route path="/account/orders" element={
              <ProtectedRoute roles={['customer']}>
                <CustomerOrders />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
