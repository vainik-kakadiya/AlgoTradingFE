import type { ReactNode } from 'react';
import { Alert, AlertTitle, Box, Card, CardContent, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import type { UseQueryResult } from '@tanstack/react-query';
import { pnlColor, signedMoney } from '../../utils/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Stack direction="row" spacing={1} flexWrap="wrap">{actions}</Stack>}
    </Stack>
  );
}

export function Section({ title, actions, children, dense }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; dense?: boolean }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={dense ? { p: 1.5, '&:last-child': { pb: 1.5 } } : undefined}>
        {(title || actions) && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} spacing={1}>
            {typeof title === 'string' ? <Typography variant="subtitle1" fontWeight={600}>{title}</Typography> : title}
            {actions}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function StatCard({ label, value, sub, color, tooltip }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; tooltip?: string }) {
  const body = (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" component="div">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
  return tooltip ? <Tooltip title={tooltip}>{body}</Tooltip> : body;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 1.5, mb: 2 }}>{children}</Box>
  );
}

export function Pnl({ value, bold }: { value: number | null | undefined; bold?: boolean }) {
  return (
    <Box component="span" sx={{ color: pnlColor(value), fontWeight: bold ? 600 : undefined, fontVariantNumeric: 'tabular-nums' }}>
      {signedMoney(value)}
    </Box>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
      <CircularProgress size={18} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

export function ErrorAlert({ error, title = 'Could not load data' }: { error: unknown; title?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 4, color: 'text.secondary', textAlign: 'center' }}>
      <InboxIcon />
      <Typography variant="subtitle2">{title}</Typography>
      {children && <Typography variant="body2">{children}</Typography>}
    </Stack>
  );
}

/** Renders loading / error states for a query and the children once data is available. */
export function QueryView<T>({ query, children, loadingLabel }: { query: UseQueryResult<T>; children: (data: T) => ReactNode; loadingLabel?: string }) {
  if (query.isPending) return <Loading label={loadingLabel} />;
  if (query.isError) return <ErrorAlert error={query.error} />;
  return <>{children(query.data as T)}</>;
}

export function JsonBlock({ value, maxHeight = 360 }: { value: unknown; maxHeight?: number }) {
  return (
    <Box
      component="pre"
      sx={{ m: 0, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto', maxHeight, fontSize: 12, fontFamily: 'ui-monospace, Consolas, monospace' }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}

export function SimulatedNotice() {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
      All orders, fills and P&L on this page are <strong>simulated</strong>. Nothing is sent to Zerodha.
    </Alert>
  );
}
