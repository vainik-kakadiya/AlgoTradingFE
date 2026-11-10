import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Chip, Divider, Link, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import type { DashboardData } from '../../types/api';
import { duration } from '../../utils/format';
import { Pnl } from '../common/Layout';
import { StatusChip } from '../common/StatusChips';

type ActiveSession = DashboardData['active_sessions'][number];

function FreshnessDot({ s }: { s: ActiveSession }) {
  const theme = useTheme();
  const fresh = Boolean(s.live?.data_fresh);
  const color = fresh ? theme.palette.success.main : theme.palette.warning.main;
  return (
    <Tooltip title={fresh ? 'Market data is fresh' : (s.live?.stale_reason ?? 'No live state for this session')}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: color,
            boxShadow: `0 0 0 3px ${alpha(color, 0.2)}`,
            ...(fresh && {
              animation: 'dashPulse 2s ease-in-out infinite',
              '@keyframes dashPulse': { '0%, 100%': { boxShadow: `0 0 0 3px ${alpha(color, 0.2)}` }, '50%': { boxShadow: `0 0 0 6px ${alpha(color, 0.05)}` } },
            }),
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {fresh ? 'Data fresh' : 'Data stale'}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div" noWrap>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }} component="div" noWrap>
        {children}
      </Typography>
    </Box>
  );
}

function SessionCard({ s }: { s: ActiveSession }) {
  const theme = useTheme();
  const net = s.live?.net_pnl ?? s.session.net_pnl;
  const capital = s.session.initial_capital;
  const accent = net > 0 ? theme.palette.success.main : net < 0 ? theme.palette.error.main : theme.palette.text.disabled;
  return (
    <Card
      sx={{
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.75,
        borderLeft: `3px solid ${accent}`,
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { boxShadow: theme.shadows[3], transform: 'translateY(-1px)' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Link component={RouterLink} to={`/paper/${s.session.id}`} underline="hover" color="text.primary" sx={{ fontWeight: 700, fontSize: 16 }} noWrap display="block">
            {s.session.name}
          </Link>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {s.session.strategy_name ?? 'Strategy'} v{s.session.version_number}
          </Typography>
        </Box>
        <StatusChip status={s.session.status} />
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Net P&L
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h5" component="div" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
            <Pnl value={net} />
          </Typography>
          {capital > 0 && (
            <Typography variant="caption" sx={{ color: accent, fontWeight: 600 }}>
              {net >= 0 ? '+' : ''}
              {((net / capital) * 100).toFixed(2)}%
            </Typography>
          )}
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 2, rowGap: 1.25 }}>
        <Figure label="Realized">
          <Pnl value={s.live?.realized_pnl ?? s.session.realized_pnl} />
        </Figure>
        <Figure label="Unrealized">
          <Pnl value={s.live?.unrealized_pnl ?? s.session.unrealized_pnl} />
        </Figure>
        <Figure label="Open pos.">{s.live?.open_positions ?? '—'}</Figure>
        <Figure label="Trades">{s.metrics.total_trades}</Figure>
      </Box>

      <Divider />
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Chip size="small" label={s.session.data_source === 'KITE' ? 'Live Kite' : 'Replay'} variant="outlined" />
          <FreshnessDot s={s} />
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>
          {duration(s.session.started_at)}
        </Typography>
      </Stack>
    </Card>
  );
}

export function SessionCards({ sessions }: { sessions: ActiveSession[] }) {
  if (!sessions.length) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
        <Stack alignItems="center" spacing={1.5}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary' }}>
            <PlayCircleIcon />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            No active paper session
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start a session to see live simulated P&L, positions and signals here.
          </Typography>
          <Button component={RouterLink} to="/paper" variant="contained" endIcon={<ArrowForwardIcon />}>
            Go to Paper Trading
          </Button>
        </Stack>
      </Card>
    );
  }
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 2 }}>
      {sessions.map((s) => (
        <SessionCard key={s.session.id} s={s} />
      ))}
    </Box>
  );
}
