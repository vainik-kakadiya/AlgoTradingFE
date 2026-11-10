import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import { ApiError, api } from '../services/api';
import { AUTH_KEY, useAuth } from '../hooks/useAuth';

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.code === 'INVALID_CREDENTIALS') {
    const left = (error.details as { attempts_left?: number } | undefined)?.attempts_left;
    if (left === 0) return 'Incorrect email or password. Too many failed attempts: login is locked for 15 minutes.';
    if (left !== undefined && left <= 3) return `Incorrect email or password. ${left} attempt${left === 1 ? '' : 's'} left before a 15-minute lock-out.`;
    return 'Incorrect email or password.';
  }
  return error.message;
}

export default function LoginPage() {
  const theme = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const login = useMutation({
    mutationFn: () => api.login(email.trim(), password),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_KEY, user);
      navigate(from === '/login' ? '/' : from, { replace: true });
    },
    onError: () => setPassword(''),
  });

  if (auth.data) return <Navigate to={from === '/login' ? '/' : from} replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim() && password && !login.isPending) login.mutate();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: `radial-gradient(1200px 600px at 10% -10%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 60%),
                     radial-gradient(900px 500px at 110% 110%, ${alpha(theme.palette.secondary.main, 0.14)}, transparent 60%),
                     ${theme.palette.background.default}`,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 4, boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.12)}` }}>
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <ShowChartIcon />
          </Box>
          <Typography variant="h5" fontWeight={800}>
            Algo Trading Lab
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue
          </Typography>
        </Stack>

        <Box component="form" onSubmit={submit} noValidate>
          <Stack spacing={2}>
            {login.isError && (
              <Alert severity="error" variant="outlined">
                {errorMessage(login.error)}
              </Alert>
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!email.trim() || !password || login.isPending}
              startIcon={login.isPending ? <CircularProgress size={18} color="inherit" /> : <LockOutlinedIcon />}
              sx={{ py: 1.25, fontWeight: 700, textTransform: 'none', fontSize: 16 }}
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 3, color: 'text.secondary' }}>
          <ShieldIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">Private dashboard · paper trading only, no real orders</Typography>
        </Stack>
      </Card>
    </Box>
  );
}
