import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { useAuth } from './context/AuthContext';

import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Batches } from './pages/Batches';
import { Students } from './pages/Students';
import { StudentProfile } from './pages/StudentProfile';
import { Teachers } from './pages/Teachers';
import { Attendance } from './pages/Attendance';
import { Analytics } from './pages/Analytics';
import { AdminResetPassword } from './pages/AdminResetPassword';
import { AdminSettings } from './pages/AdminSettings';
import { VerifyOTP } from './pages/VerifyOTP';
import { AdminRegister } from './pages/AdminRegister';
import { AdminLogin } from './pages/AdminLogin';
import { Notices } from './pages/Notices';

const LAST_ROUTE_KEY = 'technoskill_last_route';

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function RoutePersistence() {
  const location = useLocation();

  React.useEffect(() => {
    if (!['/login', '/admin/login', '/admin/register'].includes(location.pathname)) {
      localStorage.setItem(LAST_ROUTE_KEY, `${location.pathname}${location.search}`);
    }
  }, [location.pathname, location.search]);

  return null;
}

function ProtectedRoute({ allowedRole }: { allowedRole: 'admin' | 'teacher' }) {
  const { isAuthenticated, isLoading, appUser } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated || !appUser) {
    return <Navigate to="/login" replace />;
  }

  if (appUser.role !== allowedRole) {
    return <Navigate to={appUser.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
  }

  return <Outlet />;
}

function AuthenticatedRoute() {
  const { isAuthenticated, isLoading, appUser } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated || !appUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PendingOtpRoute() {
  const { isLoading, pendingAdminOtp, appUser } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (appUser?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!pendingAdminOtp) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function DefaultHomeRedirect() {
  const { isLoading, appUser } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
  if (lastRoute && lastRoute !== '/login' && lastRoute !== '/') {
    return <Navigate to={lastRoute} replace />;
  }

  return <Navigate to={appUser.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <RoutePersistence />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<PendingOtpRoute />}>
              <Route path="/verify-otp" element={<VerifyOTP />} />
            </Route>
            <Route path="/" element={<DefaultHomeRedirect />} />
            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/batches" element={<Batches />} />
                <Route path="/students" element={<Students />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/students/:id" element={<StudentProfile />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>
            </Route>
            <Route element={<AuthenticatedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/notice" element={<Notices />} />
                <Route path="/notices" element={<Notices />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute allowedRole="teacher" />}>
              <Route element={<AppLayout />}>
                <Route path="/teacher" element={<Attendance />} />
              </Route>
            </Route>
            <Route path="*" element={<DefaultHomeRedirect />} />
          </Routes>
        </Router>
        <Toaster position="top-right" richColors />
      </DataProvider>
    </AuthProvider>
  );
}
