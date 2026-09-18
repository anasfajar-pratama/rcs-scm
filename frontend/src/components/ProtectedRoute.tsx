import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const clear = useAuthStore((s) => s.clear);

  const expired = expiresAt != null && Date.now() >= expiresAt;

  useEffect(() => {
    if (expired) {
      clear();
    }
  }, [expired, clear]);

  if (expired || !token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}