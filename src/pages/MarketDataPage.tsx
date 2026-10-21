import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Dataset, FeedStatus, QuoteStatus } from '../types/api';
import { dateTime, humanize, number } from '../utils/format';
import { JsonBlock, PageHeader, QueryView, Section, StatCard, StatGrid } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';
import { StatusChip } from '../components/common/StatusChips';
import CandleChart from '../components/charts/CandleChart';
import { useLiveStore } from '../store/liveStore';

export default function MarketDataPage() {
  const status = useQuery({ queryKey: ['feed'], queryFn: api.feedStatus, refetchInterval: 3000 });
  const liveFeed = useLiveStore((s) => s.feed);
  const feed = liveFeed && status.data ? { ...status.data, ...liveFeed } : status.data;
  return (
    <>
      <PageHeader title="Market Data" subtitle="Feed control, data quality, captured candles and historical datasets." />
      {feed && <FeedPanel feed={feed} />}
      <ChartPanel />
      <DatasetsPanel />
    </>
  );
}

function FeedPanel({ feed }: { feed: FeedStatus }) {
  const queryClient = useQueryClient();
  const kite = useQuery({ queryKey: ['kite'], queryFn: api.kiteStatus });
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [speed, setSpeed] = useState(60);
  const done = () => queryClient.invalidateQueries({ queryKey: ['feed'] });
  const startKite = useMutation({ mutationFn: () => api.startFeed({ source: 'KITE' }), onSuccess: done });
  const startReplay = useMutation({
    mutationFn: () => api.startFeed({ source: 'REPLAY', dataset_id: Number(datasetId), start_date: start || undefined, end_date: end || undefined, speed }),
    onSuccess: done,
  });
  const stop = useMutation({ mutationFn: api.stopFeed, onSuccess: done });
  const error = startKite.error ?? startReplay.error ?? stop.error;
  const subs = Object.entries(feed.subscriptions ?? {}) as [string, QuoteStatus][];

  return (
    <Section title="Feed" actions={<StatusChip status={feed.status} tooltip={feed.message} />}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as Error).message}</Alert>}
      {feed.status === 'CONNECTED' && feed.stale && (
        <Alert severity="warning" sx={{ mb: 2 }}>Data is stale: no update within {feed.stale_seconds}s. New entries are blocked; a disconnect is never treated as a flat market.</Alert>
      )}
      <StatGrid>
        <StatCard label="Source" value={feed.source ?? '—'} sub={feed.message ?? undefined} />
        <StatCard label="Last market update" value={dateTime(feed.last_market_ts)} sub={feed.source === 'REPLAY' ? `Replay clock ${dateTime(feed.clock)}` : undefined} />
        <StatCard label="Ticks received" value={feed.ticks_received.toLocaleString('en-IN')} sub={`${feed.invalid_ticks} invalid`} />
        <StatCard label="Disconnects / reconnects" value={`${feed.disconnects} / ${feed.reconnects}`} />
        <StatCard label="Max processing latency" value={`${number(feed.max_batch_latency_ms)} ms`} />
      </StatGrid>
      {feed.source === 'REPLAY' && feed.replay_progress != null && <LinearProgress variant="determinate" value={feed.replay_progress * 100} sx={{ mb: 2 }} />}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Zerodha live feed</Typography>
          <Button variant="contained" disabled={!kite.data?.authenticated || startKite.isPending} onClick={() => startKite.mutate()}>Start Kite feed</Button>
          {!kite.data?.authenticated && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Log in to Kite in Settings first.</Typography>}
        </Box>
        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, flexGrow: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Replay a dataset as a simulated live feed</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <TextField size="small" select label="Dataset" value={datasetId} onChange={(e) => setDatasetId(Number(e.target.value))} sx={{ minWidth: 220 }}>
              {(datasets.data ?? []).map((d) => <MenuItem key={d.id} value={d.id}>#{d.id} {d.name}{d.is_synthetic ? ' (synthetic)' : ''}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={start} onChange={(e) => setStart(e.target.value)} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={end} onChange={(e) => setEnd(e.target.value)} />
            <TextField size="small" type="number" label="Speed (×)" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} sx={{ width: 110 }} />
            <Button variant="outlined" disabled={datasetId === '' || startReplay.isPending} onClick={() => startReplay.mutate()}>Start replay</Button>
          </Stack>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button color="error" variant="outlined" disabled={!feed.source || feed.status === 'DISCONNECTED'} onClick={() => stop.mutate()}>Stop feed</Button>
        </Box>
      </Stack>
      <Typography variant="subtitle2" gutterBottom>Subscribed instruments</Typography>
      <DataTable
        rows={subs}
        rowKey={([k]) => k}
        empty="No subscriptions"
        emptyHint="Paper sessions subscribe to their underlying and selected contracts automatically."
        columns={[
          { key: 'k', label: 'Instrument', render: ([k]) => k },
          { key: 'ltp', label: 'LTP', align: 'right', render: ([, q]) => number(q.ltp) },
          { key: 'bid', label: 'Bid', align: 'right', render: ([, q]) => number(q.bid) },
          { key: 'ask', label: 'Ask', align: 'right', render: ([, q]) => number(q.ask) },
          { key: 'ts', label: 'Last update (IST)', render: ([, q]) => dateTime(q.ts) },
          { key: 'age', label: 'Age', align: 'right', render: ([, q]) => (q.age_seconds == null ? '—' : `${number(q.age_seconds)}s`) },
          { key: 'stale', label: 'Freshness', render: ([, q]) => <Chip size="small" color={q.stale ? 'warning' : 'success'} label={q.stale ? 'stale' : 'fresh'} /> },
          { key: 'ticks', label: 'Ticks', align: 'right', render: ([, q]) => q.ticks },
          { key: 'gaps', label: 'Gaps', align: 'right', render: ([, q]) => q.gaps },
        ]}
      />
    </Section>
  );
}

function ChartPanel() {
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const [key, setKey] = useState('NSE:NIFTY 50');
  const [interval, setBarInterval] = useState(180);
  const [source, setSource] = useState<string>('LIVE');
  const params = source === 'LIVE'
    ? { instrument_key: key, interval_seconds: interval, source: 'LIVE', limit: 1000 }
    : { instrument_key: key, interval_seconds: interval, dataset_id: Number(source), limit: 1000 };
  const candles = useQuery({ queryKey: ['candles', params], queryFn: () => api.candles(params), refetchInterval: source === 'LIVE' ? 15000 : false });
  return (
    <Section title="Candles">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField size="small" label="Instrument (EXCHANGE:SYMBOL)" value={key} onChange={(e) => setKey(e.target.value)} sx={{ minWidth: 260 }} />
        <TextField size="small" select label="Interval" value={interval} onChange={(e) => setBarInterval(Number(e.target.value))}>
          {[1, 60, 180, 300, 900].map((i) => <MenuItem key={i} value={i}>{i < 60 ? `${i}s` : `${i / 60}m`}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Source" value={source} onChange={(e) => setSource(e.target.value)} sx={{ minWidth: 240 }}>
          <MenuItem value="LIVE">Captured live data</MenuItem>
          {(datasets.data ?? []).map((d) => <MenuItem key={d.id} value={String(d.id)}>Dataset #{d.id} {d.name}</MenuItem>)}
        </TextField>
      </Stack>
      <QueryView query={candles}>{(d) => <CandleChart candles={d.items} />}</QueryView>
      <Typography variant="caption" color="text.secondary">Grey candles are incomplete (feed gap, partial observation or missing source bars) and are never used for signals.</Typography>
    </Section>
  );
}

function DatasetsPanel() {
  const queryClient = useQueryClient();
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const [dialog, setDialog] = useState<'import' | 'kite' | 'capture' | null>(null);
  const [detail, setDetail] = useState<Dataset | null>(null);
  const remove = useMutation({ mutationFn: api.deleteDataset, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }) });
  return (
    <Section
      title="Historical datasets"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" size="small" onClick={() => setDialog('import')}>Import CSV</Button>
          <Button variant="outlined" size="small" onClick={() => setDialog('kite')}>Download from Kite</Button>
          <Button variant="outlined" size="small" onClick={() => setDialog('capture')}>From captured data</Button>
        </Stack>
      }
    >
      {remove.isError && <Alert severity="error" sx={{ mb: 2 }}>{(remove.error as Error).message}</Alert>}
      <QueryView query={datasets}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(d) => d.id}
            empty="No datasets"
            emptyHint="Import a CSV, download index/option history from Kite, or snapshot captured live bars."
            onRowClick={setDetail}
            columns={[
              { key: 'id', label: 'ID', render: (d) => `#${d.id}` },
              { key: 'name', label: 'Name', render: (d) => d.name },
              { key: 'source', label: 'Source', render: (d) => <Stack direction="row" spacing={0.5}><span>{humanize(d.source)}</span>{d.is_synthetic && <Chip size="small" color="warning" label="SYNTHETIC" />}</Stack> },
              { key: 'interval', label: 'Granularity', render: (d) => (d.interval_seconds < 60 ? `${d.interval_seconds}s` : `${d.interval_seconds / 60}m`) },
              { key: 'range', label: 'Range (IST)', render: (d) => `${dateTime(d.start_time)} → ${dateTime(d.end_time)}` },
              { key: 'rows', label: 'Bars', align: 'right', render: (d) => d.row_count.toLocaleString('en-IN') },
              { key: 'quality', label: 'Quality', render: (d) => {
                const q = (d.quality_summary ?? {}) as Record<string, number>;
                return `${q.rejected_rows ?? 0} rejected · ${q.missing_intervals ?? q.incomplete_bars ?? 0} missing`;
              } },
              { key: 'status', label: 'Status', render: (d) => <StatusChip status={d.status} /> },
              { key: 'del', label: '', render: (d) => <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete dataset #${d.id}?`)) remove.mutate(d.id); }}>Delete</Button> },
            ]}
          />
        )}
      </QueryView>
      <ImportDialog open={dialog === 'import'} onClose={() => setDialog(null)} />
      <KiteFetchDialog open={dialog === 'kite'} onClose={() => setDialog(null)} />
      <CaptureDialog open={dialog === 'capture'} onClose={() => setDialog(null)} />
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>Dataset #{detail?.id} · {detail?.name}</DialogTitle>
        <DialogContent>
          {detail?.is_synthetic && <Alert severity="warning" sx={{ mb: 2 }}>Synthetic data: generated, not observed market prices.</Alert>}
          {detail && <JsonBlock value={{ source: detail.source, source_label: detail.source_label, checksum: detail.checksum, notes: detail.notes, quality: detail.quality_summary, coverage: detail.instrument_coverage }} maxHeight={520} />}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [interval, setBarInterval] = useState('');
  const [synthetic, setSynthetic] = useState(false);
  const [candles, setCandles] = useState<File | null>(null);
  const [instruments, setInstruments] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('name', name);
      if (label) form.append('source_label', label);
      if (interval) form.append('interval_seconds', interval);
      form.append('is_synthetic', String(synthetic));
      form.append('candles_file', candles!);
      if (instruments) form.append('instruments_file', instruments);
      return api.importDataset(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      onClose();
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import CSV dataset</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" variant="outlined">
            <strong>candles.csv</strong>: timestamp (bar start, IST if no offset), tradingsymbol, open, high, low, close[, exchange, volume, oi].
            <br />
            <strong>instruments.csv</strong>: tradingsymbol, exchange, instrument_type (INDEX/FUT/CE/PE)[, underlying, strike, expiry, lot_size, tick_size, listed_from]. Option backtests need prices for the actual option contracts.
          </Alert>
          <TextField size="small" label="Dataset name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField size="small" label="Data source / provenance" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Vendor X tick export, 2025-01" />
          <TextField size="small" type="number" label="Bar interval (seconds, optional)" value={interval} onChange={(e) => setBarInterval(e.target.value)} helperText="Inferred from timestamps when empty" />
          <Button variant="outlined" component="label">{candles ? candles.name : 'Choose candles.csv'}<input hidden type="file" accept=".csv" onChange={(e) => setCandles(e.target.files?.[0] ?? null)} /></Button>
          <Button variant="outlined" component="label">{instruments ? instruments.name : 'Choose instruments.csv (optional for index-only data)'}<input hidden type="file" accept=".csv" onChange={(e) => setInstruments(e.target.files?.[0] ?? null)} /></Button>
          <FormControlLabel control={<Switch checked={synthetic} onChange={(e) => setSynthetic(e.target.checked)} />} label="This is synthetic / generated data" />
          {mutation.isError && <Alert severity="error">{(mutation.error as Error).message}</Alert>}
          {mutation.isPending && <LinearProgress />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name || !candles || mutation.isPending} onClick={() => mutation.mutate()}>Import & validate</Button>
      </DialogActions>
    </Dialog>
  );
}

function KiteFetchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', underlying: 'NIFTY', from_date: '', to_date: '', interval: 'minute', option_expiry: '', strikes_each_side: 10 });
  const expiries = useQuery({ queryKey: ['instruments', 'expiries', form.underlying, ''], queryFn: () => api.expiries({ underlying: form.underlying }), enabled: open });
  const mutation = useMutation({ mutationFn: () => api.kiteFetch({ ...form, option_expiry: form.option_expiry || undefined }) });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Download history from Kite</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info" variant="outlined">Kite serves history only for currently listed contracts (no expired options) and no native one-second candles. Requires the historical-data add-on.</Alert>
          <TextField size="small" label="Dataset name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <TextField size="small" select label="Underlying" value={form.underlying} onChange={(e) => set('underlying', e.target.value)}>
            {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'].map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={form.from_date} onChange={(e) => set('from_date', e.target.value)} fullWidth />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={form.to_date} onChange={(e) => set('to_date', e.target.value)} fullWidth />
          </Stack>
          <TextField size="small" select label="Interval" value={form.interval} onChange={(e) => set('interval', e.target.value)}>
            {['minute', '3minute', '5minute', '15minute'].map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Also download options for expiry" value={form.option_expiry} onChange={(e) => set('option_expiry', e.target.value)}>
            <MenuItem value="">Index only</MenuItem>
            {(expiries.data?.expiries ?? []).map((x) => <MenuItem key={x.expiry} value={x.expiry}>{x.expiry}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="Strikes each side of the traded range" value={form.strikes_each_side} onChange={(e) => set('strikes_each_side', Number(e.target.value))} />
          {mutation.isError && <Alert severity="error">{(mutation.error as Error).message}</Alert>}
          {mutation.data && <Alert severity="success">{mutation.data.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={!form.name || !form.from_date || !form.to_date || mutation.isPending} onClick={() => mutation.mutate()}>Start download</Button>
      </DialogActions>
    </Dialog>
  );
}

function CaptureDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', from_date: '', to_date: '', interval_seconds: 1 });
  const mutation = useMutation({
    mutationFn: () => api.captureDataset(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      onClose();
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Dataset from captured live data</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">Freezes bars this application captured from the Kite feed into an immutable dataset. One-second bars enable second-level backtests.</Typography>
          <TextField size="small" label="Dataset name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
          <TextField size="small" select label="Bar interval" value={form.interval_seconds} onChange={(e) => setForm({ ...form, interval_seconds: Number(e.target.value) })}>
            <MenuItem value={1}>1 second</MenuItem>
            <MenuItem value={180}>3 minutes</MenuItem>
          </TextField>
          {mutation.isError && <Alert severity="error">{(mutation.error as Error).message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!form.name || !form.from_date || !form.to_date || mutation.isPending} onClick={() => mutation.mutate()}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}
