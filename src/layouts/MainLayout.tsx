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
import { useLiveStore } from '../store/liveStore';
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

const WIDTH = 228;

export default function MainLayout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const ws = useLiveStore((s) => s.ws);
  const feed = useLiveStore((s) => s.feed);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Algo Trading Lab
        </Typography>
      </Toolbar>
      <Divider />
      <List dense>
        {NAV.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <ListItemButton key={item.to} component={NavLink} to={item.to} selected={active} onClick={() => setOpen(false)}>
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          {!desktop && (
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open navigation">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
            {desktop ? '' : 'Algo Trading Lab'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="This application only simulates orders. It has no ability to place real orders.">
              <Chip label="PAPER ONLY · SIMULATED" color="secondary" size="small" sx={{ fontWeight: 700 }} />
            </Tooltip>
            <FeedChip feed={feed} />
            <Tooltip title={`Live updates ${ws}`}>
              <Chip
                size="small"
                variant="outlined"
                label={ws === 'open' ? 'Live' : ws === 'connecting' ? 'Connecting…' : 'Offline'}
                color={ws === 'open' ? 'success' : ws === 'connecting' ? 'default' : 'error'}
              />
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={desktop ? 'permanent' : 'temporary'}
        open={desktop || open}
        onClose={() => setOpen(false)}
        sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' } }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
