import { useState } from 'react';
import { Button, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { PageHeader, Pnl, QueryView, Section } from '../components/common/Layout';
import TradesTable from '../components/trades/TradesTable';

const EXIT_REASONS = ['STOP_LOSS', 'TAKE_PROFIT', 'SESSION_END', 'TIME_EXIT', 'EXIT_RULE', 'SESSION_STOPPED', 'DAILY_LOSS_LIMIT', 'RISK_EXIT', 'END_OF_DATA'];

export default function TradesPage() {
  const strategies = useQuery({ queryKey: ['strategies'], queryFn: api.strategies });
  const [scope, setScope] = useState<'paper' | 'backtest'>('paper');
  const [f, setF] = useState({ strategy_id: '', run: '', start: '', end: '', instrument_type: '', exit_reason: '', symbol: '' });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const params = {
    scope,
    strategy_id: f.strategy_id || undefined,
    backtest_id: scope === 'backtest' && f.run ? f.run : undefined,
    session_id: scope === 'paper' && f.run ? f.run : undefined,
    start: f.start || undefined,
    end: f.end || undefined,
    instrument_type: f.instrument_type || undefined,
    exit_reason: f.exit_reason || undefined,
    symbol: f.symbol || undefined,
  };
  const trades = useQuery({ queryKey: ['trades', params], queryFn: () => api.trades(params), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader
        title="Trade History"
        subtitle="Closed round-trip trades with costs, slippage and exit reasons. Click a trade for its signal explanation and execution assumptions."
        actions={<Button startIcon={<DownloadIcon />} href={api.tradesCsvUrl(params)}>Export CSV</Button>}
      />
      <Section>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
          <ToggleButtonGroup size="small" exclusive value={scope} onChange={(_, v) => v && setScope(v)}>
            <ToggleButton value="paper">Paper trading</ToggleButton>
            <ToggleButton value="backtest">Backtests</ToggleButton>
          </ToggleButtonGroup>
          <TextField size="small" select label="Strategy" value={f.strategy_id} onChange={(e) => set('strategy_id', e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">All</MenuItem>
            {(strategies.data ?? []).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
          </TextField>
          <TextField size="small" label={scope === 'paper' ? 'Session ID' : 'Backtest ID'} value={f.run} onChange={(e) => set('run', e.target.value.replace(/\D/g, ''))} sx={{ width: 120 }} />
          <TextField size="small" type="date" label="Exit from" InputLabelProps={{ shrink: true }} value={f.start} onChange={(e) => set('start', e.target.value)} />
          <TextField size="small" type="date" label="Exit to" InputLabelProps={{ shrink: true }} value={f.end} onChange={(e) => set('end', e.target.value)} />
          <TextField size="small" select label="Direction" value={f.instrument_type} onChange={(e) => set('instrument_type', e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CE">CALL</MenuItem>
            <MenuItem value="PE">PUT</MenuItem>
            <MenuItem value="FUT">Futures</MenuItem>
          </TextField>
          <TextField size="small" select label="Exit reason" value={f.exit_reason} onChange={(e) => set('exit_reason', e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            {EXIT_REASONS.map((r) => <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Contract" value={f.symbol} onChange={(e) => set('symbol', e.target.value)} />
        </Stack>
        <QueryView query={trades}>
          {(rows) => (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {rows.length} trade(s) · net <Pnl value={rows.reduce((a, t) => a + t.net_pnl, 0)} bold />
              </Typography>
              <TradesTable trades={rows} showStrategy />
            </>
          )}
        </QueryView>
      </Section>
    </>
  );
}
