import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, Chip, Dialog, DialogContent, DialogTitle, Stack, Tab, Tabs, Typography, alpha, useTheme } from '@mui/material';
import { DataGrid, type GridColDef, type GridValidRowModel } from '@mui/x-data-grid';
import InboxIcon from '@mui/icons-material/Inbox';
import type { DashboardData, PaperOrder, PaperPosition, SignalRecord, SystemEvent } from '../../types/api';
import { dateTime, humanize, millis, number } from '../../utils/format';
import { JsonBlock, Pnl } from '../common/Layout';
import { SeverityChip, StatusChip } from '../common/StatusChips';

const ts = (field: string, headerName: string): GridColDef => ({
  field,
  headerName,
  minWidth: 170,
  flex: 1,
  type: 'number',
  align: 'left',
  headerAlign: 'left',
  valueGetter: (value: string | null) => millis(value),
  renderCell: (p) => dateTime(p.row[field]),
});

const price = (field: string, headerName: string, minWidth = 100): GridColDef => ({
  field,
  headerName,
  type: 'number',
  minWidth,
  flex: 0.7,
  valueFormatter: (value: number | null) => number(value),
});

function SideChip({ side }: { side: string }) {
  const buy = side?.toUpperCase().startsWith('B') || side?.toUpperCase() === 'LONG';
  return <Chip size="small" label={side} color={buy ? 'success' : 'error'} variant="filled" sx={{ fontWeight: 700, minWidth: 52, height: 22 }} />;
}

const positionCols: GridColDef<PaperPosition>[] = [
  { field: 'tradingsymbol', headerName: 'Contract', minWidth: 180, flex: 1.3, renderCell: (p) => <Typography variant="body2" fontWeight={600}>{p.value}</Typography> },
  { field: 'direction', headerName: 'Dir', width: 90, renderCell: (p) => <SideChip side={p.value} /> },
  { field: 'net_quantity', headerName: 'Qty', type: 'number', width: 80 },
  price('average_entry_price', 'Avg entry'),
  price('last_price', 'Last'),
  price('stop_loss', 'Stop'),
  price('take_profit', 'Target'),
  {
    field: 'unrealized_pnl',
    headerName: 'Unrealized',
    type: 'number',
    minWidth: 130,
    flex: 0.8,
    renderCell: (p) => <Pnl value={p.row.status === 'OPEN' ? p.row.unrealized_pnl : null} bold />,
  },
  ts('opened_at', 'Opened (IST)'),
  { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
];

const signalCols: GridColDef<SignalRecord>[] = [
  ts('ts', 'Decision time (IST)'),
  { field: 'action', headerName: 'Signal', minWidth: 120, flex: 0.7, valueFormatter: (v: string) => humanize(v) },
  price('reference_price', 'Underlying', 110),
  { field: 'outcome', headerName: 'Outcome', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
  {
    field: 'outcome_reason',
    headerName: 'Why',
    minWidth: 260,
    flex: 2,
    valueGetter: (_v, row) => row.outcome_reason ?? (row.explanation?.text as string | undefined) ?? '—',
  },
];

const orderCols: GridColDef<PaperOrder>[] = [
  ts('created_at', 'Created (IST)'),
  { field: 'tradingsymbol', headerName: 'Contract', minWidth: 180, flex: 1.2, renderCell: (p) => <Typography variant="body2" fontWeight={600}>{p.value}</Typography> },
  { field: 'side', headerName: 'Side', width: 90, renderCell: (p) => <SideChip side={p.value} /> },
  {
    field: 'order_type',
    headerName: 'Type',
    minWidth: 120,
    flex: 0.7,
    valueGetter: (_v, o) => `${o.order_type}${o.trigger_price ? ` @${number(o.trigger_price)}` : ''}${o.limit_price ? ` @${number(o.limit_price)}` : ''}`,
  },
  { field: 'purpose', headerName: 'Purpose', minWidth: 120, flex: 0.7, valueGetter: (_v, o) => humanize(o.exit_reason ?? o.purpose) },
  { field: 'quantity', headerName: 'Qty', type: 'number', width: 90, valueGetter: (_v, o) => o.filled_quantity, renderCell: (p) => `${p.row.filled_quantity}/${p.row.quantity}` },
  price('average_fill_price', 'Avg fill'),
  { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} tooltip={p.row.rejection_reason} /> },
];

const alertCols: GridColDef<SystemEvent>[] = [
  ts('ts', 'Time (IST)'),
  { field: 'severity', headerName: 'Severity', width: 110, renderCell: (p) => <SeverityChip severity={p.value} /> },
  { field: 'event_type', headerName: 'Event', minWidth: 170, flex: 0.9 },
  { field: 'component', headerName: 'Component', minWidth: 110, flex: 0.6 },
  { field: 'message', headerName: 'Message', minWidth: 280, flex: 2.2 },
];

function NoRows({ text }: { text: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', py: 4, color: 'text.secondary' }}>
      <InboxIcon />
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

function Grid<R extends GridValidRowModel>({ rows, columns, empty, onRowClick }: { rows: R[]; columns: GridColDef<R>[]; empty: string; onRowClick?: (row: R) => void }) {
  const theme = useTheme();
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      autoHeight
      density="compact"
      disableVirtualization
      disableRowSelectionOnClick
      disableColumnMenu
      pageSizeOptions={[8, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 8 } } }}
      hideFooter={rows.length <= 8}
      onRowClick={onRowClick ? (p) => onRowClick(p.row as R) : undefined}
      slots={{ noRowsOverlay: () => <NoRows text={empty} /> }}
      sx={{
        border: 0,
        borderRadius: 0,
        fontVariantNumeric: 'tabular-nums',
        '--DataGrid-overlayHeight': '180px',
        '--DataGrid-containerBackground': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.025),
        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' },
        '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
        '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
        '& .MuiDataGrid-row:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04), cursor: onRowClick ? 'pointer' : 'default' },
      }}
    />
  );
}

function TabLabel({ label, count, tone }: { label: string; count: number; tone?: 'error' }) {
  const theme = useTheme();
  const color = tone === 'error' && count ? theme.palette.error.main : theme.palette.text.secondary;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <span>{label}</span>
      <Box component="span" sx={{ px: 0.85, minWidth: 22, borderRadius: 10, fontSize: 11, fontWeight: 700, lineHeight: '20px', color, bgcolor: alpha(color, 0.12) }}>
        {count}
      </Box>
    </Stack>
  );
}

type Detail = { title: string; value: unknown } | null;

export function ActivityPanel({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState<Detail>(null);

  const tabs: { label: string; count: number; tone?: 'error'; link: { to: string; text: string }; content: ReactNode }[] = [
    {
      label: 'Open positions',
      count: data.open_positions.length,
      link: { to: '/paper', text: 'Paper Trading' },
      content: <Grid rows={data.open_positions} columns={positionCols} empty="No open simulated positions" />,
    },
    {
      label: 'Signals',
      count: data.recent_signals.length,
      link: { to: '/paper', text: 'Paper Trading' },
      content: (
        <Grid
          rows={data.recent_signals}
          columns={signalCols}
          empty="No signals yet"
          onRowClick={(s) => setDetail({ title: 'Signal explanation', value: { signal_id: s.signal_id, candle: s.candle, explanation: s.explanation, outcome: s.outcome, reason: s.outcome_reason, details: s.details } })}
        />
      ),
    },
    {
      label: 'Orders',
      count: data.recent_orders.length,
      link: { to: '/trades', text: 'Trade History' },
      content: <Grid rows={data.recent_orders} columns={orderCols} empty="No simulated orders" onRowClick={(o) => setDetail({ title: `Order ${o.client_order_id}`, value: o })} />,
    },
    {
      label: 'Alerts',
      count: data.recent_alerts.length,
      tone: 'error',
      link: { to: '/logs', text: 'All logs' },
      content: <Grid rows={data.recent_alerts} columns={alertCols} empty="No warnings or errors" onRowClick={(e) => setDetail({ title: e.event_type, value: e })} />,
    },
  ];
  const current = tabs[tab];

  return (
    <Card sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ px: 2.5, pt: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Recent activity
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, px: 1.5 } }}>
            {tabs.map((t) => (
              <Tab key={t.label} label={<TabLabel label={t.label} count={t.count} tone={t.tone} />} />
            ))}
          </Tabs>
        </Box>
        <Button component={RouterLink} to={current.link.to} size="small" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, mb: { xs: 1, sm: 0 } }}>
          {current.link.text} →
        </Button>
      </Stack>
      <Box role="tabpanel">{current.content}</Box>
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>{detail?.title}</DialogTitle>
        <DialogContent>{detail && <JsonBlock value={detail.value} maxHeight={520} />}</DialogContent>
      </Dialog>
    </Card>
  );
}
