// Display formatting. All market timestamps are shown in IST.

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const dt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const tOnly = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const dOnly = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

export const DASH = '—';

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return inr.format(value);
}

export function signedMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return (value > 0 ? '+' : '') + inr.format(value);
}

export function number(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return digits === 2 ? num.format(value) : value.toFixed(digits);
}

export function pct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return `${value.toFixed(digits)}%`;
}

export function profitFactor(value: number | null | undefined, state?: string): string {
  if (state === 'NO_LOSSES') return '∞ (no losses)';
  if (state === 'NO_TRADES' || value === null || value === undefined) return DASH;
  return value.toFixed(2);
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Backend datetimes are UTC; naive strings are treated as UTC.
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : value + 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateTime(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? dt.format(d) : DASH;
}

export function timeOnly(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? tOnly.format(d) : DASH;
}

export function dateOnly(value: string | null | undefined): string {
  const d = toDate(value);
  return d ? dOnly.format(d) : DASH;
}

export function millis(value: string | null | undefined): number {
  return toDate(value)?.getTime() ?? 0;
}

export function epochSeconds(value: string): number {
  return Math.floor((toDate(value)?.getTime() ?? 0) / 1000);
}

export function duration(from: string | null | undefined, to?: string | null): string {
  const a = toDate(from);
  if (!a) return DASH;
  const b = toDate(to ?? null) ?? new Date();
  let s = Math.max(0, Math.floor((b.getTime() - a.getTime()) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export function pnlColor(value: number | null | undefined): 'success.main' | 'error.main' | 'text.primary' {
  if (!value) return 'text.primary';
  return value > 0 ? 'success.main' : 'error.main';
}

export function humanize(text: string | null | undefined): string {
  if (!text) return DASH;
  return text.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function timeframe(seconds: number | undefined): string {
  if (!seconds) return DASH;
  return seconds % 60 === 0 ? `${seconds / 60}m` : `${seconds}s`;
}
