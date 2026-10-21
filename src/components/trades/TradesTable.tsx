import { useState } from 'react';
import { Box, Chip, Dialog, DialogContent, DialogTitle, Stack, Tooltip, Typography } from '@mui/material';
import type { Trade } from '../../types/api';
import { dateOnly, dateTime, humanize, money, number } from '../../utils/format';
import DataTable, { type Column } from '../common/DataTable';
import { JsonBlock, Pnl } from '../common/Layout';

function contractLabel(t: Trade) {
  if (t.instrument_type === 'CE' || t.instrument_type === 'PE') return `${number(t.strike, 0)} ${t.instrument_type === 'CE' ? 'CALL' : 'PUT'}`;
  return t.instrument_type;
}

export default function TradesTable({ trades, showStrategy, maxHeight, pageSize = 50 }: { trades: Trade[]; showStrategy?: boolean; maxHeight?: number; pageSize?: number }) {
  const [selected, setSelected] = useState<Trade | null>(null);
  const columns: Column<Trade>[] = [
    { key: 'id', label: 'ID', render: (t) => `#${t.id}` },
    ...(showStrategy
      ? [
          { key: 'strategy', label: 'Strategy', render: (t: Trade) => `${t.strategy_name ?? '—'} v${t.version_number ?? '?'}` },
          { key: 'source', label: 'Source', render: (t: Trade) => (t.paper_session_id ? `Paper #${t.paper_session_id}` : `Backtest #${t.backtest_run_id}`) },
        ]
      : []),
    { key: 'symbol', label: 'Contract', render: (t) => <Tooltip title={t.instrument_key}><span>{t.tradingsymbol}</span></Tooltip> },
    { key: 'type', label: 'Strike / type', render: contractLabel },
    { key: 'expiry', label: 'Expiry', render: (t) => dateOnly(t.expiry) },
    { key: 'direction', label: 'Dir', render: (t) => t.direction },
    { key: 'entry_ts', label: 'Entry (IST)', render: (t) => dateTime(t.entry_ts) },
    { key: 'entry_price', label: 'Entry', align: 'right', render: (t) => number(t.entry_price) },
    { key: 'exit_ts', label: 'Exit (IST)', render: (t) => dateTime(t.exit_ts) },
    { key: 'exit_price', label: 'Exit', align: 'right', render: (t) => number(t.exit_price) },
    { key: 'qty', label: 'Qty', align: 'right', render: (t) => `${t.quantity} (${number(t.lots, 0)}×${t.lot_size})` },
    { key: 'gross', label: 'Gross', align: 'right', render: (t) => <Pnl value={t.gross_pnl} /> },
    { key: 'costs', label: 'Costs', align: 'right', render: (t) => money(t.entry_charges + t.exit_charges) },
    { key: 'slip', label: 'Slippage', align: 'right', render: (t) => money(t.slippage_cost) },
    { key: 'net', label: 'Net', align: 'right', render: (t) => <Pnl value={t.net_pnl} bold /> },
    {
      key: 'reason',
      label: 'Exit reason',
      render: (t) => (
        <Stack direction="row" spacing={0.5}>
          <span>{humanize(t.exit_reason)}</span>
          {t.flags?.includes('AMBIGUOUS_INTRABAR') && <Chip size="small" color="warning" label="ambiguous" />}
          {t.flags?.includes('GAP_THROUGH_STOP') && <Chip size="small" color="warning" label="gap" />}
          {t.flags?.includes('FORCED_AT_LAST_KNOWN_PRICE') && <Chip size="small" color="warning" label="last price" />}
        </Stack>
      ),
    },
  ];
  return (
    <>
      <DataTable rows={trades} columns={columns} rowKey={(t) => `${t.scope ?? ''}${t.id}`} empty="No closed trades" maxHeight={maxHeight} pageSize={pageSize} onRowClick={setSelected} />
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Trade #{selected?.id} · {selected?.tradingsymbol}</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Entry reference {number(selected.entry_ref_price)} → fill {number(selected.entry_price)}; exit reference {number(selected.exit_ref_price)} → fill{' '}
                {number(selected.exit_price)}. Gross P&L uses reference prices; slippage is the gap between reference and fill prices.
              </Typography>
              <Typography variant="subtitle2">Execution flags</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>{selected.flags?.join(', ') || 'none'}</Typography>
              <Typography variant="subtitle2">Signal, contract selection and assumptions</Typography>
              <JsonBlock value={selected.details} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
