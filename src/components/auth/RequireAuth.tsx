import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useLiveUpdates } from '../../hooks/useLiveUpdates';
import { ErrorAlert } from '../common/Layout';

function LiveUpdates() {
  useLiveUpdates();
  return null;
}

/** Layout route: renders the app only for a logged-in user, otherwise redirects to /login. */
export default function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (auth.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <ErrorAlert error={auth.error} title="Could not reach the backend" />
      </Box>
    );
  }
  if (!auth.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return (
    <>
      {/* The live-updates WebSocket only opens once logged in (the backend rejects it otherwise). */}
      <LiveUpdates />
      <Outlet />
    </>
  );
}
