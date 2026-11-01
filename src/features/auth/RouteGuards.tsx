import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert } from '../../components/ui/feedback/Alert';
import { Button } from '../../components/ui/form/Button';
import { Spinner } from '../../components/ui/feedback/Spinner';
import { canAccessUserArea, isAdminUser, useUserStore } from '../../store/userStore';

function SessionPending() {
  const sessionError = useUserStore((state) => state.sessionError);
  const retry = useUserStore((state) => state.initializeSession);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      {sessionError ? (
        <div className="w-full max-w-md space-y-4">
          <Alert variant="danger" role="alert">
            {sessionError}
          </Alert>
          <Button fullWidth onClick={() => void retry()}>
            Thử xác minh lại
          </Button>
        </div>
      ) : (
        <Spinner size="lg" label="Đang kiểm tra phiên đăng nhập..." />
      )}
    </main>
  );
}

function defaultDestination(isAdmin: boolean): string {
  return isAdmin ? '/admin' : '/app';
}

export function GuestOnlyRoute() {
  const authStatus = useUserStore((state) => state.authStatus);
  const currentUser = useUserStore((state) => state.currentUser);
  if (authStatus === 'IDLE' || authStatus === 'INITIALIZING') return <SessionPending />;
  if (authStatus === 'AUTHENTICATED') {
    return <Navigate replace to={defaultDestination(isAdminUser(currentUser))} />;
  }
  return <Outlet />;
}

export function ProtectedRoute() {
  const authStatus = useUserStore((state) => state.authStatus);
  const currentUser = useUserStore((state) => state.currentUser);
  const location = useLocation();
  if (authStatus === 'IDLE' || authStatus === 'INITIALIZING') return <SessionPending />;
  if (authStatus !== 'AUTHENTICATED') {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }
  if (!canAccessUserArea(currentUser)) return <Navigate replace to="/" />;
  return <Outlet />;
}

export function AdminRoute() {
  const authStatus = useUserStore((state) => state.authStatus);
  const currentUser = useUserStore((state) => state.currentUser);
  const location = useLocation();
  if (authStatus === 'IDLE' || authStatus === 'INITIALIZING') return <SessionPending />;
  if (authStatus !== 'AUTHENTICATED') {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }
  if (!isAdminUser(currentUser)) return <Navigate replace to="/app" />;
  return <Outlet />;
}
