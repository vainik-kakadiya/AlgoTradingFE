import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { dateTime, duration } from '../utils/format';
import { PageHeader, Pnl, QueryView, Section, SimulatedNotice } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';
import { StatusChip } from '../components/common/StatusChips';
import AssumptionsForm from '../components/backtests/AssumptionsForm';
import VersionPicker from '../components/strategies/VersionPicker';
import { useAssumptionDefaults } from '../hooks/useDefaults';

export default function PaperTradingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialVersion = params.get('version') ? Number(params.get('version')) : undefined;
  const sessions = useQuery({ queryKey: ['paper', 'sessions'], queryFn: () => api.paperSessions(), refetchInterval: 5000 });
  return (
    <>
      <PageHeader title="Paper Trading" subtitle="Strategies run on live (or replayed) market data inside the backend. Orders are simulated locally; nothing reaches Zerodha." />
      <SimulatedNotice />
      <NewSessionForm initialVersion={initialVersion} onCreated={(id) => navigate(`/paper/${id}`)} />
      <Section title="Sessions">
        <QueryView query={sessions}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(s) => s.id}
              empty="No paper sessions yet"
              onRowClick={(s) => navigate(`/paper/${s.id}`)}
              columns={[
                { key: 'id', label: 'ID', render: (s) => `#${s.id}` },
                { key: 'name', label: 'Name', render: (s) => s.name },
                { key: 'strategy', label: 'Strategy', render: (s) => `${s.strategy_name} v${s.version_number}` },
                { key: 'source', label: 'Data', render: (s) => s.data_source },
                { key: 'status', label: 'Status', render: (s) => <StatusChip status={s.status} tooltip={s.stop_reason ?? s.entries_blocked_reason} /> },
                { key: 'net', label: 'Net P&L', align: 'right', render: (s) => <Pnl value={s.net_pnl} bold /> },
                { key: 'started', label: 'Started (IST)', render: (s) => dateTime(s.started_at) },
                { key: 'duration', label: 'Duration', render: (s) => duration(s.started_at, s.stopped_at) },
              ]}
            />
          )}
        </QueryView>
      </Section>
    </>
  );
}

function NewSessionForm({ initialVersion, onCreated }: { initialVersion?: number; onCreated: (id: number) => void }) {
  const kite = useQuery({ queryKey: ['kite'], queryFn: api.kiteStatus });
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const { costs, execution, setCosts, setExecution } = useAssumptionDefaults();
  const [versionId, setVersionId] = useState<number | ''>('');
  const [source, setSource] = useState<'KITE' | 'REPLAY'>('KITE');
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [name, setName] = useState(`Paper ${new Date().toLocaleDateString('en-IN')}`);
  const [capital, setCapital] = useState(200000);
  const create = useMutation({
    mutationFn: () => api.createPaperSession({
      strategy_version_id: Number(versionId), name, initial_capital: capital, data_source: source,
      dataset_id: source === 'REPLAY' ? Number(datasetId) : undefined, costs: costs!, execution: execution!,
    }),
    onSuccess: (s) => onCreated(s.id),
  });
  return (
    <Section title="Start a paper session">
      <Stack spacing={2}>
        <VersionPicker versionId={versionId} onChange={setVersionId} initialVersionId={initialVersion} enabledOnly />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <ToggleButtonGroup size="small" exclusive value={source} onChange={(_, v) => v && setSource(v)}>
            <ToggleButton value="KITE">Live Kite data</ToggleButton>
            <ToggleButton value="REPLAY">Replay dataset</ToggleButton>
          </ToggleButtonGroup>
          {source === 'REPLAY' && (
            <TextField size="small" select label="Dataset" value={datasetId} onChange={(e) => setDatasetId(Number(e.target.value))} sx={{ minWidth: 240 }}>
              {(datasets.data ?? []).map((d) => <MenuItem key={d.id} value={d.id}>#{d.id} {d.name}</MenuItem>)}
            </TextField>
          )}
          <TextField size="small" label="Session name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField size="small" type="number" label="Initial capital (₹)" value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
        </Stack>
        {source === 'KITE' && !kite.data?.authenticated && (
          <Alert severity="info">You can start the session now; it will wait (entries blocked as stale) until you log in to Kite and start the feed on the Market Data page.</Alert>
        )}
        {source === 'REPLAY' && (
          <Typography variant="caption" color="text.secondary">
            Replay sessions only react to the replay feed (Market Data → Start replay) and never to live data. Contract selection uses the dataset's own contract list.
          </Typography>
        )}
        {costs && execution && <Box><AssumptionsForm costs={costs} execution={execution} onCosts={setCosts} onExecution={setExecution} /></Box>}
        {create.isError && <Alert severity="error">{(create.error as Error).message}</Alert>}
        <Box>
          <Button variant="contained" disabled={versionId === '' || !costs || (source === 'REPLAY' && datasetId === '') || create.isPending} onClick={() => create.mutate()}>
            Start paper session
          </Button>
        </Box>
      </Stack>
    </Section>
  );
}
