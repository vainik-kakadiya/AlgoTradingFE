// Types mirroring the FastAPI response models (AlgoTradingPy/app/api/schemas.py).

export type Json = Record<string, unknown>;

export interface ApiErrorBody {
  error: { code: string; message: string; details: unknown };
}

export interface StrategyVersion {
  id: number;
  strategy_id: number;
  version_number: number;
  config_json: StrategyConfig;
  config_hash: string;
  notes: string | null;
  created_at: string;
}

export interface Strategy {
  id: number;
  name: string;
  strategy_key: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  latest_version: StrategyVersion | null;
  version_count: number;
}

// Strategy config is validated on the backend; the UI edits it as structured JSON.
export type StrategyConfig = Json & {
  strategy_type?: 'nifty_momentum' | 'rule_based';
  strategy_id?: string;
  name?: string;
  underlying?: string;
  timeframe_seconds?: number;
};

export interface ValidationResult {
  valid: boolean;
  errors: { loc: string; msg: string }[];
  warnings: string[];
  summary: string[];
  normalized: StrategyConfig | null;
  config_hash: string | null;
}

export interface Instrument {
  id: number;
  source: string;
  source_ref: string;
  snapshot_date: string;
  dataset_id: number | null;
  exchange: string;
  segment: string | null;
  instrument_token: number | null;
  tradingsymbol: string;
  underlying: string | null;
  instrument_type: string;
  strike: number | null;
  expiry: string | null;
  lot_size: number;
  tick_size: number;
  is_active: boolean;
}

export interface Dataset {
  id: number;
  name: string;
  source: string;
  source_label: string | null;
  is_synthetic: boolean;
  status: string;
  interval_seconds: number;
  timezone: string;
  instrument_coverage: Record<string, { first?: string; last?: string; bars?: number; missing_intervals?: number }> | null;
  start_time: string | null;
  end_time: string | null;
  row_count: number;
  quality_summary: Json | null;
  checksum: string | null;
  notes: string | null;
  imported_at: string;
}

export interface QuoteStatus {
  ltp: number | null;
  bid: number | null;
  ask: number | null;
  ts: string | null;
  age_seconds: number | null;
  stale: boolean;
  ticks: number;
  gaps: number;
}

export interface FeedStatus {
  status: string;
  message: string | null;
  source: string | null;
  clock: string;
  connected_at: string | null;
  last_market_ts: string | null;
  last_receive_ts: string | null;
  stale: boolean;
  stale_seconds: number;
  ticks_received: number;
  disconnects: number;
  reconnects: number;
  invalid_ticks: number;
  max_batch_latency_ms: number;
  replay_progress: number | null;
  subscriptions?: Record<string, QuoteStatus>;
}

export interface KiteStatus {
  configured: boolean;
  authenticated: boolean;
  token_date: string | null;
  user_id: string | null;
  user_name: string | null;
}

export interface SystemStatus {
  execution_mode: 'PAPER_ONLY';
  real_orders_possible: false;
  server_time: string;
  market_phase: string;
  market_phase_note: string;
  feed: FeedStatus;
  kite: KiteStatus;
  active_sessions: number;
  backtests_in_progress: number;
}

export interface Metrics {
  total_trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate: number | null;
  gross_pnl: number;
  total_charges: number;
  total_slippage: number;
  net_pnl: number;
  return_pct: number | null;
  gross_profit: number;
  gross_loss: number;
  profit_factor: number | null;
  profit_factor_state: 'FINITE' | 'NO_LOSSES' | 'NO_TRADES';
  avg_win: number | null;
  avg_loss: number | null;
  avg_trade: number | null;
  largest_win: number | null;
  largest_loss: number | null;
  max_drawdown?: number | null;
  max_drawdown_pct?: number | null;
  drawdown_basis?: string;
}

export interface Backtest {
  id: number;
  name: string | null;
  strategy_version_id: number;
  dataset_id: number;
  start_date: string | null;
  end_date: string | null;
  initial_capital: number;
  config_hash: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  total_trades: number | null;
  gross_pnl: number | null;
  total_charges: number | null;
  total_slippage: number | null;
  net_pnl: number | null;
  return_pct: number | null;
  win_rate: number | null;
  profit_factor: number | null;
  max_drawdown: number | null;
  max_drawdown_pct: number | null;
  error: string | null;
  strategy_name: string | null;
  strategy_id: number | null;
  version_number: number | null;
  dataset_name: string | null;
}

export interface BacktestReport {
  metrics: Metrics;
  signals: Record<string, number>;
  event_counts: Record<string, number>;
  exit_reasons: Record<string, number>;
  data_quality: Record<string, number>;
  execution_assumptions: string[];
  warnings: string[];
  reconciliation_error: number;
  dataset: Json;
  events: { ts: string; severity: string; event_type: string; message: string }[];
}

export interface BacktestDetail extends Backtest {
  strategy_config: StrategyConfig;
  execution_config: Json;
  cost_config: Json;
  report: BacktestReport | null;
}

export interface Trade {
  id: number;
  trade_uid: string;
  instrument_key: string;
  tradingsymbol: string;
  instrument_type: string;
  underlying: string | null;
  strike: number | null;
  expiry: string | null;
  lot_size: number;
  lots: number;
  quantity: number;
  direction: string;
  signal_id: string | null;
  signal_ts: string | null;
  entry_ts: string;
  entry_price: number;
  entry_ref_price: number;
  exit_ts: string;
  exit_price: number;
  exit_ref_price: number;
  entry_charges: number;
  exit_charges: number;
  slippage_cost: number;
  gross_pnl: number;
  net_pnl: number;
  exit_reason: string;
  flags: string[] | null;
  details: Json | null;
  backtest_run_id?: number | null;
  paper_session_id?: number | null;
  scope?: string | null;
  strategy_name?: string | null;
  version_number?: number | null;
}

export interface SignalRecord {
  id: number;
  backtest_run_id: number | null;
  paper_session_id: number | null;
  signal_id: string;
  ts: string;
  strategy_key: string;
  direction: string;
  action: string;
  reference_price: number;
  candle: Json;
  explanation: Json | null;
  outcome: 'ENTERED' | 'SKIPPED' | 'BLOCKED' | 'PENDING';
  outcome_reason: string | null;
  details: Json | null;
}

export interface EquityPoint {
  ts: string;
  cash?: number;
  realized_pnl: number;
  unrealized_pnl: number;
  equity: number;
  peak_equity?: number;
  drawdown: number;
  drawdown_pct: number | null;
}

export interface PaperSession {
  id: number;
  strategy_version_id: number;
  name: string;
  status: 'RUNNING' | 'ENTRIES_STOPPED' | 'STOPPED' | 'FAILED';
  data_source: 'KITE' | 'REPLAY';
  initial_capital: number;
  config_hash: string;
  entries_enabled: boolean;
  entries_blocked_reason: string | null;
  started_at: string;
  stopped_at: string | null;
  stop_reason: string | null;
  cash: number;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  last_market_ts: string | null;
  updated_at: string;
  strategy_name: string | null;
  strategy_id: number | null;
  version_number: number | null;
}

export interface LiveSummary {
  cash: number;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  equity: number;
  entries_blocked_reason: string | null;
  open_positions: number;
  pending_orders: number;
  day_realized: number;
  data_fresh: boolean;
  stale_reason: string | null;
  pending_entries: number;
  underlying: string;
}

export interface PaperSessionDetail {
  session: PaperSession;
  live: LiveSummary | null;
  metrics: Metrics;
  strategy_config: StrategyConfig;
  session_config: Json;
  stop_semantics: { stop_entries: string; stop: string };
}

export interface PaperOrder {
  id: number;
  paper_session_id: number;
  client_order_id: string;
  instrument_key: string;
  tradingsymbol: string;
  side: string;
  order_type: string;
  purpose: string;
  quantity: number;
  limit_price: number | null;
  trigger_price: number | null;
  status: string;
  filled_quantity: number;
  average_fill_price: number | null;
  signal_id: string | null;
  exit_reason: string | null;
  rejection_reason: string | null;
  execution_details: Json | null;
  created_at: string;
  updated_at: string;
  filled_at: string | null;
}

export interface PaperPosition {
  id: number;
  paper_session_id: number;
  position_uid: string;
  instrument_key: string;
  tradingsymbol: string;
  direction: string;
  net_quantity: number;
  average_entry_price: number;
  realized_pnl: number;
  unrealized_pnl: number;
  last_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  status: string;
  signal_id: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface SystemEvent {
  id: number;
  ts: string;
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  event_type: string;
  component: string;
  strategy_id: number | null;
  paper_session_id: number | null;
  backtest_run_id: number | null;
  message: string;
  details: Json | null;
}

export interface GroupMetrics extends Metrics {
  group: string;
}

export interface AnalyticsSummary {
  scope: 'paper' | 'backtest';
  filters: Json;
  initial_capital: number | null;
  return_basis: string;
  metrics: Metrics;
  by_option_side: GroupMetrics[];
  by_exit_reason: GroupMetrics[];
  by_strategy_version: GroupMetrics[];
  by_expiry: GroupMetrics[];
  by_instrument: GroupMetrics[];
  by_run: GroupMetrics[];
  daily: { date: string; net_pnl: number; gross_pnl: number; trades: number; charges: number }[];
  monthly: { month: string; net_pnl: number; trades: number }[];
  distribution: { from: number; to: number; count: number }[];
  costs: { entry_charges: number; exit_charges: number; slippage: number; gross_pnl: number; net_pnl: number };
}

export interface EquityReport {
  basis: string;
  initial_capital: number | null;
  points: EquityPoint[];
}

export interface DashboardData {
  system: SystemStatus;
  active_sessions: { session: PaperSession; live: LiveSummary | null; metrics: Metrics }[];
  paper_all_time: Metrics;
  paper_today: Metrics & { capital_basis: string | null };
  open_positions: PaperPosition[];
  recent_signals: SignalRecord[];
  recent_orders: PaperOrder[];
  recent_alerts: SystemEvent[];
}

export interface Settings {
  api_host: string;
  api_port: number;
  frontend_url: string;
  database: string;
  kite_api_key_configured: boolean;
  kite_api_secret_configured: boolean;
  instrument_underlyings: string[];
  auto_start_feed: boolean;
  capture_ticks: boolean;
  capture_second_bars: boolean;
  feed_stale_seconds: number;
  execution_mode: 'PAPER_ONLY';
  kite: KiteStatus;
  kite_redirect_url: string;
  defaults: { costs: CostConfig; execution: ExecutionConfig };
}

export interface CostConfig {
  brokerage_per_order: number;
  brokerage_pct_cap: number | null;
  options_stt_sell_pct: number;
  options_exchange_txn_pct: number;
  futures_stt_sell_pct: number;
  futures_exchange_txn_pct: number;
  equity_stt_sell_pct: number;
  equity_exchange_txn_pct: number;
  sebi_fee_pct: number;
  stamp_duty_buy_pct_options: number;
  stamp_duty_buy_pct_futures: number;
  stamp_duty_buy_pct_equity: number;
  gst_pct: number;
  enabled: boolean;
}

export interface ExecutionConfig {
  price_source: 'BID_ASK' | 'LTP';
  allow_ltp_fallback: boolean;
  max_quote_age_seconds: number;
  limit_fill_rule: 'TRADE_THROUGH' | 'TOUCH';
  intrabar_conflict: 'STOP_FIRST';
  slippage: { points: number; pct: number };
}

export interface Candle {
  start: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: string;
  is_complete: boolean;
  quality_flags: string[] | null;
}
