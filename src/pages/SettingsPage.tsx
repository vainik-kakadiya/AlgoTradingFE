import { useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { dateOnly } from '../utils/format';
import { JsonBlock, PageHeader, QueryView, Section } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';

export default function SettingsPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings });
  const login = useMutation({ mutationFn: api.kiteLoginUrl, onSuccess: (r) => { window.location.href = r.login_url; } });
  const logout = useMutation({ mutationFn: api.kiteLogout, onSuccess: () => queryClient.invalidateQueries() });
  const kiteResult = params.get('kite');

  return (
    <>
      <PageHeader title="Settings" subtitle="Backend configuration (read-only here; edit AlgoTradingPy/.env and restart). Secrets are never sent to the browser." />
      {kiteResult === 'connected' && <Alert severity="success" sx={{ mb: 2 }}>Kite session established.</Alert>}
      {kiteResult === 'failed' && <Alert severity="error" sx={{ mb: 2 }}>Kite login failed or was cancelled.</Alert>}
      <QueryView query={settings}>
        {(s) => (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Paper-only execution</AlertTitle>
              This application has no real-order capability: the Kite client is wrapped so only market-data methods are reachable, and no setting can change that.
            </Alert>
            <Section title="Zerodha Kite Connect (market data)">
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={s.kite_api_key_configured ? 'API key configured' : 'API key missing'} color={s.kite_api_key_configured ? 'success' : 'warning'} />
                  <Chip size="small" label={s.kite_api_secret_configured ? 'API secret configured' : 'API secret missing'} color={s.kite_api_secret_configured ? 'success' : 'warning'} />
                  <Chip size="small" label={s.kite.authenticated ? `Logged in${s.kite.user_id ? ` as ${s.kite.user_id}` : ''} (${dateOnly(s.kite.token_date)})` : 'Not logged in today'}
                    color={s.kite.authenticated ? 'success' : 'default'} />
                </Stack>
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="contained" disabled={!s.kite.configured || login.isPending} onClick={() => login.mutate()}>Log in to Kite</Button>
                <Button variant="outlined" disabled={!s.kite.authenticated} onClick={() => logout.mutate()}>Log out</Button>
              </Stack>
              {login.isError && <Alert severity="error" sx={{ mt: 2 }}>{(login.error as Error).message}</Alert>}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Set the redirect URL of your Kite Connect app to <code>{s.kite_redirect_url}</code>. Access tokens expire daily and are stored only by the backend.
              </Typography>
            </Section>
            <Section title="Backend configuration">
              <DataTable
                rows={[
                  ['API', `${s.api_host}:${s.api_port}`],
                  ['Database', s.database],
                  ['Instrument master underlyings', s.instrument_underlyings.join(', ')],
                  ['Auto-start feed on restart', String(s.auto_start_feed)],
                  ['Capture raw ticks', String(s.capture_ticks)],
                  ['Capture 1-second bars', String(s.capture_second_bars)],
                  ['Feed stale after', `${s.feed_stale_seconds}s`],
                  ['Execution mode', s.execution_mode],
                ]}
                rowKey={([k]) => k}
                columns={[{ key: 'k', label: 'Setting', render: ([k]) => k }, { key: 'v', label: 'Value', render: ([, v]) => v }]}
              />
            </Section>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Section title="Default transaction costs"><JsonBlock value={s.defaults.costs} /></Section>
              <Section title="Default execution model"><JsonBlock value={s.defaults.execution} /></Section>
            </Box>
          </>
        )}
      </QueryView>
    </>
  );
}
