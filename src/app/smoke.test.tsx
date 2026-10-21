// Opt-in smoke test: renders every route against a *running* backend and fails on render errors.
//   SMOKE_BACKEND=http://127.0.0.1:8000 npx vitest run src/app/smoke.test.tsx
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { AppRoutes } from './App';
import { buildTheme } from './theme';

const backend = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.SMOKE_BACKEND;
const nativeFetch = globalThis.fetch;

describe.skipIf(!backend)('smoke: every page renders against the live backend', () => {
  const errors: unknown[][] = [];
  let ids: { strategy?: number; backtest?: number; session?: number } = {};

  beforeAll(async () => {
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => nativeFetch(new URL(String(input), backend), init));
    vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args));
    const get = async (p: string) => (await nativeFetch(new URL(p, backend))).json();
    ids = { strategy: (await get('/api/strategies'))[0]?.id, backtest: (await get('/api/backtests'))[0]?.id, session: (await get('/api/paper-sessions'))[0]?.id };
  });
  afterAll(() => vi.unstubAllGlobals());

  const routes = () => [
    '/', '/strategies', '/instruments', '/market-data', '/backtests', '/paper', '/trades', '/analytics', '/logs', '/settings',
    ...(ids.strategy ? [`/strategies/${ids.strategy}`] : []),
    ...(ids.backtest ? [`/backtests/${ids.backtest}`] : []),
    ...(ids.session ? [`/paper/${ids.session}`] : []),
  ];

  it('renders all routes without errors', async () => {
    for (const route of routes()) {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const view = render(
        <QueryClientProvider client={client}>
          <ThemeProvider theme={buildTheme('light')}>
            <MemoryRouter initialEntries={[route]}>
              <AppRoutes />
            </MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>,
      );
      await waitFor(() => expect(screen.queryAllByText(/Loading…/).length).toBe(0), { timeout: 15000 });
      expect(screen.queryByText(/Could not load data/), `error alert on ${route}`).toBeNull();
      view.unmount();
    }
    const reactErrors = errors.filter((e) => !String(e[0]).includes('not wrapped in act'));
    expect(reactErrors, JSON.stringify(reactErrors.slice(0, 3))).toEqual([]);
  }, 120000);
});
