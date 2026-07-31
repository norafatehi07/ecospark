// src/components/common/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}
