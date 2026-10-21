import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { PaperSessionDetail } from '../types/api';
import { dateTime, duration, money, pct, pnlColor, profitFactor, signedMoney } from '../utils/format';
import { JsonBlock, PageHeader, QueryView, Section, SimulatedNotice, StatCard, StatGrid } from '../components/common/Layout';
import { StatusChip } from '../components/common/StatusChips';
import { EventsTable, OrdersTable, PositionsTable, SignalsTable } from '../components/common/RecordTables';
import TradesTable from '../components/trades/TradesTable';
import { EquityChart } from '../components/charts/Charts';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function PaperSessionPage() {
  const id = Number(useParams().id);
  const detail = useQuery({ queryKey: ['paper', id], queryFn: () => api.paperSession(id), refetchInterval: 3000 });
  return <QueryView query={detail}>{(d) => <SessionView id={id} d={d} />}</QueryView>;
}

function SessionView({ id, d }: { id: number; d: PaperSessionDetail }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [confirm, setConfirm] = useState<'entries' | 'stop' | null>(null);
  const s = d.session;
  const live = d.live;
  const active = s.status === 'RUNNING' || s.status === 'ENTRIES_STOPPED';
  const positions = useQuery({ queryKey: ['paper', id, 'positions'], queryFn: () => api.paperPositions(id, 'OPEN'), refetchInterval: 3000 });
  const orders = useQuery({ queryKey: ['paper', id, 'orders'], queryFn: () => api.paperOrders(id), enabled: tab === 1 });
  const signals = useQuery({ queryKey: ['paper', id, 'signals'], queryFn: () => api.paperSignals(id), enabled: tab === 0 });
  const trades = useQuery({ queryKey: ['paper', id, 'trades'], queryFn: () => api.paperTrades(id), enabled: tab === 2 });
  const events = useQuery({ queryKey: ['paper', id, 'events'], queryFn: () => api.paperEvents(id), enabled: tab === 3 });
  const equity = useQuery({ queryKey: ['paper', id, 'equity'], queryFn: () => api.paperEquity(id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['paper'] });
  const stopEntries = useMutation({ mutationFn: () => api.stopEntries(id), onSuccess: () => { setConfirm(null); refresh(); } });
  const stop = useMutation({ mutationFn: () => api.stopSession(id, 'Stopped from dashboard'), onSuccess: () => { setConfirm(null); refresh(); } });
  const realized = live?.realized_pnl ?? s.realized_pnl;
  const unrealized = live?.unrealized_pnl ?? s.unrealized_pnl;
  const net = realized + unrealized;
  const m = d.metrics;
  const risk = (d.strategy_config.risk ?? {}) as Record<string, unknown>;

  return (
    <>
      <PageHeader
        title={`Paper session #${s.id} · ${s.name}`}
        subtitle={`${s.strategy_name} v${s.version_number} · ${s.data_source} data · started ${dateTime(s.started_at)} (${duration(s.started_at, s.stopped_at)})`}
        actions={
          <>
            <StatusChip status={s.status} />
            <Button variant="outlined" color="warning" disabled={s.status !== 'RUNNING'} onClick={() => setConfirm('entries')}>Stop new entries</Button>
            <Button variant="contained" color="error" disabled={!active} onClick={() => setConfirm('stop')}>Stop session</Button>
          </>
        }
      />
      <SimulatedNotice />
      {s.stop_reason && <Alert severity="info" sx={{ mb: 2 }}>Stopped {dateTime(s.stopped_at)}: {s.stop_reason}</Alert>}
      {active && live && !live.data_fresh && <Alert severity="warning" sx={{ mb: 2 }}>Market data not fresh: {live.stale_reason}. New entries are blocked.</Alert>}
      {active && live?.entries_blocked_reason && <Alert severity="error" sx={{ mb: 2 }}>New entries blocked: {live.entries_blocked_reason}</Alert>}
      {active && !live && <Alert severity="warning" sx={{ mb: 2 }}>Session is marked active but not loaded in the engine; restart the backend to restore it.</Alert>}

      <StatGrid>
        <StatCard label="Net P&L (simulated)" value={signedMoney(net)} color={pnlColor(net)} sub={`Return ${pct((net / s.initial_capital) * 100)} on ${money(s.initial_capital)}`} />
        <StatCard label="Realized" value={signedMoney(realized)} color={pnlColor(realized)} />
        <StatCard label="Unrealized" value={signedMoney(unrealized)} color={pnlColor(unrealized)} />
        <StatCard label="Today realized" value={signedMoney(live?.day_realized)} sub={risk.max_daily_loss ? `Daily loss limit ₹${Number(risk.max_daily_loss).toLocaleString('en-IN')}` : 'No daily loss limit'} />
        <StatCard label="Closed trades" value={m.total_trades} sub={`Win rate ${pct(m.win_rate)}`} />
        <StatCard label="Profit factor" value={profitFactor(m.profit_factor, m.profit_factor_state)} />
        <StatCard label="Open / pending" value={`${live?.open_positions ?? 0} / ${(live?.pending_orders ?? 0) + (live?.pending_entries ?? 0)}`} sub={`Max ${String(risk.max_open_positions ?? 1)} open`} />
        <StatCard label="Latest market data" value={dateTime(s.last_market_ts)} sub={live ? (live.data_fresh ? 'fresh' : 'stale') : undefined} />
      </StatGrid>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Section title="Open simulated positions">
          <QueryView query={positions}>{(p) => <PositionsTable positions={p} />}</QueryView>
        </Section>
        <Section title="Equity">
          <QueryView query={equity}>{(pts) => <EquityChart points={pts} baseline={s.initial_capital} height={220} />}</QueryView>
        </Section>
      </Box>

      <Section>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }} variant="scrollable">
          <Tab label="Signals" />
          <Tab label="Simulated orders" />
          <Tab label="Trades" />
          <Tab label="Session log" />
          <Tab label="Configuration" />
        </Tabs>
        {tab === 0 && <QueryView query={signals}>{(x) => <SignalsTable signals={x} pageSize={50} />}</QueryView>}
        {tab === 1 && <QueryView query={orders}>{(x) => <OrdersTable orders={x} maxHeight={520} />}</QueryView>}
        {tab === 2 && <QueryView query={trades}>{(x) => <TradesTable trades={x} />}</QueryView>}
        {tab === 3 && <QueryView query={events}>{(x) => <EventsTable events={x} maxHeight={520} />}</QueryView>}
        {tab === 4 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2">Strategy configuration (snapshot, hash {s.config_hash.slice(0, 12)})</Typography>
              <JsonBlock value={d.strategy_config} maxHeight={520} />
            </Box>
            <Box>
              <Typography variant="subtitle2">Session costs & execution model</Typography>
              <JsonBlock value={d.session_config} maxHeight={520} />
            </Box>
          </Box>
        )}
      </Section>

      <ConfirmDialog
        open={confirm === 'entries'}
        title="Stop new entries?"
        confirmLabel="Stop new entries"
        busy={stopEntries.isPending}
        onConfirm={() => stopEntries.mutate()}
        onClose={() => setConfirm(null)}
      >
        <Typography gutterBottom>{d.stop_semantics.stop_entries}</Typography>
        <Chip size="small" label={`${live?.open_positions ?? 0} open position(s) stay protected`} />
        {stopEntries.isError && <Alert severity="error" sx={{ mt: 2 }}>{(stopEntries.error as Error).message}</Alert>}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'stop'}
        title="Stop session and close simulated positions?"
        confirmLabel="Stop session"
        danger
        busy={stop.isPending}
        onConfirm={() => stop.mutate()}
        onClose={() => setConfirm(null)}
      >
        <Typography gutterBottom>{d.stop_semantics.stop}</Typography>
        <Stack direction="row" spacing={1}>
          <Chip size="small" color="error" label={`${live?.open_positions ?? 0} open position(s) will be closed`} />
          <Chip size="small" label={`${live?.pending_orders ?? 0} pending order(s) will be cancelled`} />
        </Stack>
        {stop.isError && <Alert severity="error" sx={{ mt: 2 }}>{(stop.error as Error).message}</Alert>}
      </ConfirmDialog>
    </>
  );
}
