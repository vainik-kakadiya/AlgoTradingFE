import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../services/api';
import type { StrategyVersion, ValidationResult } from '../types/api';
import { dateTime } from '../utils/format';
import { JsonBlock, PageHeader, QueryView, Section } from '../components/common/Layout';
import DataTable from '../components/common/DataTable';
import StrategyEditor, { RuleSummary, ValidationPanel } from '../components/strategies/StrategyEditor';

export default function StrategyDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const strategy = useQuery({ queryKey: ['strategies', id], queryFn: () => api.strategy(id) });
  const versions = useQuery({ queryKey: ['strategies', id, 'versions'], queryFn: () => api.versions(id) });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ severity: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [dupOpen, setDupOpen] = useState(false);

  const selected: StrategyVersion | undefined = useMemo(
    () => versions.data?.find((v) => v.id === selectedId) ?? versions.data?.[0],
    [versions.data, selectedId],
  );
  const summary = useQuery({
    queryKey: ['strategies', id, 'summary', selected?.id],
    queryFn: () => api.validate(selected!.config_json, id),
    enabled: Boolean(selected),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['strategies'] });
  const toggle = useMutation({ mutationFn: (enabled: boolean) => api.updateStrategy(id, { is_enabled: enabled }), onSuccess: invalidate });
  const saveVersion = useMutation({
    mutationFn: ({ config, notes }: { config: StrategyVersion['config_json']; notes: string }) => api.createVersion(id, config, notes || undefined),
    onSuccess: (v) => {
      invalidate();
      setSelectedId(v.id);
      setMessage({ severity: 'success', text: `Saved as version ${v.version_number}. Earlier versions and their results are unchanged.` });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'UNCHANGED_CONFIG') setMessage({ severity: 'info', text: e.message });
    },
  });
  const saveError = saveVersion.error instanceof ApiError && saveVersion.error.code === 'INVALID_STRATEGY_CONFIG' ? (saveVersion.error.details as ValidationResult) : null;

  return (
    <QueryView query={strategy}>
      {(s) => (
        <>
          <PageHeader
            title={s.name}
            subtitle={<>Key <code>{s.strategy_key}</code> · {s.version_count} version(s)</>}
            actions={
              <>
                <FormControlLabel control={<Switch checked={s.is_enabled} onChange={(e) => toggle.mutate(e.target.checked)} />} label={s.is_enabled ? 'Enabled' : 'Disabled'} />
                <Button variant="outlined" onClick={() => setDupOpen(true)}>Duplicate</Button>
              </>
            }
          />
          {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

          <Section title="Versions" dense>
            <QueryView query={versions}>
              {(rows) => (
                <DataTable
                  rows={rows}
                  rowKey={(v) => v.id}
                  onRowClick={(v) => setSelectedId(v.id)}
                  columns={[
                    { key: 'v', label: 'Version', render: (v) => <Chip size="small" label={`v${v.version_number}`} color={v.id === selected?.id ? 'primary' : 'default'} /> },
                    { key: 'created', label: 'Created (IST)', render: (v) => dateTime(v.created_at) },
                    { key: 'hash', label: 'Fingerprint', render: (v) => <code>{v.config_hash.slice(0, 12)}</code> },
                    { key: 'notes', label: 'Notes', render: (v) => v.notes ?? '—' },
                    {
                      key: 'actions',
                      label: '',
                      render: (v) => (
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/backtests?version=${v.id}`); }}>Backtest</Button>
                          <Button size="small" disabled={!s.is_enabled} onClick={(e) => { e.stopPropagation(); navigate(`/paper?version=${v.id}`); }}>Paper trade</Button>
                        </Stack>
                      ),
                    },
                  ]}
                />
              )}
            </QueryView>
          </Section>

          {selected && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '3fr 2fr' }, gap: 2 }}>
              <Section title={`Edit (creates a new version from v${selected.version_number})`}>
                {saveError && <ValidationPanel result={saveError} />}
                {saveVersion.isError && !saveError && !(saveVersion.error instanceof ApiError && saveVersion.error.code === 'UNCHANGED_CONFIG') && (
                  <Alert severity="error" sx={{ mb: 2 }}>{(saveVersion.error as Error).message}</Alert>
                )}
                <StrategyEditor
                  initial={selected.config_json}
                  strategyId={id}
                  saveLabel="Save as new version"
                  saving={saveVersion.isPending}
                  onSave={(config, notes) => saveVersion.mutate({ config, notes })}
                />
              </Section>
              <Box>
                <Section title={`v${selected.version_number} rules`}>
                  {summary.data ? <RuleSummary lines={summary.data.summary} /> : null}
                  {summary.data?.warnings.map((w, i) => <Alert key={i} severity="warning" sx={{ mt: 1 }}>{w}</Alert>)}
                </Section>
                <Section title={`v${selected.version_number} stored configuration`}>
                  <JsonBlock value={selected.config_json} maxHeight={520} />
                </Section>
              </Box>
            </Box>
          )}
          <DuplicateDialog open={dupOpen} onClose={() => setDupOpen(false)} strategyId={id} baseName={s.name} onDone={(newId) => navigate(`/strategies/${newId}`)} />
        </>
      )}
    </QueryView>
  );
}

function DuplicateDialog({ open, onClose, strategyId, baseName, onDone }: { open: boolean; onClose: () => void; strategyId: number; baseName: string; onDone: (id: number) => void }) {
  const [name, setName] = useState(`${baseName} (copy)`);
  const [key, setKey] = useState('');
  const queryClient = useQueryClient();
  const dup = useMutation({
    mutationFn: () => api.duplicateStrategy(strategyId, name, key),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      onClose();
      onDone(s.id);
    },
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Duplicate strategy</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField size="small" label="New stable key" value={key} onChange={(e) => setKey(e.target.value.toLowerCase())} />
          {dup.isError && <Alert severity="error">{(dup.error as Error).message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!key || dup.isPending} onClick={() => dup.mutate()}>Duplicate latest version</Button>
      </DialogActions>
    </Dialog>
  );
}
