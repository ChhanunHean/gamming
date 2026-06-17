import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PortalLayout from './components/PortalLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TwoFactorPage from './pages/TwoFactorPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import StationsPage from './pages/StationsPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function LoginRedirect({ children }) {
  const { staff, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (staff) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect><LoginPage /></LoginRedirect>} />
      <Route path="/verify-2fa" element={<LoginRedirect><TwoFactorPage /></LoginRedirect>} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PortalLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="stations" element={<StationsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute managerOnly />}>
        <Route element={<PortalLayout />}>
          <Route path="staff" element={<StaffPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
