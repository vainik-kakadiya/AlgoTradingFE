import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, Chip, LinearProgress, Link, Stack, Tab, Tabs, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { BacktestDetail } from '../types/api';
import { dateOnly, dateTime, humanize, money, pct, pnlColor, profitFactor, signedMoney } from '../utils/format';
import { JsonBlock, PageHeader, QueryView, Section, StatCard, StatGrid } from '../components/common/Layout';
import { StatusChip } from '../components/common/StatusChips';
import { DrawdownChart, EquityChart } from '../components/charts/Charts';
import TradesTable from '../components/trades/TradesTable';
import { SignalsTable } from '../components/common/RecordTables';
import DataTable from '../components/common/DataTable';

export default function BacktestDetailPage() {
  const id = Number(useParams().id);
  const run = useQuery({
    queryKey: ['backtests', id],
    queryFn: () => api.backtest(id),
    refetchInterval: (q) => (q.state.data && ['RUNNING', 'QUEUED'].includes(q.state.data.status) ? 1500 : false),
  });
  return <QueryView query={run}>{(r) => <BacktestView run={r} />}</QueryView>;
}

function BacktestView({ run }: { run: BacktestDetail }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const done = run.status === 'COMPLETED';
  const trades = useQuery({ queryKey: ['backtests', run.id, 'trades'], queryFn: () => api.backtestTrades(run.id), enabled: done });
  const equity = useQuery({ queryKey: ['backtests', run.id, 'equity'], queryFn: () => api.backtestEquity(run.id), enabled: done });
  const signals = useQuery({ queryKey: ['backtests', run.id, 'signals'], queryFn: () => api.backtestSignals(run.id), enabled: done && tab === 1 });
  const cancel = useMutation({ mutationFn: () => api.cancelBacktest(run.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backtests'] }) });
  const report = run.report;
  const m = report?.metrics;

  return (
    <>
      <PageHeader
        title={`Backtest #${run.id}${run.name ? ` · ${run.name}` : ''}`}
        subtitle={`${run.strategy_name} v${run.version_number} on “${run.dataset_name}” · ${run.start_date ? dateOnly(run.start_date) : 'start'} → ${run.end_date ? dateOnly(run.end_date) : 'end'} · config ${run.config_hash.slice(0, 12)}`}
        actions={
          <>
            <StatusChip status={run.status} />
            {['RUNNING', 'QUEUED'].includes(run.status) && <Button color="error" size="small" onClick={() => cancel.mutate()}>Cancel</Button>}
            {done && <Button size="small" startIcon={<DownloadIcon />} href={`/api/backtests/${run.id}/trades.csv`}>Trades CSV</Button>}
          </>
        }
      />
      {['RUNNING', 'QUEUED'].includes(run.status) && <LinearProgress variant="determinate" value={run.progress * 100} sx={{ mb: 2 }} />}
      {run.status === 'FAILED' && <Alert severity="error" sx={{ mb: 2 }}><AlertTitle>Backtest failed</AlertTitle>{run.error}</Alert>}
      {report && report.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Warnings and limitations</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</Box>
        </Alert>
      )}
      {m && (
        <StatGrid>
          <StatCard label="Net P&L" value={signedMoney(m.net_pnl)} color={pnlColor(m.net_pnl)} sub={`Gross ${signedMoney(m.gross_pnl)}`} />
          <StatCard label="Net return" value={pct(m.return_pct)} sub={`on ${money(run.initial_capital)} configured capital`} tooltip="Net P&L / configured initial capital. Not return on margin or premium." />
          <StatCard label="Win rate" value={pct(m.win_rate)} sub={`${m.wins}W / ${m.losses}L / ${m.breakeven} BE`} />
          <StatCard label="Profit factor" value={profitFactor(m.profit_factor, m.profit_factor_state)} />
          <StatCard label="Max drawdown" value={money(m.max_drawdown)} sub={pct(m.max_drawdown_pct)} />
          <StatCard label="Trades" value={m.total_trades} sub={`avg ${signedMoney(m.avg_trade)}`} />
          <StatCard label="Charges" value={money(m.total_charges)} />
          <StatCard label="Slippage" value={money(m.total_slippage)} />
          <StatCard label="Largest win / loss" value={<>{signedMoney(m.largest_win)}</>} sub={signedMoney(m.largest_loss)} />
        </StatGrid>
      )}
      {done && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2 }}>
          <Section title="Equity curve (mark-to-market)">
            <QueryView query={equity}>{(pts) => <EquityChart points={pts} baseline={run.initial_capital} />}</QueryView>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Drawdown</Typography>
            <QueryView query={equity}>{(pts) => <DrawdownChart points={pts} height={160} />}</QueryView>
          </Section>
          <Box>
            <Section title="Signals & exits">
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {Object.entries(report?.signals ?? {}).map(([k, v]) => <Chip key={k} size="small" label={`${humanize(k)}: ${v}`} />)}
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {Object.entries(report?.exit_reasons ?? {}).map(([k, v]) => <Chip key={k} size="small" variant="outlined" label={`${humanize(k)}: ${v}`} />)}
              </Stack>
            </Section>
            <Section title="Data quality">
              <DataTable rows={Object.entries(report?.data_quality ?? {})} rowKey={([k]) => k}
                columns={[{ key: 'k', label: 'Check', render: ([k]) => humanize(k) }, { key: 'v', label: 'Value', align: 'right', render: ([, v]) => String(v) }]} />
            </Section>
          </Box>
        </Box>
      )}
      {done && (
        <Section>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
            <Tab label={`Trades (${m?.total_trades ?? 0})`} />
            <Tab label="Signals" />
            <Tab label="Assumptions & configuration" />
            <Tab label="Engine events" />
          </Tabs>
          {tab === 0 && <QueryView query={trades}>{(t) => <TradesTable trades={t} />}</QueryView>}
          {tab === 1 && <QueryView query={signals}>{(s) => <SignalsTable signals={s} pageSize={50} />}</QueryView>}
          {tab === 2 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="subtitle2">Execution assumptions</Typography>
                <Box component="ul" sx={{ mt: 0.5, pl: 2.5 }}>{report?.execution_assumptions.map((a, i) => <li key={i}><Typography variant="body2">{a}</Typography></li>)}</Box>
                <Typography variant="subtitle2">Dataset</Typography>
                <JsonBlock value={report?.dataset} maxHeight={240} />
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Costs</Typography>
                <JsonBlock value={run.cost_config} maxHeight={240} />
              </Box>
              <Box>
                <Typography variant="subtitle2">Strategy configuration (exact snapshot)</Typography>
                <JsonBlock value={run.strategy_config} maxHeight={520} />
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Execution model</Typography>
                <JsonBlock value={run.execution_config} maxHeight={200} />
              </Box>
            </Box>
          )}
          {tab === 3 && (
            <DataTable rows={report?.events ?? []} rowKey={(e) => `${e.ts}-${e.event_type}-${e.message}`} maxHeight={480} empty="No notable engine events"
              columns={[
                { key: 'ts', label: 'Market time (IST)', render: (e) => dateTime(e.ts) },
                { key: 'type', label: 'Event', render: (e) => e.event_type },
                { key: 'msg', label: 'Message', render: (e) => <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>{e.message}</Typography> },
              ]} />
          )}
        </Section>
      )}
      <Typography variant="caption" color="text.secondary">
        Simulated historical results. A profitable backtest does not guarantee future performance. <Link href="/analytics">Compare in Analytics</Link>
      </Typography>
    </>
  );
}
