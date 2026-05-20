import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Eager load critical components
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import Layout from '../components/layout/Layout';

// Lazy load feature components
const Dashboard = lazy(() => import('../components/dashboard/Dashboard'));
const Transactions = lazy(() => import('../components/transactions/Transactions'));
const Monitoring = lazy(() => import('../components/monitoring/Monitoring'));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div>Loading...</div>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        } />
        <Route path="transactions" element={
          <Suspense fallback={<PageLoader />}>
            <Transactions />
          </Suspense>
        } />
        <Route path="monitoring" element={
          <Suspense fallback={<PageLoader />}>
            <Monitoring />
          </Suspense>
        } />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
