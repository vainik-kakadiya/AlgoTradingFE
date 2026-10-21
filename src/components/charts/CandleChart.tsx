import { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { createChart, type IChartApi, type UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '../../types/api';
import { epochSeconds } from '../../utils/format';
import { EmptyState } from '../common/Layout';

const IST_OFFSET = 19800; // lightweight-charts renders UTC; shift so the axis reads IST wall-clock time

export default function CandleChart({ candles, height = 360 }: { candles: Candle[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const theme = useTheme();

  useEffect(() => {
    if (!ref.current || !candles.length) return;
    const chart = createChart(ref.current, {
      height,
      layout: { background: { color: 'transparent' }, textColor: theme.palette.text.secondary },
      grid: { vertLines: { color: theme.palette.divider }, horzLines: { color: theme.palette.divider } },
      timeScale: { timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: theme.palette.success.main,
      downColor: theme.palette.error.main,
      wickUpColor: theme.palette.success.main,
      wickDownColor: theme.palette.error.main,
      borderVisible: false,
    });
    series.setData(
      candles.map((c) => ({
        time: (epochSeconds(c.start) + IST_OFFSET) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        // Incomplete candles are drawn grey so they are never mistaken for observed full bars.
        ...(c.is_complete ? {} : { color: theme.palette.text.disabled, wickColor: theme.palette.text.disabled }),
      })),
    );
    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, height, theme]);

  if (!candles.length) return <EmptyState title="No candles for this selection" />;
  return <Box ref={ref} sx={{ width: '100%', height }} />;
}
