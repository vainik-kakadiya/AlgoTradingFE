import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { buildTheme } from '../app/theme';

type Handler = (url: URL, init?: RequestInit) => unknown;

/** Stub fetch with a route table: { 'GET /api/x': body | (url, init) => body }. Unmatched calls fail the test. */
export function mockApi(routes: Record<string, unknown | Handler>) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const key = `${method} ${url.pathname}`;
    calls.push({ method, path: url.pathname + url.search, body: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    if (!(key in routes)) return new Response(JSON.stringify({ error: { code: 'NOT_MOCKED', message: key } }), { status: 500 });
    const route = routes[key];
    const body = typeof route === 'function' ? (route as Handler)(url, init) : route;
    if (body instanceof Response) return body;
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

export function renderPage(ui: ReactElement, { path = '/', route = '/' }: { path?: string; route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme('light')}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

export const emptyMetrics = {
  total_trades: 0, wins: 0, losses: 0, breakeven: 0, win_rate: null, gross_pnl: 0, total_charges: 0, total_slippage: 0,
  net_pnl: 0, return_pct: null, gross_profit: 0, gross_loss: 0, profit_factor: null, profit_factor_state: 'NO_TRADES',
  avg_win: null, avg_loss: null, avg_trade: null, largest_win: null, largest_loss: null, max_drawdown: 0, max_drawdown_pct: 0,
};
