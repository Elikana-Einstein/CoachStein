import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0d1117] text-sm text-[#aab6af]">
      <div className="flex items-center gap-3"><span className="size-2 animate-pulse rounded-full bg-[#9be2c5]" /> Checking your session…</div>
    </main>
  );
}

export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
