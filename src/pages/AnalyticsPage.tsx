import { useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { AnalyticsSummary, GroupMetrics } from '../types/api';
import { money, pct, pnlColor, profitFactor, signedMoney } from '../utils/format';
import { EmptyState, PageHeader, Pnl, QueryView, Section, StatCard, StatGrid } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';
import { DistributionChart, DrawdownChart, EquityChart, GroupBarChart, PnlBarChart } from '../components/charts/Charts';

export default function AnalyticsPage() {
  const [scope, setScope] = useState<'paper' | 'backtest'>('backtest');
  const [runId, setRunId] = useState('');
  const [strategyId, setStrategyId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const strategies = useQuery({ queryKey: ['strategies'], queryFn: api.strategies });
  const runs = useQuery({ queryKey: ['backtests'], queryFn: () => api.backtests({ status: 'COMPLETED' }), enabled: scope === 'backtest' });
  const sessions = useQuery({ queryKey: ['paper', 'sessions'], queryFn: () => api.paperSessions(), enabled: scope === 'paper' });
  const params = {
    scope,
    backtest_id: scope === 'backtest' && runId ? runId : undefined,
    session_id: scope === 'paper' && runId ? runId : undefined,
    strategy_id: strategyId || undefined,
    start: start || undefined,
    end: end || undefined,
  };
  const summary = useQuery({ queryKey: ['analytics', 'summary', params], queryFn: () => api.analyticsSummary(params), placeholderData: keepPreviousData });
  const equity = useQuery({ queryKey: ['analytics', 'equity', params], queryFn: () => api.analyticsEquity(params), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader title="Analytics" subtitle="Performance computed by the backend from persisted trades and equity snapshots. Historical (backtest) and paper results are always kept separate." />
      <Section dense>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
          <ToggleButtonGroup size="small" exclusive value={scope} onChange={(_, v) => { if (v) { setScope(v); setRunId(''); } }}>
            <ToggleButton value="backtest">Historical backtests</ToggleButton>
            <ToggleButton value="paper">Paper trading</ToggleButton>
          </ToggleButtonGroup>
          <TextField size="small" select label={scope === 'backtest' ? 'Backtest run' : 'Paper session'} value={runId} onChange={(e) => setRunId(e.target.value)} sx={{ minWidth: 260 }}>
            <MenuItem value="">All {scope === 'backtest' ? 'completed runs' : 'sessions'}</MenuItem>
            {scope === 'backtest'
              ? (runs.data ?? []).map((r) => <MenuItem key={r.id} value={String(r.id)}>#{r.id} {r.strategy_name} v{r.version_number} · {r.dataset_name}</MenuItem>)
              : (sessions.data ?? []).map((s) => <MenuItem key={s.id} value={String(s.id)}>#{s.id} {s.name} ({s.data_source})</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Strategy" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">All</MenuItem>
            {(strategies.data ?? []).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Stack>
      </Section>
      <QueryView query={summary}>
        {(s) => (s.metrics.total_trades === 0 ? (
          <Section><EmptyState title="No closed trades for this selection">Run a backtest or a paper session; illustrative numbers are never shown.</EmptyState></Section>
        ) : (
          <SummaryView s={s} equity={equity.data} />
        ))}
      </QueryView>
    </>
  );
}

function groupColumns(label: string) {
  return [
    { key: 'g', label, render: (g: GroupMetrics) => g.group },
    { key: 'n', label: 'Trades', align: 'right' as const, render: (g: GroupMetrics) => g.total_trades },
    { key: 'w', label: 'Win rate', align: 'right' as const, render: (g: GroupMetrics) => pct(g.win_rate) },
    { key: 'pf', label: 'Profit factor', align: 'right' as const, render: (g: GroupMetrics) => profitFactor(g.profit_factor, g.profit_factor_state) },
    { key: 'avg', label: 'Avg trade', align: 'right' as const, render: (g: GroupMetrics) => <Pnl value={g.avg_trade} /> },
    { key: 'net', label: 'Net P&L', align: 'right' as const, render: (g: GroupMetrics) => <Pnl value={g.net_pnl} bold /> },
  ];
}

function SummaryView({ s, equity }: { s: AnalyticsSummary; equity?: Awaited<ReturnType<typeof api.analyticsEquity>> }) {
  const m = s.metrics;
  return (
    <>
      {s.scope === 'paper' && <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>Paper-trading results are simulated against live market data; no real orders were placed.</Alert>}
      <StatGrid>
        <StatCard label="Net P&L" value={signedMoney(m.net_pnl)} color={pnlColor(m.net_pnl)} sub={`Gross ${signedMoney(m.gross_pnl)}`} />
        <StatCard label="Return" value={pct(m.return_pct)} sub={s.return_basis} />
        <StatCard label="Win rate" value={pct(m.win_rate)} sub={`${m.wins}W / ${m.losses}L / ${m.breakeven} BE`} />
        <StatCard label="Profit factor" value={profitFactor(m.profit_factor, m.profit_factor_state)} />
        <StatCard label="Max drawdown" value={money(m.max_drawdown)} sub={`${m.max_drawdown_pct == null ? '' : pct(m.max_drawdown_pct) + ' · '}${m.drawdown_basis ?? ''}`} />
        <StatCard label="Avg win / loss" value={signedMoney(m.avg_win)} sub={signedMoney(m.avg_loss)} />
        <StatCard label="Avg per trade" value={signedMoney(m.avg_trade)} sub={`${m.total_trades} trades`} />
        <StatCard label="Largest win / loss" value={signedMoney(m.largest_win)} sub={signedMoney(m.largest_loss)} />
      </StatGrid>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Section title="Equity curve">
          {equity ? <EquityChart points={equity.points} baseline={equity.initial_capital} /> : null}
          <Typography variant="caption" color="text.secondary">Basis: {equity?.basis}</Typography>
        </Section>
        <Section title="Drawdown">{equity ? <DrawdownChart points={equity.points} height={280} /> : null}</Section>
        <Section title="Daily P&L (IST exit date)"><PnlBarChart data={s.daily} xKey="date" /></Section>
        <Section title="Monthly P&L"><PnlBarChart data={s.monthly} xKey="month" /></Section>
        <Section title="Win / loss distribution (net P&L per trade)"><DistributionChart buckets={s.distribution} /></Section>
        <Section title="CALL vs PUT">
          <GroupBarChart data={s.by_option_side} height={160} />
          <DataTable rows={s.by_option_side} rowKey={(g) => g.group} columns={groupColumns('Side')} />
        </Section>
      </Box>
      <Section title="By strategy version"><DataTable rows={s.by_strategy_version} rowKey={(g) => g.group} columns={groupColumns('Version')} /></Section>
      <Section title={s.scope === 'paper' ? 'By paper session' : 'By backtest run'}><DataTable rows={s.by_run} rowKey={(g) => g.group} columns={groupColumns('Run')} /></Section>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Section title="By exit reason"><DataTable rows={s.by_exit_reason} rowKey={(g) => g.group} columns={groupColumns('Exit reason')} /></Section>
        <Section title="By expiry"><DataTable rows={s.by_expiry} rowKey={(g) => g.group} columns={groupColumns('Expiry')} /></Section>
      </Box>
      <Section title="Cost breakdown">
        <StatGrid>
          <StatCard label="Gross P&L" value={signedMoney(s.costs.gross_pnl)} color={pnlColor(s.costs.gross_pnl)} />
          <StatCard label="Entry charges" value={money(s.costs.entry_charges)} />
          <StatCard label="Exit charges" value={money(s.costs.exit_charges)} />
          <StatCard label="Slippage" value={money(s.costs.slippage)} />
          <StatCard label="Net P&L" value={signedMoney(s.costs.net_pnl)} color={pnlColor(s.costs.net_pnl)} sub="Gross − charges − slippage" />
        </StatGrid>
      </Section>
      <Section title="Top instruments"><DataTable rows={s.by_instrument} rowKey={(g) => g.group} columns={groupColumns('Contract')} pageSize={15} /></Section>
    </>
  );
}
