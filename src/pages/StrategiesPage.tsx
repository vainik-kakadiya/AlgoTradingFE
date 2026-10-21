import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Dialog, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../services/api';
import type { StrategyConfig } from '../types/api';
import { dateTime, timeframe } from '../utils/format';
import { PageHeader, QueryView, Section } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';
import { StatusChip } from '../components/common/StatusChips';
import StrategyEditor, { ValidationPanel } from '../components/strategies/StrategyEditor';

export default function StrategiesPage() {
  const navigate = useNavigate();
  const strategies = useQuery({ queryKey: ['strategies'], queryFn: api.strategies });
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="Strategies"
        subtitle="Versioned, validated strategy configurations. Every backtest and paper session records the exact version it used."
        actions={<Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>New strategy</Button>}
      />
      <Section>
        <QueryView query={strategies}>
          {(rows) => (
            <DataTable
              rows={rows}
              rowKey={(s) => s.id}
              empty="No strategies yet"
              emptyHint="Create one from the NIFTY 3-Minute Momentum template."
              onRowClick={(s) => navigate(`/strategies/${s.id}`)}
              columns={[
                { key: 'name', label: 'Name', render: (s) => s.name },
                { key: 'key', label: 'Key', render: (s) => s.strategy_key },
                { key: 'type', label: 'Type', render: (s) => String(s.latest_version?.config_json.strategy_type ?? '—') },
                { key: 'underlying', label: 'Underlying', render: (s) => String(s.latest_version?.config_json.underlying ?? '—') },
                { key: 'tf', label: 'Interval', render: (s) => timeframe(s.latest_version?.config_json.timeframe_seconds) },
                { key: 'version', label: 'Latest version', render: (s) => `v${s.latest_version?.version_number ?? '?'} of ${s.version_count}` },
                { key: 'enabled', label: 'Status', render: (s) => <StatusChip status={s.is_enabled ? 'ENABLED' : 'DISABLED'} /> },
                { key: 'updated', label: 'Updated (IST)', render: (s) => dateTime(s.latest_version?.created_at ?? s.updated_at) },
              ]}
            />
          )}
        </QueryView>
      </Section>
      <CreateStrategyDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/strategies/${id}`)} />
    </>
  );
}

function CreateStrategyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ['strategy-templates'], queryFn: api.strategyTemplates, enabled: open });
  const [template, setTemplate] = useState('nifty_momentum');
  const [name, setName] = useState('NIFTY 3-Minute Momentum');
  const [key, setKey] = useState('nifty_3m_momentum_v1');
  const create = useMutation({
    mutationFn: ({ config, notes }: { config: StrategyConfig; notes: string }) =>
      api.createStrategy({ name, strategy_key: key, description: notes || undefined, config: { ...config, strategy_id: key, name } }),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      onClose();
      onCreated(s.id);
    },
  });
  const apiError = create.error instanceof ApiError ? create.error : null;
  const validation = apiError?.code === 'INVALID_STRATEGY_CONFIG' ? (apiError.details as Parameters<typeof ValidationPanel>[0]['result']) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>New strategy</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1, mb: 2 }}>
          <TextField size="small" select label="Template" value={template} onChange={(e) => setTemplate(e.target.value)} sx={{ minWidth: 240 }}>
            <MenuItem value="nifty_momentum">NIFTY 3-Minute Momentum</MenuItem>
            <MenuItem value="rule_based">Rule-based (EMA cross example)</MenuItem>
          </TextField>
          <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ flexGrow: 1 }} />
          <TextField size="small" label="Stable key" value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} helperText="lowercase, digits, _ or -" />
        </Stack>
        {create.isError && !validation && <Alert severity="error" sx={{ mb: 2 }}>{(create.error as Error).message}</Alert>}
        {validation && <ValidationPanel result={validation} />}
        <QueryView query={templates}>
          {(t) => (
            <StrategyEditor
              initial={t[template]}
              saveLabel="Create strategy (v1)"
              saving={create.isPending}
              onSave={(config, notes) => create.mutate({ config, notes })}
            />
          )}
        </QueryView>
      </DialogContent>
    </Dialog>
  );
}
