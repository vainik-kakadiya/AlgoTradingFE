import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, Link, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme, type ChipProps } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TodayIcon from '@mui/icons-material/Today';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BalanceIcon from '@mui/icons-material/Balance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import LayersIcon from '@mui/icons-material/Layers';
import HistoryIcon from '@mui/icons-material/History';
import SensorsIcon from '@mui/icons-material/Sensors';
import { api } from '../services/api';
import type { DashboardData } from '../types/api';
import { dateTime, duration, humanize, money, pct, pnlColor, profitFactor, signedMoney, timeOnly } from '../utils/format';
import { Pnl, QueryView } from '../components/common/Layout';
import { FeedChip } from '../components/common/StatusChips';
import { useLiveStore } from '../store/liveStore';
import { HeroKpi, Panel, Ring, SplitFooter, StatStrip } from '../components/dashboard/KpiCards';
import { ChartEmpty, DailyBars, EquityArea, OutcomeBreakdown } from '../components/dashboard/DashboardCharts';
import { SessionCards } from '../components/dashboard/SessionCards';
import { ActivityPanel } from '../components/dashboard/ActivityPanel';

export default function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 5000 });
  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
      <Hero data={query.data} />
      <QueryView query={query}>{(d) => <DashboardBody data={d} />}</QueryView>
    </Box>
  );
}

const PHASE_COLORS: Record<string, ChipProps['color']> = { OPEN: 'success', PRE_OPEN: 'info' };

function Hero({ data }: { data?: DashboardData }) {
  const theme = useTheme();
  const liveFeed = useLiveStore((s) => s.feed);
  const feed = liveFeed ?? data?.system.feed ?? null;
  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.07)} 55%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ lg: 'flex-end' }} spacing={2}>
        <Box>
          <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: 1.2 }}>
            Paper trading overview
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5, lineHeight: 1.2 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Simulated performance, computed by the backend from persisted records.
            {data && ` Updated ${timeOnly(data.system.server_time)} IST.`}
          </Typography>
        </Box>
        {data && feed && (
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ justifyContent: { lg: 'flex-end' }, maxWidth: { lg: 560 }, '& .MuiChip-outlined': { bgcolor: 'background.paper' } }}
          >
            <Chip label="Mode: PAPER ONLY" color="secondary" size="small" sx={{ fontWeight: 700 }} />
            <FeedChip feed={feed} />
            <Chip size="small" variant="outlined" color={PHASE_COLORS[data.system.market_phase] ?? 'default'} label={`Market: ${humanize(data.system.market_phase)}`} />
            <Chip size="small" variant="outlined" label={`Last market update: ${dateTime(feed.last_market_ts)}`} />
            <Chip
              size="small"
              variant="outlined"
              color={data.system.kite.authenticated ? 'success' : 'default'}
              label={data.system.kite.authenticated ? `Kite: ${data.system.kite.user_id ?? 'connected'}` : 'Kite: not logged in'}
            />
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function SectionTitle({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        {count !== undefined && <Chip size="small" label={count} sx={{ fontWeight: 700, height: 22 }} />}
      </Stack>
      {action}
    </Stack>
  );
}

function PerformancePanel({ allTimeNet }: { allTimeNet: number }) {
  const [view, setView] = useState<'equity' | 'daily'>('equity');
  const equity = useQuery({ queryKey: ['analytics', 'dashboard', 'equity'], queryFn: () => api.analyticsEquity({ scope: 'paper' }), refetchInterval: 30000 });
  const summary = useQuery({ queryKey: ['analytics', 'dashboard', 'summary'], queryFn: () => api.analyticsSummary({ scope: 'paper' }), enabled: view === 'daily' });
  const active = view === 'equity' ? equity : summary;
  const height = 290;

  let body;
  if (active.isPending) body = <Skeleton variant="rounded" height={height} />;
  else if (active.isError) body = <ChartEmpty title="Chart data unavailable" hint={active.error instanceof Error ? active.error.message : undefined} height={height} />;
  else if (view === 'equity') body = <EquityArea points={equity.data?.points ?? []} height={height} />;
  else body = <DailyBars days={(summary.data?.daily ?? []).slice(-30)} height={height} />;

  return (
    <Panel
      title={
        <Stack direction="row" spacing={1.5} alignItems="baseline">
          <span>Performance</span>
          <Typography component="span" variant="subtitle1" fontWeight={700} sx={{ color: pnlColor(allTimeNet), fontVariantNumeric: 'tabular-nums' }}>
            {signedMoney(allTimeNet)}
          </Typography>
        </Stack>
      }
      subtitle={view === 'equity' ? 'Cumulative net P&L across all closed paper trades' : 'Net P&L per IST exit date (last 30 trading days)'}
      actions={
        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)} sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 1.5, py: 0.25 } }}>
          <ToggleButton value="equity">Equity</ToggleButton>
          <ToggleButton value="daily">Daily</ToggleButton>
        </ToggleButtonGroup>
      }
    >
      {body}
    </Panel>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const liveFeed = useLiveStore((s) => s.feed);
  const feed = liveFeed ?? data.system.feed;
  const sessions = data.active_sessions;
  const realized = sessions.reduce((a, s) => a + (s.live?.realized_pnl ?? s.session.realized_pnl), 0);
  const unrealized = sessions.reduce((a, s) => a + (s.live?.unrealized_pnl ?? s.session.unrealized_pnl), 0);
  const capital = sessions.reduce((a, s) => a + s.session.initial_capital, 0);
  const pendingOrders = sessions.reduce((a, s) => a + (s.live?.pending_orders ?? 0), 0);
  const net = realized + unrealized;
  const all = data.paper_all_time;
  const today = data.paper_today;
  const maxDd = sessions.length ? Math.max(...sessions.map((s) => s.metrics.max_drawdown ?? 0)) : null;
  const firstStart = sessions.length ? sessions.map((s) => s.session.started_at).sort()[0] : null;
  const staleSessions = sessions.filter((s) => s.live && !s.live.data_fresh);
  const blocked = sessions.filter((s) => s.live?.entries_blocked_reason);
  const accentFor = (v: number) => (v > 0 ? 'success' : v < 0 ? 'error' : 'primary');

  return (
    <Box>
      {/* Safety and data-quality warnings come first. */}
      <Stack spacing={1} sx={{ mb: 3, '&:empty': { display: 'none' } }}>
        {feed.status !== 'CONNECTED' && sessions.some((s) => s.session.data_source === 'KITE') && (
          <Alert severity="warning" variant="outlined" sx={{ bgcolor: 'background.paper' }}>
            Active Kite paper sessions are waiting for market data (feed {humanize(feed.status)}). New entries are blocked until fresh data arrives.{' '}
            <Link component={RouterLink} to="/market-data">
              Open Market Data
            </Link>
          </Alert>
        )}
        {staleSessions.map((s) => (
          <Alert key={s.session.id} severity="warning" variant="outlined" sx={{ bgcolor: 'background.paper' }}>
            Session “{s.session.name}”: {s.live?.stale_reason}
          </Alert>
        ))}
        {blocked.map((s) => (
          <Alert key={`b${s.session.id}`} severity="error" variant="outlined" sx={{ bgcolor: 'background.paper' }}>
            Session “{s.session.name}” entries blocked: {s.live?.entries_blocked_reason}
          </Alert>
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 2 }}>
        <HeroKpi
          label="Net simulated P&L (active)"
          icon={<AccountBalanceWalletIcon />}
          accent={accentFor(net)}
          value={signedMoney(net)}
          valueColor={pnlColor(net)}
          sub={capital ? `Return ${pct((net / capital) * 100)} on ₹ ${capital.toLocaleString('en-IN')}` : 'No active session'}
          footer={<SplitFooter items={[{ label: 'Realized', value: <Pnl value={realized} /> }, { label: 'Unrealized', value: <Pnl value={unrealized} /> }]} />}
        />
        <HeroKpi
          label="Today's net (closed)"
          icon={<TodayIcon />}
          accent={accentFor(today.net_pnl)}
          value={signedMoney(today.net_pnl)}
          valueColor={pnlColor(today.net_pnl)}
          sub={`${today.total_trades} trades · return ${pct(today.return_pct)}`}
          footer={<SplitFooter items={[{ label: 'Gross', value: <Pnl value={today.gross_pnl} /> }, { label: 'Charges', value: money(today.total_charges) }]} />}
        />
        <HeroKpi
          label="Win rate"
          icon={<EmojiEventsIcon />}
          accent="info"
          value={pct(all.win_rate)}
          aside={<Ring value={all.win_rate} accent="success" />}
          sub={`${all.wins}W · ${all.losses}L · ${all.breakeven} BE`}
          footer={<SplitFooter items={[{ label: 'All-time net', value: <Pnl value={all.net_pnl} /> }, { label: 'Avg trade', value: <Pnl value={all.avg_trade} /> }]} />}
        />
        <HeroKpi
          label="Profit factor"
          icon={<BalanceIcon />}
          accent="secondary"
          value={profitFactor(all.profit_factor, all.profit_factor_state)}
          sub="Gross profit ÷ gross loss"
          footer={<SplitFooter items={[{ label: 'Gross profit', value: money(all.gross_profit) }, { label: 'Gross loss', value: money(all.gross_loss) }]} />}
        />
      </Box>

      <StatStrip
        items={[
          { label: 'Closed trades', value: all.total_trades, sub: 'All paper sessions', icon: <ReceiptLongIcon /> },
          { label: 'Max drawdown', value: maxDd === null ? '—' : money(maxDd), sub: 'Active sessions', icon: <TrendingDownIcon /> },
          { label: 'Active sessions', value: sessions.length, sub: `Running ${duration(firstStart)}`, icon: <PlayCircleIcon /> },
          { label: 'Open positions', value: data.open_positions.length, sub: `${pendingOrders} pending order(s)`, icon: <LayersIcon /> },
          { label: 'Backtests', value: data.system.backtests_in_progress, sub: 'Queued or running', icon: <HistoryIcon /> },
          { label: 'Ticks received', value: feed.ticks_received.toLocaleString('en-IN'), sub: `${feed.disconnects} disconnect(s)`, icon: <SensorsIcon /> },
        ]}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' }, gap: 2, mb: 3 }}>
        <PerformancePanel allTimeNet={all.net_pnl} />
        <Panel title="Trade outcomes" subtitle="All closed paper trades">
          <OutcomeBreakdown metrics={all} />
        </Panel>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SectionTitle
          title="Active paper sessions"
          count={sessions.length}
          action={
            <Button component={RouterLink} to="/paper" size="small">
              Manage →
            </Button>
          }
        />
        <SessionCards sessions={sessions} />
      </Box>

      <ActivityPanel data={data} />

      <Typography variant="caption" color="text.secondary" component="p" sx={{ textAlign: 'center', mt: 1 }}>
        All figures are simulated paper-trading results and are not indicative of real trading performance.
      </Typography>
    </Box>
  );
}
