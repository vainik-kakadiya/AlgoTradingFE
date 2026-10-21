import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { dateTime, money, pct } from '../utils/format';
import { PageHeader, Pnl, QueryView, Section } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';
import { StatusChip } from '../components/common/StatusChips';
import AssumptionsForm from '../components/backtests/AssumptionsForm';
import VersionPicker from '../components/strategies/VersionPicker';
import { useAssumptionDefaults } from '../hooks/useDefaults';

export default function BacktestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const initialVersion = params.get('version') ? Number(params.get('version')) : undefined;
  const runs = useQuery({
    queryKey: ['backtests'],
    queryFn: () => api.backtests(),
    refetchInterval: (q) => (q.state.data?.some((r) => r.status === 'RUNNING' || r.status === 'QUEUED') ? 2000 : false),
  });
  const cancel = useMutation({ mutationFn: api.cancelBacktest, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backtests'] }) });

  return (
    <>
      <PageHeader title="Backtesting" subtitle="Chronological replay of historical data through the same strategy, risk and execution logic used for paper trading." />
      <NewBacktestForm initialVersion={initialVersion} onCreated={(id) => navigate(`/backtests/${id}`)} />
      <Section title="Backtest runs">
        <QueryView query={runs}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              empty="No backtests yet"
              onRowClick={(r) => navigate(`/backtests/${r.id}`)}
              columns={[
                { key: 'id', label: 'ID', render: (r) => `#${r.id}` },
                { key: 'strategy', label: 'Strategy', render: (r) => `${r.strategy_name} v${r.version_number}` },
                { key: 'dataset', label: 'Dataset', render: (r) => r.dataset_name },
                { key: 'status', label: 'Status', render: (r) => (
                  <Box sx={{ minWidth: 110 }}>
                    <StatusChip status={r.status} tooltip={r.error} />
                    {(r.status === 'RUNNING' || r.status === 'QUEUED') && <LinearProgress variant="determinate" value={r.progress * 100} sx={{ mt: 0.5 }} />}
                  </Box>
                ) },
                { key: 'trades', label: 'Trades', align: 'right', render: (r) => r.total_trades ?? '—' },
                { key: 'net', label: 'Net P&L', align: 'right', render: (r) => <Pnl value={r.net_pnl} bold /> },
                { key: 'ret', label: 'Return', align: 'right', render: (r) => pct(r.return_pct) },
                { key: 'win', label: 'Win rate', align: 'right', render: (r) => pct(r.win_rate) },
                { key: 'dd', label: 'Max DD', align: 'right', render: (r) => money(r.max_drawdown) },
                { key: 'created', label: 'Created (IST)', render: (r) => dateTime(r.created_at) },
                { key: 'actions', label: '', render: (r) => (r.status === 'RUNNING' || r.status === 'QUEUED' ? (
                  <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); cancel.mutate(r.id); }}>Cancel</Button>
                ) : null) },
              ]}
            />
          )}
        </QueryView>
      </Section>
    </>
  );
}

function NewBacktestForm({ initialVersion, onCreated }: { initialVersion?: number; onCreated: (id: number) => void }) {
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const { costs, execution, setCosts, setExecution } = useAssumptionDefaults();
  const [versionId, setVersionId] = useState<number | ''>('');
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [capital, setCapital] = useState(200000);
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => api.createBacktest({
      strategy_version_id: Number(versionId), dataset_id: Number(datasetId), name: name || undefined,
      start_date: start || undefined, end_date: end || undefined, initial_capital: capital, costs: costs!, execution: execution!,
    }),
    onSuccess: (r) => onCreated(r.id),
  });
  const dataset = datasets.data?.find((d) => d.id === datasetId);

  return (
    <Section title="New backtest">
      <Stack spacing={2}>
        <VersionPicker versionId={versionId} onChange={setVersionId} initialVersionId={initialVersion} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField size="small" select label="Historical dataset" value={datasetId} onChange={(e) => setDatasetId(Number(e.target.value))} sx={{ minWidth: 280 }}>
            {(datasets.data ?? []).filter((d) => d.status === 'READY').map((d) => (
              <MenuItem key={d.id} value={d.id}>#{d.id} {d.name} · {d.interval_seconds < 60 ? `${d.interval_seconds}s` : `${d.interval_seconds / 60}m`}{d.is_synthetic ? ' · SYNTHETIC' : ''}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="date" label="From (optional)" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField size="small" type="date" label="To (optional)" InputLabelProps={{ shrink: true }} value={end} onChange={(e) => setEnd(e.target.value)} />
          <TextField size="small" type="number" label="Initial capital (₹)" value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
          <TextField size="small" label="Run name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        </Stack>
        {dataset?.is_synthetic && <Alert severity="warning">This dataset is synthetic. Its results do not describe real market behaviour.</Alert>}
        {dataset && (
          <Typography variant="caption" color="text.secondary">
            Dataset covers {dateTime(dataset.start_time)} → {dateTime(dataset.end_time)}. Instruments and expiries are resolved only from contracts listed in the dataset at each simulated date.
            Use separate date ranges for development, validation and final out-of-sample evaluation.
          </Typography>
        )}
        {costs && execution && <Box><AssumptionsForm costs={costs} execution={execution} onCosts={setCosts} onExecution={setExecution} /></Box>}
        {create.isError && <Alert severity="error">{(create.error as Error).message}</Alert>}
        <Box>
          <Button variant="contained" disabled={versionId === '' || datasetId === '' || !costs || create.isPending} onClick={() => create.mutate()}>Run backtest</Button>
        </Box>
      </Stack>
    </Section>
  );
}
