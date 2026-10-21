import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { PaperOrder, PaperPosition, SignalRecord, SystemEvent } from '../../types/api';
import { dateTime, humanize, number } from '../../utils/format';
import DataTable, { type Column } from './DataTable';
import { JsonBlock, Pnl } from './Layout';
import { SeverityChip, StatusChip } from './StatusChips';

export function SignalsTable({ signals, maxHeight, pageSize }: { signals: SignalRecord[]; maxHeight?: number; pageSize?: number }) {
  const [selected, setSelected] = useState<SignalRecord | null>(null);
  const columns: Column<SignalRecord>[] = [
    { key: 'ts', label: 'Decision time (IST)', render: (s) => dateTime(s.ts) },
    { key: 'action', label: 'Signal', render: (s) => humanize(s.action) },
    { key: 'ref', label: 'Underlying', align: 'right', render: (s) => number(s.reference_price) },
    { key: 'outcome', label: 'Outcome', render: (s) => <StatusChip status={s.outcome} /> },
    { key: 'reason', label: 'Why', render: (s) => <Typography variant="body2" sx={{ whiteSpace: 'normal', maxWidth: 480 }}>{s.outcome_reason ?? (s.explanation?.text as string) ?? '—'}</Typography> },
  ];
  return (
    <>
      <DataTable rows={signals} columns={columns} rowKey={(s) => s.id} empty="No signals yet" maxHeight={maxHeight} pageSize={pageSize} onRowClick={setSelected} />
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Signal explanation</DialogTitle>
        <DialogContent>
          {selected && <JsonBlock value={{ signal_id: selected.signal_id, candle: selected.candle, explanation: selected.explanation, outcome: selected.outcome, reason: selected.outcome_reason, details: selected.details }} maxHeight={520} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OrdersTable({ orders, maxHeight }: { orders: PaperOrder[]; maxHeight?: number }) {
  const columns: Column<PaperOrder>[] = [
    { key: 'created', label: 'Created (IST)', render: (o) => dateTime(o.created_at) },
    { key: 'symbol', label: 'Contract', render: (o) => o.tradingsymbol },
    { key: 'side', label: 'Side', render: (o) => o.side },
    { key: 'type', label: 'Type', render: (o) => `${o.order_type}${o.trigger_price ? ` @${number(o.trigger_price)}` : ''}${o.limit_price ? ` @${number(o.limit_price)}` : ''}` },
    { key: 'purpose', label: 'Purpose', render: (o) => (o.exit_reason ? humanize(o.exit_reason) : humanize(o.purpose)) },
    { key: 'qty', label: 'Qty', align: 'right', render: (o) => `${o.filled_quantity}/${o.quantity}` },
    { key: 'fill', label: 'Avg fill', align: 'right', render: (o) => number(o.average_fill_price) },
    { key: 'status', label: 'Status', render: (o) => <StatusChip status={o.status} tooltip={o.rejection_reason} /> },
  ];
  return <DataTable rows={orders} columns={columns} rowKey={(o) => o.id} empty="No simulated orders" maxHeight={maxHeight} />;
}

export function PositionsTable({ positions, maxHeight }: { positions: PaperPosition[]; maxHeight?: number }) {
  const columns: Column<PaperPosition>[] = [
    { key: 'symbol', label: 'Contract', render: (p) => p.tradingsymbol },
    { key: 'dir', label: 'Dir', render: (p) => p.direction },
    { key: 'qty', label: 'Qty', align: 'right', render: (p) => p.net_quantity },
    { key: 'avg', label: 'Avg entry', align: 'right', render: (p) => number(p.average_entry_price) },
    { key: 'last', label: 'Last', align: 'right', render: (p) => number(p.last_price) },
    { key: 'sl', label: 'Stop', align: 'right', render: (p) => number(p.stop_loss) },
    { key: 'tp', label: 'Target', align: 'right', render: (p) => number(p.take_profit) },
    { key: 'upnl', label: 'Unrealized', align: 'right', render: (p) => <Pnl value={p.status === 'OPEN' ? p.unrealized_pnl : null} /> },
    { key: 'opened', label: 'Opened (IST)', render: (p) => dateTime(p.opened_at) },
    { key: 'status', label: 'Status', render: (p) => <StatusChip status={p.status} /> },
  ];
  return <DataTable rows={positions} columns={columns} rowKey={(p) => p.id} empty="No open simulated positions" maxHeight={maxHeight} />;
}

export function EventsTable({ events, maxHeight }: { events: SystemEvent[]; maxHeight?: number }) {
  const [selected, setSelected] = useState<SystemEvent | null>(null);
  const columns: Column<SystemEvent>[] = [
    { key: 'ts', label: 'Time (IST)', render: (e) => dateTime(e.ts) },
    { key: 'sev', label: 'Severity', render: (e) => <SeverityChip severity={e.severity} /> },
    { key: 'type', label: 'Event', render: (e) => e.event_type },
    { key: 'component', label: 'Component', render: (e) => e.component },
    { key: 'msg', label: 'Message', render: (e) => <Typography variant="body2" sx={{ whiteSpace: 'normal', maxWidth: 560 }}>{e.message}</Typography> },
  ];
  return (
    <>
      <DataTable rows={events} columns={columns} rowKey={(e) => e.id} empty="No events" maxHeight={maxHeight} onRowClick={setSelected} />
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>{selected?.event_type}</DialogTitle>
        <DialogContent>{selected && <JsonBlock value={selected} />}</DialogContent>
      </Dialog>
    </>
  );
}
