import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import './styles/global.css';

// Lazy loading feature components for faster initial/login load
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Transactions = lazy(() => import('./components/transactions/Transactions'));
const Analytics = lazy(() => import('./components/analytics/Analytics'));
const Categories = lazy(() => import('./components/categories/Categories'));
const Subscription = lazy(() => import('./components/subscription/Subscription'));
const DemoSubscriptionThanks = lazy(() => import('./components/subscription/DemoSubscriptionThanks'));
const Profile = lazy(() => import('./components/profile/Profile'));
const Monitoring = lazy(() => import('./components/monitoring/Monitoring'));
const UserAccess = lazy(() => import('./components/admin/UserAccess'));

// Loading fallback
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div>Loading...</div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return isAdmin ? children : <Navigate to="/dashboard" />;
};

const PageRoute = ({ page, children }) => {
  const { canAccessPage, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return canAccessPage(page) ? children : <Navigate to="/dashboard" />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/subscription-demo" element={<DemoSubscriptionThanks />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<PageRoute page="dashboard"><Dashboard /></PageRoute>} />
                <Route path="transactions" element={<PageRoute page="transactions"><Transactions /></PageRoute>} />
                <Route path="analytics" element={<PageRoute page="analytics"><Analytics /></PageRoute>} />
                <Route path="categories" element={<PageRoute page="categories"><Categories /></PageRoute>} />
                <Route path="subscription" element={<PageRoute page="subscription"><Subscription /></PageRoute>} />
                <Route path="profile" element={<PageRoute page="profile"><Profile /></PageRoute>} />
                <Route path="monitoring" element={
                  <AdminRoute>
                    <Monitoring />
                  </AdminRoute>
                } />
                <Route path="access" element={
                  <AdminRoute>
                    <UserAccess />
                  </AdminRoute>
                } />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
