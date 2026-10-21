import { useMemo } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { buildTheme } from './theme';
import MainLayout from '../layouts/MainLayout';
import { useLiveUpdates } from '../hooks/useLiveUpdates';
import DashboardPage from '../pages/DashboardPage';
import StrategiesPage from '../pages/StrategiesPage';
import StrategyDetailPage from '../pages/StrategyDetailPage';
import InstrumentsPage from '../pages/InstrumentsPage';
import MarketDataPage from '../pages/MarketDataPage';
import BacktestsPage from '../pages/BacktestsPage';
import BacktestDetailPage from '../pages/BacktestDetailPage';
import PaperTradingPage from '../pages/PaperTradingPage';
import PaperSessionPage from '../pages/PaperSessionPage';
import TradesPage from '../pages/TradesPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import LogsPage from '../pages/LogsPage';
import SettingsPage from '../pages/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 2_000, refetchOnWindowFocus: true } },
});

function LiveUpdates() {
  useLiveUpdates();
  return null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="strategies" element={<StrategiesPage />} />
        <Route path="strategies/:id" element={<StrategyDetailPage />} />
        <Route path="instruments" element={<InstrumentsPage />} />
        <Route path="market-data" element={<MarketDataPage />} />
        <Route path="backtests" element={<BacktestsPage />} />
        <Route path="backtests/:id" element={<BacktestDetailPage />} />
        <Route path="paper" element={<PaperTradingPage />} />
        <Route path="paper/:id" element={<PaperSessionPage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(() => buildTheme(prefersDark ? 'dark' : 'light'), [prefersDark]);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LiveUpdates />
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
