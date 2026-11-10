import type { ReactNode } from 'react';
import { Box, Card, CircularProgress, Divider, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';

type Accent = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

/** Large headline metric with an icon badge and an accent stripe. */
export function HeroKpi({
  label,
  value,
  valueColor,
  sub,
  icon,
  accent = 'primary',
  footer,
  aside,
  tooltip,
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
  sub?: ReactNode;
  icon: ReactNode;
  accent?: Accent;
  footer?: ReactNode;
  aside?: ReactNode;
  tooltip?: string;
}) {
  const theme = useTheme();
  const color = theme.palette[accent].main;
  const card = (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        p: 2.5,
        transition: 'border-color .2s, box-shadow .2s',
        '&:hover': { borderColor: alpha(color, 0.5), boxShadow: `0 6px 24px ${alpha(color, 0.12)}` },
        '&::before': { content: '""', position: 'absolute', inset: '0 0 auto 0', height: 3, bgcolor: color },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                color,
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                '& svg': { fontSize: 20 },
              }}
            >
              {icon}
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          </Stack>
          <Typography
            variant="h4"
            sx={{ color: valueColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5, lineHeight: 1.15, fontSize: { xs: 26, md: 30 } }}
          >
            {value}
          </Typography>
          {sub && (
            <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              {sub}
            </Typography>
          )}
        </Box>
        {aside}
      </Stack>
      {footer && (
        <>
          <Divider sx={{ my: 1.75 }} />
          {footer}
        </>
      )}
    </Card>
  );
  return tooltip ? <Tooltip title={tooltip}>{card}</Tooltip> : card;
}

/** Two labelled values side by side, used in KPI card footers. */
export function SplitFooter({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={2}>
      {items.map((it) => (
        <Box key={it.label} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            {it.label}
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }} component="div">
            {it.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

/** Circular gauge (0-100). Purely graphical: the number itself is shown by the card. */
export function Ring({ value, accent = 'success', size = 64 }: { value: number | null; accent?: Accent; size?: number }) {
  const theme = useTheme();
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }} aria-hidden>
      <CircularProgress variant="determinate" value={100} size={size} thickness={5} sx={{ color: alpha(theme.palette.text.primary, 0.08), position: 'absolute' }} />
      <CircularProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, value ?? 0))}
        size={size}
        thickness={5}
        sx={{ color: theme.palette[accent].main, position: 'absolute', '& circle': { strokeLinecap: 'round' } }}
      />
    </Box>
  );
}

/** A single card holding a row of compact secondary metrics separated by dividers. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }[] }) {
  return (
    <Card sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: `repeat(${items.length}, 1fr)` },
          '& > *': { borderRight: 1, borderBottom: 1, borderColor: 'divider' },
          mr: '-1px',
          mb: '-1px',
        }}
      >
        {items.map((it) => (
          <Box key={it.label} sx={{ px: 2.5, py: 2, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary', mb: 0.5, '& svg': { fontSize: 16 } }}>
              {it.icon}
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }} noWrap>
                {it.label}
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
              {it.value}
            </Typography>
            {it.sub && (
              <Typography variant="caption" color="text.secondary" component="div" noWrap>
                {it.sub}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Card>
  );
}

/** Card with a title row and optional actions, used for chart and table panels. */
export function Panel({ title, subtitle, actions, children, noPadding }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; noPadding?: boolean }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ px: 2.5, pt: 2, pb: noPadding ? 1 : 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" component="div">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions}
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, ...(noPadding ? {} : { px: 2.5, pb: 2 }) }}>{children}</Box>
    </Card>
  );
}
