import { useState } from 'react';
import { Alert, Box, Button, Chip, MenuItem, Stack, TablePagination, TextField, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { dateOnly, number } from '../utils/format';
import { PageHeader, QueryView, Section } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';

const PAGE = 100;

export default function InstrumentsPage() {
  const queryClient = useQueryClient();
  const [underlying, setUnderlying] = useState('NIFTY');
  const [type, setType] = useState('');
  const [expiry, setExpiry] = useState('');
  const [q, setQ] = useState('');
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [page, setPage] = useState(0);

  const kite = useQuery({ queryKey: ['kite'], queryFn: api.kiteStatus });
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const params = { underlying: underlying || undefined, instrument_type: type || undefined, expiry: expiry || undefined, q: q || undefined, dataset_id: datasetId === '' ? undefined : datasetId, limit: PAGE, offset: page * PAGE };
  const instruments = useQuery({ queryKey: ['instruments', params], queryFn: () => api.instruments(params), placeholderData: keepPreviousData });
  const expiries = useQuery({
    queryKey: ['instruments', 'expiries', underlying, datasetId],
    queryFn: () => api.expiries({ underlying, dataset_id: datasetId === '' ? undefined : datasetId }),
    enabled: Boolean(underlying),
  });
  const refresh = useMutation({ mutationFn: api.refreshInstruments, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instruments'] }) });

  return (
    <>
      <PageHeader
        title="Instruments"
        subtitle="Contract metadata from the Kite instrument master (dated snapshots) or from imported datasets. Tokens are only valid within their snapshot."
        actions={
          <Button startIcon={<RefreshIcon />} variant="contained" disabled={!kite.data?.authenticated || refresh.isPending} onClick={() => refresh.mutate()}>
            {refresh.isPending ? 'Refreshing…' : 'Refresh from Kite'}
          </Button>
        }
      />
      {!kite.data?.authenticated && <Alert severity="info" sx={{ mb: 2 }}>Log in to Kite (Settings) to download today's instrument master snapshot.</Alert>}
      {refresh.isError && <Alert severity="error" sx={{ mb: 2 }}>{(refresh.error as Error).message}</Alert>}
      {refresh.data && <Alert severity="success" sx={{ mb: 2 }}>Stored {refresh.data.stored} contracts in snapshot {refresh.data.source_ref}.</Alert>}

      <Section>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField size="small" select label="Source" value={datasetId} onChange={(e) => { setDatasetId(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); setExpiry(''); }} sx={{ minWidth: 220 }}>
            <MenuItem value="">Latest Kite snapshot</MenuItem>
            {(datasets.data ?? []).map((d) => <MenuItem key={d.id} value={d.id}>Dataset #{d.id} · {d.name}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Underlying" value={underlying} onChange={(e) => { setUnderlying(e.target.value); setPage(0); setExpiry(''); }} sx={{ minWidth: 140 }}>
            <MenuItem value="">Any</MenuItem>
            {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} sx={{ minWidth: 120 }}>
            <MenuItem value="">Any</MenuItem>
            {['INDEX', 'FUT', 'CE', 'PE'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Expiry" value={expiry} onChange={(e) => { setExpiry(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
            <MenuItem value="">Any</MenuItem>
            {(expiries.data?.expiries ?? []).map((x) => <MenuItem key={x.expiry} value={x.expiry}>{dateOnly(x.expiry)}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Search symbol" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </Stack>
        {expiries.data && expiries.data.expiries.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Listed expiries</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {expiries.data.expiries.slice(0, 16).map((x) => (
                <Chip key={x.expiry} size="small" variant={expiry === x.expiry ? 'filled' : 'outlined'} onClick={() => setExpiry(x.expiry)}
                  label={`${dateOnly(x.expiry)} · ${Object.entries(x.counts).map(([k, v]) => `${v} ${k}`).join(', ')}`} />
              ))}
            </Stack>
          </Box>
        )}
        <QueryView query={instruments}>
          {(data) => (
            <>
              <Typography variant="caption" color="text.secondary">{data.snapshot && datasetId === '' ? `Snapshot ${data.snapshot}` : ''}</Typography>
              <DataTable
                rows={data.items}
                rowKey={(i) => i.id}
                empty="No instruments match"
                emptyHint={datasetId === '' ? 'Refresh the Kite instrument master or choose an imported dataset.' : undefined}
                columns={[
                  { key: 'symbol', label: 'Trading symbol', render: (i) => i.tradingsymbol },
                  { key: 'exchange', label: 'Exchange', render: (i) => `${i.exchange}${i.segment ? ` / ${i.segment}` : ''}` },
                  { key: 'type', label: 'Type', render: (i) => i.instrument_type },
                  { key: 'underlying', label: 'Underlying', render: (i) => i.underlying ?? '—' },
                  { key: 'strike', label: 'Strike', align: 'right', render: (i) => number(i.strike, 0) },
                  { key: 'expiry', label: 'Expiry', render: (i) => dateOnly(i.expiry) },
                  { key: 'lot', label: 'Lot', align: 'right', render: (i) => i.lot_size },
                  { key: 'tick', label: 'Tick', align: 'right', render: (i) => i.tick_size },
                  { key: 'token', label: 'Token', render: (i) => i.instrument_token ?? '—' },
                  { key: 'snapshot', label: 'Snapshot', render: (i) => i.source_ref },
                ]}
              />
              <TablePagination component="div" count={data.total} page={page} rowsPerPage={PAGE} rowsPerPageOptions={[PAGE]} onPageChange={(_, p) => setPage(p)} />
            </>
          )}
        </QueryView>
      </Section>
    </>
  );
}
