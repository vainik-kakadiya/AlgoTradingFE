import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyMetrics, mockApi, renderPage } from '../test/utils';
import AnalyticsPage from './AnalyticsPage';
import DashboardPage from './DashboardPage';
import PaperSessionPage from './PaperSessionPage';
import StrategyEditor from '../components/strategies/StrategyEditor';

const feed = {
  status: 'DISCONNECTED', message: null, source: null, clock: '2025-01-06T04:00:00Z', connected_at: null, last_market_ts: null,
  last_receive_ts: null, stale: true, stale_seconds: 10, ticks_received: 0, disconnects: 0, reconnects: 0, invalid_ticks: 0,
  max_batch_latency_ms: 0, replay_progress: null,
};
const system = {
  execution_mode: 'PAPER_ONLY', real_orders_possible: false, server_time: '2025-01-06T04:00:00Z', market_phase: 'OPEN',
  market_phase_note: '', feed, kite: { configured: false, authenticated: false, token_date: null, user_id: null, user_name: null },
  active_sessions: 1, backtests_in_progress: 0,
};
const session = {
  id: 7, strategy_version_id: 1, name: 'Morning run', status: 'RUNNING', data_source: 'KITE', initial_capital: 200000, config_hash: 'abcdef1234567890',
  entries_enabled: true, entries_blocked_reason: null, started_at: '2025-01-06T03:45:00Z', stopped_at: null, stop_reason: null, cash: 190000,
  realized_pnl: 1500, unrealized_pnl: -250, net_pnl: 1250, last_market_ts: '2025-01-06T04:00:00Z', updated_at: '2025-01-06T04:00:00Z',
  strategy_name: 'NIFTY 3-Minute Momentum', strategy_id: 1, version_number: 2,
};
const live = {
  cash: 190000, realized_pnl: 1500, unrealized_pnl: -250, net_pnl: 1250, equity: 201250, entries_blocked_reason: null, open_positions: 1,
  pending_orders: 2, day_realized: 1500, data_fresh: false, stale_reason: 'Market data feed is disconnected', pending_entries: 0, underlying: 'NSE:NIFTY 50',
};

describe('DashboardPage', () => {
  it('shows backend values, paper-only labelling and stale-data warnings', async () => {
    mockApi({
      'GET /api/dashboard': {
        system,
        active_sessions: [{ session, live, metrics: { ...emptyMetrics, total_trades: 3, max_drawdown: 900 } }],
        paper_all_time: { ...emptyMetrics, total_trades: 3, wins: 2, losses: 1, win_rate: 66.67, profit_factor: 2.5, profit_factor_state: 'FINITE' },
        paper_today: { ...emptyMetrics, capital_basis: null },
        open_positions: [],
        recent_signals: [],
        recent_orders: [],
        recent_alerts: [],
      },
    });
    renderPage(<DashboardPage />);
    expect((await screen.findAllByText('+₹1,250.00')).length).toBeGreaterThanOrEqual(2); // stat card + session row
    expect(screen.getByText('Mode: PAPER ONLY')).toBeInTheDocument();
    expect(screen.getByText('66.67%')).toBeInTheDocument();
    expect(screen.getByText('2.50')).toBeInTheDocument();
    expect(screen.getByText(/waiting for market data/)).toBeInTheDocument();
    expect(screen.getByText(/Market data feed is disconnected/)).toBeInTheDocument();
    expect(screen.getByText(/simulated paper-trading results/)).toBeInTheDocument();
  });
});

describe('AnalyticsPage', () => {
  it('shows an explicit no-data state instead of illustrative figures', async () => {
    mockApi({
      'GET /api/strategies': [],
      'GET /api/backtests': [],
      'GET /api/analytics/summary': {
        scope: 'backtest', filters: {}, initial_capital: null, return_basis: '', metrics: emptyMetrics, by_option_side: [], by_exit_reason: [],
        by_strategy_version: [], by_expiry: [], by_instrument: [], by_run: [], daily: [], monthly: [], distribution: [],
        costs: { entry_charges: 0, exit_charges: 0, slippage: 0, gross_pnl: 0, net_pnl: 0 },
      },
      'GET /api/analytics/equity': { basis: 'x', initial_capital: null, points: [] },
    });
    renderPage(<AnalyticsPage />);
    expect(await screen.findByText('No closed trades for this selection')).toBeInTheDocument();
  });
});

describe('PaperSessionPage', () => {
  it('distinguishes stopping entries from stopping the session', async () => {
    const calls = mockApi({
      'GET /api/paper-sessions/7': {
        session, live: { ...live, data_fresh: true, stale_reason: null }, metrics: emptyMetrics, strategy_config: { risk: { max_daily_loss: 2000 } }, session_config: {},
        stop_semantics: { stop_entries: 'Blocks new entries. Open positions keep their stops.', stop: 'Closes all open simulated positions and ends the session.' },
      },
      'GET /api/paper-sessions/7/positions': [],
      'GET /api/paper-sessions/7/signals': [],
      'GET /api/paper-sessions/7/equity': [],
      'POST /api/paper-sessions/7/stop-entries': { ...session, status: 'ENTRIES_STOPPED' },
    });
    renderPage(<PaperSessionPage />, { path: '/paper/:id', route: '/paper/7' });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Stop new entries' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Open positions keep their stops/)).toBeInTheDocument();
    expect(within(dialog).getByText('1 open position(s) stay protected')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Stop new entries' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/paper-sessions/7/stop-entries')).toBe(true));
    expect(calls.some((c) => c.path === '/api/paper-sessions/7/stop')).toBe(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Stop session' }));
    const stopDialog = await screen.findByRole('dialog');
    expect(within(stopDialog).getByText(/Closes all open simulated positions/)).toBeInTheDocument();
    expect(within(stopDialog).getByText('1 open position(s) will be closed')).toBeInTheDocument();
  });
});

describe('StrategyEditor', () => {
  it('shows backend validation errors and offers no real-order switch', async () => {
    const calls = mockApi({
      'POST /api/strategies/validate': {
        valid: false, errors: [{ loc: 'entry.range_gt', msg: 'Input should be greater than 0' }], warnings: [], summary: [], normalized: null, config_hash: null,
      },
    });
    renderPage(<StrategyEditor initial={{ strategy_type: 'nifty_momentum', name: 'X', entry: { range_gt: 100, absolute_body_gt: 80 } }} saveLabel="Save" onSave={() => {}} />);
    const user = userEvent.setup();
    const range = screen.getByLabelText('Range (H − L) greater than');
    await user.clear(range);
    await user.type(range, '-5');
    await user.click(screen.getByRole('button', { name: 'Validate' }));
    expect(await screen.findByText('Configuration is invalid')).toBeInTheDocument();
    expect(screen.getByText(/greater than 0/)).toBeInTheDocument();
    expect((calls[0].body as { config: { entry: { range_gt: number } } }).config.entry.range_gt).toBe(-5);
    expect(screen.queryByLabelText(/real orders/i)).not.toBeInTheDocument();
    expect(screen.getByText(/There is no setting that enables real orders/)).toBeInTheDocument();
  });
});
