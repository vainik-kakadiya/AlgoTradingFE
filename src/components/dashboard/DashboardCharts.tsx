import { useId } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import type { EquityPoint, Metrics } from '../../types/api';
import { dateOnly, dateTime, millis, money, signedMoney } from '../../utils/format';

const compact = (v: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

/** Evenly spaced, rounded axis ticks (1/2/2.5/5 × 10ⁿ steps) covering [lo, hi]. */
function niceTicks(lo: number, hi: number, target = 5): number[] {
  if (hi === lo) {
    const pad = Math.abs(hi) || 1;
    lo -= pad;
    hi += pad;
  }
  const raw = (hi - lo) / (target - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function ChartEmpty({ title, hint, height }: { title: string; hint?: string; height: number }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height, color: 'text.secondary', textAlign: 'center', px: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'action.hover' }}>
        <ShowChartIcon fontSize="small" />
      </Box>
      <Typography variant="subtitle2">{title}</Typography>
      {hint && <Typography variant="caption">{hint}</Typography>}
    </Stack>
  );
}

function useTooltipStyle() {
  const theme = useTheme();
  return {
    contentStyle: {
      background: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      boxShadow: theme.shadows[4],
      fontSize: 12,
    },
    labelStyle: { color: theme.palette.text.secondary, marginBottom: 4 },
    itemStyle: { color: theme.palette.text.primary, fontWeight: 600 },
  };
}

/** Cumulative equity / P&L as a gradient area, coloured by whether it ends above the baseline. */
export function EquityArea({ points, baseline = 0, height = 280 }: { points: EquityPoint[]; baseline?: number; height?: number }) {
  const theme = useTheme();
  const tip = useTooltipStyle();
  const gradientId = useId().replace(/:/g, '');
  if (!points.length) return <ChartEmpty title="No closed paper trades yet" hint="The curve appears after the first simulated trade closes." height={height} />;
  const data = points.map((p) => ({ t: millis(p.ts), equity: p.equity }));
  const last = data[data.length - 1].equity;
  const color = last >= baseline ? theme.palette.success.main : theme.palette.error.main;
  // Fill is strongest next to the line: at the top when the curve sits above ₹0, at the bottom when it is all below.
  const allBelow = data.every((d) => d.equity <= baseline);
  const [topOpacity, bottomOpacity] = allBelow ? [0.02, 0.35] : [0.35, 0.02];
  const values = data.map((d) => d.equity);
  const ticks = niceTicks(Math.min(baseline, ...values), Math.max(baseline, ...values));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={topOpacity} />
            <stop offset="100%" stopColor={color} stopOpacity={bottomOpacity} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={alpha(theme.palette.text.primary, 0.08)} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t) => dateOnly(new Date(t).toISOString())}
          stroke={theme.palette.text.secondary}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        {/* Always include the baseline so the fill runs between the line and ₹0, even when every value is below it. */}
        <YAxis
          tickFormatter={compact}
          stroke={theme.palette.text.secondary}
          fontSize={11}
          width={52}
          tickLine={false}
          axisLine={false}
          domain={[ticks[0], ticks[ticks.length - 1]]}
          ticks={ticks}
        />
        <Tooltip {...tip} labelFormatter={(t) => dateTime(new Date(Number(t)).toISOString())} formatter={(v: number) => [signedMoney(v), 'Cumulative net P&L']} />
        <ReferenceLine y={baseline} stroke={theme.palette.text.disabled} strokeDasharray="4 4" />
        {/* Linear, not smoothed: each point is a closed trade and nothing happens in between. */}
        <Area
          type="linear"
          dataKey="equity"
          baseValue={baseline}
          stroke={color}
          strokeWidth={2.25}
          fill={`url(#${gradientId})`}
          dot={data.length <= 60 ? { r: 3, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: theme.palette.background.paper }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Daily net P&L bars (green / red). */
export function DailyBars({ days, height = 280 }: { days: { date: string; net_pnl: number; trades: number }[]; height?: number }) {
  const theme = useTheme();
  const tip = useTooltipStyle();
  if (!days.length) return <ChartEmpty title="No closed paper trades yet" height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={days} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={alpha(theme.palette.text.primary, 0.08)} />
        <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={compact} stroke={theme.palette.text.secondary} fontSize={11} width={52} tickLine={false} axisLine={false} />
        <Tooltip
          {...tip}
          cursor={{ fill: alpha(theme.palette.text.primary, 0.05) }}
          formatter={(v: number, _n, item) => [`${signedMoney(v)} · ${(item.payload as { trades: number }).trades} trades`, 'Net P&L']}
        />
        <ReferenceLine y={0} stroke={theme.palette.text.disabled} />
        <Bar dataKey="net_pnl" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
          {days.map((d) => (
            <Cell key={d.date} fill={d.net_pnl >= 0 ? theme.palette.success.main : theme.palette.error.main} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Win / loss / break-even donut plus average and extreme trade figures. */
export function OutcomeBreakdown({ metrics }: { metrics: Metrics }) {
  const theme = useTheme();
  const tip = useTooltipStyle();
  const slices = [
    { name: 'Wins', value: metrics.wins, color: theme.palette.success.main },
    { name: 'Losses', value: metrics.losses, color: theme.palette.error.main },
    { name: 'Break-even', value: metrics.breakeven, color: theme.palette.grey[500] },
  ];
  const total = metrics.total_trades;
  const rows: { label: string; value: number | null; signed?: boolean }[] = [
    { label: 'Average win', value: metrics.avg_win, signed: true },
    { label: 'Average loss', value: metrics.avg_loss, signed: true },
    { label: 'Largest win', value: metrics.largest_win, signed: true },
    { label: 'Largest loss', value: metrics.largest_loss, signed: true },
    { label: 'Charges paid', value: metrics.total_charges },
  ];
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
          {total ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices.filter((s) => s.value > 0)} dataKey="value" nameKey="name" innerRadius={44} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {slices
                    .filter((s) => s.value > 0)
                    .map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ position: 'absolute', inset: 2, borderRadius: '50%', border: 18, borderColor: 'action.hover' }} />
          )}
          <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              trades
            </Typography>
          </Stack>
        </Box>
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {slices.map((s) => (
            <Stack key={s.name} direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: s.color, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {s.name}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
        {rows.map((r) => (
          <Stack key={r.label} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {r.label}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ fontVariantNumeric: 'tabular-nums', color: r.signed && r.value ? (r.value > 0 ? 'success.main' : 'error.main') : 'text.primary' }}
            >
              {r.signed ? signedMoney(r.value) : money(r.value)}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}
