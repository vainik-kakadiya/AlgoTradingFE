import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import RuleIcon from '@mui/icons-material/Rule';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import HistoryIcon from '@mui/icons-material/History';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InsightsIcon from '@mui/icons-material/Insights';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLiveStore } from '../store/liveStore';
import { useAuth, useLogout } from '../hooks/useAuth';
import { FeedChip } from '../components/common/StatusChips';

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/strategies', label: 'Strategies', icon: <RuleIcon /> },
  { to: '/instruments', label: 'Instruments', icon: <ListAltIcon /> },
  { to: '/market-data', label: 'Market Data', icon: <ShowChartIcon /> },
  { to: '/backtests', label: 'Backtesting', icon: <HistoryIcon /> },
  { to: '/paper', label: 'Paper Trading', icon: <PlayCircleIcon /> },
  { to: '/trades', label: 'Trade History', icon: <ReceiptLongIcon /> },
  { to: '/analytics', label: 'Analytics', icon: <InsightsIcon /> },
  { to: '/logs', label: 'System Logs', icon: <TerminalIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

const WIDTH = 240;

function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, display: 'flex', '& .MuiChip-root': { maxWidth: '100%' } }}>{children}</Box>
    </Stack>
  );
}

/** Pinned to the bottom of the sidebar: paper-only notice, market feed and live-update connection. */
function SidebarStatus() {
  const theme = useTheme();
  const ws = useLiveStore((s) => s.ws);
  const feed = useLiveStore((s) => s.feed);
  return (
    <Box sx={{ p: 1.5 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
        <Tooltip title="This application only simulates orders. It has no ability to place real orders." placement="right">
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1.25, px: 1, py: 0.75, borderRadius: 1.5, color: 'secondary.contrastText', bgcolor: 'secondary.main' }}
          >
            <ShieldIcon sx={{ fontSize: 18 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: 0.6, display: 'block', lineHeight: 1.3 }}>
                PAPER ONLY
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.3, opacity: 0.85, fontSize: 11 }}>
                Simulated · no real orders
              </Typography>
            </Box>
          </Stack>
        </Tooltip>
        <Stack spacing={1}>
          <StatusRow label="Market feed">
            <FeedChip feed={feed} />
          </StatusRow>
          <StatusRow label="Live updates">
            <Tooltip title={`WebSocket ${ws}`} placement="right">
              <Chip
                size="small"
                variant="outlined"
                label={ws === 'open' ? 'Live' : ws === 'connecting' ? 'Connecting…' : 'Offline'}
                color={ws === 'open' ? 'success' : ws === 'connecting' ? 'default' : 'error'}
              />
            </Tooltip>
          </StatusRow>
        </Stack>
      </Box>
      <UserRow />
    </Box>
  );
}

/** Logged-in account and the log-out button. */
function UserRow() {
  const theme = useTheme();
  const user = useAuth().data;
  const logout = useLogout();
  if (!user) return null;
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 1.25, px: 0.5 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: 14,
          color: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.12),
        }}
      >
        {user.email.charAt(0).toUpperCase()}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.2 }}>
          Signed in as
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap title={user.email}>
          {user.email}
        </Typography>
      </Box>
      <Tooltip title="Log out" placement="right">
        <IconButton size="small" onClick={logout} aria-label="Log out">
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function MainLayout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, py: 2 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <ShowChartIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" fontWeight={800} noWrap>
          Algo Trading Lab
        </Typography>
      </Stack>
      <Divider />
      <List dense sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
        {NAV.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={active}
              onClick={() => setOpen(false)}
              sx={{ borderRadius: 1.5, mb: 0.25, '&.Mui-selected': { fontWeight: 700, color: 'primary.main', '& .MuiListItemIcon-root': { color: 'primary.main' } } }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 'inherit' }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <SidebarStatus />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Phones only: the sidebar is hidden, so a slim bar holds the menu button. */}
      {!desktop && (
        <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open navigation">
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              Algo Trading Lab
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || open}
        onClose={() => setOpen(false)}
        sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' } }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        {!desktop && <Toolbar variant="dense" />}
        <Outlet />
      </Box>
    </Box>
  );
}
