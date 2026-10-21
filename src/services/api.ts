// Thin typed client for the FastAPI backend. All trading state lives on the backend;
// this module only reads it and submits user commands.
import type {
  AnalyticsSummary,
  Backtest,
  BacktestDetail,
  Candle,
  CostConfig,
  DashboardData,
  Dataset,
  EquityPoint,
  EquityReport,
  ExecutionConfig,
  FeedStatus,
  Instrument,
  KiteStatus,
  PaperOrder,
  PaperPosition,
  PaperSession,
  PaperSessionDetail,
  Settings,
  SignalRecord,
  Strategy,
  StrategyConfig,
  StrategyVersion,
  SystemEvent,
  SystemStatus,
  Trade,
  ValidationResult,
} from '../types/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params?: Query): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const init: RequestInit = { method, headers: {} };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  let res: Response;
  try {
    res = await fetch(path + buildQuery(query), init);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Backend unreachable. Is AlgoTradingPy running on port 8000?');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? res.statusText, err?.details);
  }
  return data as T;
}

const get = <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

export const api = {
  // system
  health: () => get<{ status: string }>('/api/health'),
  systemStatus: () => get<SystemStatus>('/api/system/status'),
  settings: () => get<Settings>('/api/settings'),
  dashboard: () => get<DashboardData>('/api/dashboard'),
  events: (q?: Query) => get<SystemEvent[]>('/api/events', q),

  // strategies
  strategies: () => get<Strategy[]>('/api/strategies'),
  strategy: (id: number) => get<Strategy>(`/api/strategies/${id}`),
  strategyTemplates: () => get<Record<string, StrategyConfig>>('/api/strategies/templates'),
  createStrategy: (body: { name: string; strategy_key?: string; description?: string; config: StrategyConfig }) =>
    post<Strategy>('/api/strategies', body),
  updateStrategy: (id: number, body: { name?: string; description?: string; is_enabled?: boolean }) =>
    put<Strategy>(`/api/strategies/${id}`, body),
  versions: (id: number) => get<StrategyVersion[]>(`/api/strategies/${id}/versions`),
  createVersion: (id: number, config: StrategyConfig, notes?: string) =>
    post<StrategyVersion>(`/api/strategies/${id}/versions`, { config, notes }),
  validate: (config: StrategyConfig, strategyId?: number) =>
    post<ValidationResult>(strategyId ? `/api/strategies/${strategyId}/validate` : '/api/strategies/validate', { config }),
  duplicateStrategy: (id: number, name: string, strategy_key: string) =>
    post<Strategy>(`/api/strategies/${id}/duplicate`, { name, strategy_key }),

  // instruments & market data
  instruments: (q?: Query) => get<{ total: number; items: Instrument[]; snapshot: string | null }>('/api/instruments', q),
  expiries: (q?: Query) => get<{ underlying: string; expiries: { expiry: string; counts: Record<string, number> }[] }>('/api/instruments/expiries', q),
  refreshInstruments: () => post<{ source_ref: string; stored: number; by_type: Record<string, number> }>('/api/instruments/refresh'),
  feedStatus: () => get<FeedStatus>('/api/market-data/status'),
  startFeed: (body: { source: 'KITE' | 'REPLAY'; dataset_id?: number; start_date?: string; end_date?: string; speed?: number }) =>
    post<FeedStatus>('/api/market-data/feed/start', body),
  stopFeed: () => post<FeedStatus>('/api/market-data/feed/stop'),
  candles: (q: Query) => get<{ items: Candle[] }>('/api/market-data/candles', q),
  datasets: () => get<Dataset[]>('/api/datasets'),
  dataset: (id: number) => get<Dataset>(`/api/datasets/${id}`),
  deleteDataset: (id: number) => del<void>(`/api/datasets/${id}`),
  importDataset: (form: FormData) => post<Dataset>('/api/market-data/import', form),
  kiteFetch: (body: Record<string, unknown>) => post<{ accepted: boolean; message: string }>('/api/datasets/kite-fetch', body),
  captureDataset: (body: { name: string; from_date: string; to_date: string; interval_seconds: number }) =>
    post<Dataset>('/api/datasets/from-capture', body),

  // kite
  kiteStatus: () => get<KiteStatus>('/api/kite/status'),
  kiteLoginUrl: () => get<{ login_url: string }>('/api/kite/login-url'),
  kiteLogout: () => post<KiteStatus>('/api/kite/logout'),

  // backtests
  backtests: (q?: Query) => get<Backtest[]>('/api/backtests', q),
  backtest: (id: number) => get<BacktestDetail>(`/api/backtests/${id}`),
  createBacktest: (body: {
    strategy_version_id: number;
    dataset_id: number;
    name?: string;
    start_date?: string;
    end_date?: string;
    initial_capital: number;
    costs: CostConfig;
    execution: ExecutionConfig;
  }) => post<Backtest>('/api/backtests', body),
  cancelBacktest: (id: number) => post<Backtest>(`/api/backtests/${id}/cancel`),
  deleteBacktest: (id: number) => del<void>(`/api/backtests/${id}`),
  backtestTrades: (id: number) => get<Trade[]>(`/api/backtests/${id}/trades`),
  backtestEquity: (id: number) => get<EquityPoint[]>(`/api/backtests/${id}/equity`),
  backtestSignals: (id: number, outcome?: string) => get<SignalRecord[]>(`/api/backtests/${id}/signals`, { outcome }),

  // paper trading
  paperSessions: (q?: Query) => get<PaperSession[]>('/api/paper-sessions', q),
  paperSession: (id: number) => get<PaperSessionDetail>(`/api/paper-sessions/${id}`),
  createPaperSession: (body: {
    strategy_version_id: number;
    name: string;
    initial_capital: number;
    data_source: 'KITE' | 'REPLAY';
    dataset_id?: number;
    costs: CostConfig;
    execution: ExecutionConfig;
  }) => post<PaperSession>('/api/paper-sessions', body),
  stopEntries: (id: number) => post<PaperSession>(`/api/paper-sessions/${id}/stop-entries`),
  stopSession: (id: number, reason?: string) => post<PaperSession>(`/api/paper-sessions/${id}/stop`, { reason }),
  paperOrders: (id: number) => get<PaperOrder[]>(`/api/paper-sessions/${id}/orders`),
  paperPositions: (id: number, status?: string) => get<PaperPosition[]>(`/api/paper-sessions/${id}/positions`, { status }),
  paperTrades: (id: number) => get<Trade[]>(`/api/paper-sessions/${id}/trades`),
  paperSignals: (id: number) => get<SignalRecord[]>(`/api/paper-sessions/${id}/signals`),
  paperEquity: (id: number) => get<EquityPoint[]>(`/api/paper-sessions/${id}/equity`),
  paperEvents: (id: number) => get<SystemEvent[]>(`/api/paper-sessions/${id}/events`),

  // analytics & trades
  analyticsSummary: (q: Query) => get<AnalyticsSummary>('/api/analytics/summary', q),
  analyticsEquity: (q: Query) => get<EquityReport>('/api/analytics/equity', q),
  trades: (q: Query) => get<Trade[]>('/api/trades', q),
  tradesCsvUrl: (q: Query) => '/api/trades.csv' + buildQuery(q),
};
