import { describe, expect, it } from 'vitest';
import { dateTime, duration, money, pct, pnlColor, profitFactor, signedMoney, timeframe } from './format';

describe('format', () => {
  it('formats INR with Indian grouping', () => {
    expect(money(123456.5)).toBe('₹1,23,456.50');
    expect(signedMoney(5200)).toBe('+₹5,200.00');
    expect(signedMoney(-3250)).toBe('-₹3,250.00');
    expect(money(null)).toBe('—');
  });

  it('never shows a finite profit factor when there are no losses', () => {
    expect(profitFactor(null, 'NO_LOSSES')).toContain('∞');
    expect(profitFactor(null, 'NO_TRADES')).toBe('—');
    expect(profitFactor(1.5678, 'FINITE')).toBe('1.57');
  });

  it('shows timestamps in IST', () => {
    expect(dateTime('2025-01-06T03:48:00Z')).toContain('09:18:00');
    expect(dateTime('2025-01-06T03:48:00')).toContain('09:18:00'); // naive = UTC
  });

  it('formats misc values', () => {
    expect(pct(12.345)).toBe('12.35%');
    expect(pct(null)).toBe('—');
    expect(pnlColor(5)).toBe('success.main');
    expect(pnlColor(-5)).toBe('error.main');
    expect(pnlColor(0)).toBe('text.primary');
    expect(timeframe(180)).toBe('3m');
    expect(timeframe(30)).toBe('30s');
    expect(duration('2025-01-06T03:45:00Z', '2025-01-06T05:00:30Z')).toBe('1h 15m');
  });
});
