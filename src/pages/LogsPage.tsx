import { useState } from 'react';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ErrorAlert, Loading, PageHeader, Section } from '../components/common/Layout';
import { EventsTable } from '../components/common/RecordTables';

const COMPONENTS = ['', 'paper_trading', 'market_data', 'backtest', 'strategies', 'instruments', 'kite', 'system'];

export default function LogsPage() {
  const [severity, setSeverity] = useState('');
  const [component, setComponent] = useState('');
  const [eventType, setEventType] = useState('');
  const [sessionId, setSessionId] = useState('');
  const filters = { severity: severity || undefined, component: component || undefined, event_type: eventType || undefined, session_id: sessionId || undefined };
  const events = useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: ({ pageParam }) => api.events({ ...filters, limit: 200, before_id: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.length === 200 ? last[last.length - 1].id : undefined),
    refetchInterval: 5000,
  });
  const rows = events.data?.pages.flat() ?? [];
  return (
    <>
      <PageHeader title="System Logs" subtitle="Signals, risk blocks, data gaps, reconnects, order rejections, session changes and errors, as recorded by the backend." />
      <Section>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField size="small" select label="Min severity" value={severity} onChange={(e) => setSeverity(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Component" value={component} onChange={(e) => setComponent(e.target.value)} sx={{ minWidth: 170 }}>
            {COMPONENTS.map((c) => <MenuItem key={c} value={c}>{c || 'All'}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Event type" placeholder="e.g. RISK_BLOCK" value={eventType} onChange={(e) => setEventType(e.target.value.toUpperCase())} />
          <TextField size="small" label="Paper session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value.replace(/\D/g, ''))} sx={{ width: 150 }} />
        </Stack>
        {events.isPending ? <Loading /> : events.isError ? <ErrorAlert error={events.error} /> : <EventsTable events={rows} />}
        {events.hasNextPage && (
          <Button sx={{ mt: 1 }} onClick={() => events.fetchNextPage()} disabled={events.isFetchingNextPage}>Load older events</Button>
        )}
      </Section>
    </>
  );
}
