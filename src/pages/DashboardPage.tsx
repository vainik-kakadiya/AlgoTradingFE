import { Alert, Box, Chip, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { DashboardData } from '../types/api';
import { dateTime, duration, humanize, money, pct, pnlColor, profitFactor, signedMoney } from '../utils/format';
import { EmptyState, PageHeader, Pnl, QueryView, Section, StatCard, StatGrid } from '../components/common/Layout';
import { FeedChip, StatusChip } from '../components/common/StatusChips';
import DataTable from '../components/common/DataTable';
import { EventsTable, OrdersTable, PositionsTable, SignalsTable } from '../components/common/RecordTables';
import { useLiveStore } from '../store/liveStore';

export default function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 5000 });
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Paper-trading status and simulated performance, computed by the backend from persisted records." />
      <QueryView query={query}>{(d) => <DashboardBody data={d} />}</QueryView>
    </>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const liveFeed = useLiveStore((s) => s.feed);
  const feed = liveFeed ?? data.system.feed;
  const sessions = data.active_sessions;
  const realized = sessions.reduce((a, s) => a + (s.live?.realized_pnl ?? s.session.realized_pnl), 0);
  const unrealized = sessions.reduce((a, s) => a + (s.live?.unrealized_pnl ?? s.session.unrealized_pnl), 0);
  const capital = sessions.reduce((a, s) => a + s.session.initial_capital, 0);
  const net = realized + unrealized;
  const all = data.paper_all_time;
  const today = data.paper_today;
  const maxDd = sessions.length ? Math.max(...sessions.map((s) => s.metrics.max_drawdown ?? 0)) : null;
  const firstStart = sessions.length ? sessions.map((s) => s.session.started_at).sort()[0] : null;
  const staleSessions = sessions.filter((s) => s.live && !s.live.data_fresh);
  const blocked = sessions.filter((s) => s.live?.entries_blocked_reason);

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label="Mode: PAPER ONLY" color="secondary" size="small" />
        <FeedChip feed={feed} />
        <Chip size="small" variant="outlined" label={`Market: ${humanize(data.system.market_phase)}`} />
        <Chip size="small" variant="outlined" label={`Last market update: ${dateTime(feed.last_market_ts)}`} />
        <Chip size="small" variant="outlined" color={data.system.kite.authenticated ? 'success' : 'default'}
          label={data.system.kite.authenticated ? `Kite: ${data.system.kite.user_id ?? 'connected'}` : 'Kite: not logged in'} />
      </Stack>

      {feed.status !== 'CONNECTED' && sessions.some((s) => s.session.data_source === 'KITE') && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Active Kite paper sessions are waiting for market data (feed {humanize(feed.status)}). New entries are blocked until fresh data arrives.{' '}
          <Link component={RouterLink} to="/market-data">Open Market Data</Link>
        </Alert>
      )}
      {staleSessions.map((s) => (
        <Alert key={s.session.id} severity="warning" sx={{ mb: 1 }}>
          Session “{s.session.name}”: {s.live?.stale_reason}
        </Alert>
      ))}
      {blocked.map((s) => (
        <Alert key={`b${s.session.id}`} severity="error" sx={{ mb: 1 }}>
          Session “{s.session.name}” entries blocked: {s.live?.entries_blocked_reason}
        </Alert>
      ))}

      <StatGrid>
        <StatCard label="Net simulated P&L (active)" value={signedMoney(net)} color={pnlColor(net)} sub={capital ? `Return ${pct((net / capital) * 100)} on ₹ ${capital.toLocaleString('en-IN')} capital` : 'No active session'} />
        <StatCard label="Realized" value={signedMoney(realized)} color={pnlColor(realized)} />
        <StatCard label="Unrealized" value={signedMoney(unrealized)} color={pnlColor(unrealized)} />
        <StatCard label="Today's net (closed)" value={signedMoney(today.net_pnl)} color={pnlColor(today.net_pnl)} sub={`${today.total_trades} trades · return ${pct(today.return_pct)}`} />
        <StatCard label="Closed trades (all paper)" value={all.total_trades} sub={`${all.wins}W / ${all.losses}L / ${all.breakeven} BE`} />
        <StatCard label="Win rate" value={pct(all.win_rate)} />
        <StatCard label="Profit factor" value={profitFactor(all.profit_factor, all.profit_factor_state)} />
        <StatCard label="Max drawdown (active)" value={maxDd === null ? '—' : money(maxDd)} />
        <StatCard label="Session running for" value={duration(firstStart)} sub={`${sessions.length} active session(s)`} />
      </StatGrid>

      <Section title="Active paper sessions" actions={<Link component={RouterLink} to="/paper">Manage</Link>}>
        <DataTable
          rows={sessions}
          rowKey={(s) => s.session.id}
          empty="No active paper session"
          emptyHint={<>Start one from <Link component={RouterLink} to="/paper">Paper Trading</Link>.</>}
          columns={[
            { key: 'name', label: 'Session', render: (s) => <Link component={RouterLink} to={`/paper/${s.session.id}`}>{s.session.name}</Link> },
            { key: 'strategy', label: 'Strategy', render: (s) => `${s.session.strategy_name} v${s.session.version_number}` },
            { key: 'source', label: 'Data', render: (s) => s.session.data_source },
            { key: 'status', label: 'Status', render: (s) => <StatusChip status={s.session.status} /> },
            { key: 'data', label: 'Data fresh', render: (s) => (s.live?.data_fresh ? <Chip size="small" color="success" label="fresh" /> : <Chip size="small" color="warning" label="stale" />) },
            { key: 'net', label: 'Net P&L', align: 'right', render: (s) => <Pnl value={s.live?.net_pnl ?? s.session.net_pnl} bold /> },
            { key: 'open', label: 'Open pos.', align: 'right', render: (s) => s.live?.open_positions ?? '—' },
            { key: 'trades', label: 'Trades', align: 'right', render: (s) => s.metrics.total_trades },
          ]}
        />
      </Section>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Section title="Open simulated positions">
          <PositionsTable positions={data.open_positions} />
        </Section>
        <Section title="Latest signals">
          <SignalsTable signals={data.recent_signals} />
        </Section>
        <Section title="Recent simulated orders">
          <OrdersTable orders={data.recent_orders} />
        </Section>
        <Section title="Recent warnings, errors and risk events" actions={<Link component={RouterLink} to="/logs">All logs</Link>}>
          {data.recent_alerts.length ? <EventsTable events={data.recent_alerts} maxHeight={360} /> : <EmptyState title="No warnings or errors" />}
        </Section>
      </Box>
      <Typography variant="caption" color="text.secondary">
        All figures are simulated paper-trading results and are not indicative of real trading performance.
      </Typography>
    </Box>
  );
}
