import { Chip, Tooltip, type ChipProps } from '@mui/material';
import type { FeedStatus } from '../../types/api';
import { dateTime, humanize } from '../../utils/format';

const STATUS_COLORS: Record<string, ChipProps['color']> = {
  RUNNING: 'success',
  CONNECTED: 'success',
  COMPLETED: 'success',
  READY: 'success',
  ENTERED: 'success',
  FILLED: 'success',
  OPEN: 'info',
  QUEUED: 'default',
  PENDING: 'info',
  CONNECTING: 'info',
  IMPORTING: 'info',
  ENTRIES_STOPPED: 'warning',
  RECONNECTING: 'warning',
  SKIPPED: 'warning',
  PARTIALLY_FILLED: 'warning',
  BLOCKED: 'error',
  REJECTED: 'error',
  FAILED: 'error',
  ERROR: 'error',
  DISCONNECTED: 'default',
  CANCELLED: 'default',
  EXPIRED: 'default',
  STOPPED: 'default',
  CLOSED: 'default',
  ENDED: 'default',
  ENABLED: 'success',
  DISABLED: 'default',
};

export function StatusChip({ status, tooltip }: { status: string | null | undefined; tooltip?: string | null }) {
  const chip = <Chip size="small" label={humanize(status)} color={STATUS_COLORS[status ?? ''] ?? 'default'} variant="outlined" />;
  return tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip;
}

const SEVERITY_COLORS: Record<string, ChipProps['color']> = {
  DEBUG: 'default',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'error',
};

export function SeverityChip({ severity }: { severity: string }) {
  return <Chip size="small" label={severity} color={SEVERITY_COLORS[severity] ?? 'default'} variant={severity === 'CRITICAL' ? 'filled' : 'outlined'} />;
}

/** Feed state with explicit stale/disconnected handling; a missing feed is never shown as healthy. */
export function FeedChip({ feed }: { feed: FeedStatus | null }) {
  if (!feed) return <Chip size="small" label="Feed: unknown" variant="outlined" />;
  let color: ChipProps['color'] = 'default';
  let label = `Feed: ${humanize(feed.status)}`;
  if (feed.status === 'CONNECTED') {
    color = feed.stale ? 'warning' : 'success';
    label = `${feed.source === 'REPLAY' ? 'Replay' : 'Kite'}: ${feed.stale ? 'stale' : 'live'}`;
  } else if (['DISCONNECTED', 'ERROR', 'RECONNECTING'].includes(feed.status)) {
    color = feed.status === 'DISCONNECTED' ? 'default' : 'error';
  }
  return (
    <Tooltip title={`${feed.message ?? ''} · last market update ${dateTime(feed.last_market_ts)}`}>
      <Chip size="small" label={label} color={color} variant="outlined" />
    </Tooltip>
  );
}
