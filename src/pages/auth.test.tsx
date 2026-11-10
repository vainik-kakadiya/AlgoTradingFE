import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { buildTheme } from '../app/theme';
import RequireAuth from '../components/auth/RequireAuth';
import LoginPage from './LoginPage';
import { mockApi } from '../test/utils';

const unauthenticated = () => new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }), { status: 401 });

function renderApp(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={buildTheme('light')}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<div>Private dashboard</div>} />
              <Route path="/trades" element={<div>Private trades</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('login', () => {
  it('redirects to the login page when there is no session', async () => {
    mockApi({ 'GET /api/auth/me': unauthenticated });
    renderApp('/trades');
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText('Private trades')).toBeNull();
  });

  it('shows an error for wrong credentials and stays on the login page', async () => {
    mockApi({
      'GET /api/auth/me': unauthenticated,
      'POST /api/auth/login': () =>
        new Response(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.', details: { attempts_left: 2 } } }), { status: 401 }),
    });
    renderApp('/');
    await userEvent.type(await screen.findByLabelText('Email'), 'someone@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'guess');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/2 attempts left before a 15-minute lock-out/)).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).toBeNull();
  });

  it('logs in and returns to the page that was requested', async () => {
    const calls = mockApi({
      'GET /api/auth/me': unauthenticated,
      'POST /api/auth/login': { email: 'owner@example.com', expires_at: 9999999999 },
    });
    renderApp('/trades');
    await userEvent.type(await screen.findByLabelText('Email'), ' owner@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Private trades')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/api/auth/login')?.body).toEqual({ email: 'owner@example.com', password: 'secret' });
  });
});
