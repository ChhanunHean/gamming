import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ managerOnly = false }) {
  const { staff, loading, isManager } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!staff) {
    return <Navigate to="/login" replace />;
  }

  if (managerOnly && !isManager) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
