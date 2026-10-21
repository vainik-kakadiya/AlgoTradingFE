import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '@mui/material';
import type { EquityPoint } from '../../types/api';
import { dateOnly, dateTime, millis, money, number } from '../../utils/format';
import { EmptyState } from '../common/Layout';

const compact = (v: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export function EquityChart({ points, baseline, height = 280 }: { points: EquityPoint[]; baseline?: number | null; height?: number }) {
  const theme = useTheme();
  if (!points.length) return <EmptyState title="No equity data yet" />;
  const data = points.map((p) => ({ t: millis(p.ts), equity: p.equity, ts: p.ts }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t) => dateOnly(new Date(t).toISOString())} stroke={theme.palette.text.secondary} fontSize={11} />
        <YAxis tickFormatter={compact} stroke={theme.palette.text.secondary} fontSize={11} domain={['auto', 'auto']} width={56} />
        <Tooltip labelFormatter={(t) => dateTime(new Date(Number(t)).toISOString())} formatter={(v: number) => [money(v), 'Equity']} />
        {baseline != null && <ReferenceLine y={baseline} stroke={theme.palette.text.disabled} strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="equity" stroke={theme.palette.primary.main} dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DrawdownChart({ points, height = 200 }: { points: EquityPoint[]; height?: number }) {
  const theme = useTheme();
  if (!points.length) return <EmptyState title="No drawdown data yet" />;
  const data = points.map((p) => ({ t: millis(p.ts), dd: -p.drawdown }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t) => dateOnly(new Date(t).toISOString())} stroke={theme.palette.text.secondary} fontSize={11} />
        <YAxis tickFormatter={compact} stroke={theme.palette.text.secondary} fontSize={11} width={56} />
        <Tooltip labelFormatter={(t) => dateTime(new Date(Number(t)).toISOString())} formatter={(v: number) => [money(v), 'Drawdown']} />
        <Area type="monotone" dataKey="dd" stroke={theme.palette.error.main} fill={theme.palette.error.main} fillOpacity={0.2} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PnlBarChart({ data, xKey, height = 240 }: { data: { net_pnl: number; [k: string]: unknown }[]; xKey: string; height?: number }) {
  const theme = useTheme();
  if (!data.length) return <EmptyState title="No closed trades yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey={xKey} stroke={theme.palette.text.secondary} fontSize={11} />
        <YAxis tickFormatter={compact} stroke={theme.palette.text.secondary} fontSize={11} width={56} />
        <Tooltip formatter={(v: number) => [money(v), 'Net P&L']} />
        <ReferenceLine y={0} stroke={theme.palette.text.disabled} />
        <Bar dataKey="net_pnl" isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.net_pnl >= 0 ? theme.palette.success.main : theme.palette.error.main} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionChart({ buckets, height = 220 }: { buckets: { from: number; to: number; count: number }[]; height?: number }) {
  const theme = useTheme();
  if (!buckets.length) return <EmptyState title="No closed trades yet" />;
  const data = buckets.map((b) => ({ label: `${number(b.from, 0)}…${number(b.to, 0)}`, count: b.count, mid: (b.from + b.to) / 2 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis dataKey="label" stroke={theme.palette.text.secondary} fontSize={10} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} stroke={theme.palette.text.secondary} fontSize={11} width={32} />
        <Tooltip formatter={(v: number) => [v, 'Trades']} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.mid >= 0 ? theme.palette.success.main : theme.palette.error.main} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GroupBarChart({ data, height = 220 }: { data: { group: string; net_pnl: number }[]; height?: number }) {
  return <PnlBarChart data={data} xKey="group" height={height} />;
}
