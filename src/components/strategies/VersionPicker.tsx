import { useEffect, useState } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { timeframe } from '../../utils/format';

interface Props {
  versionId: number | '';
  onChange: (versionId: number | '') => void;
  initialVersionId?: number;
  enabledOnly?: boolean;
}

/** Strategy + version selector. Every run records the exact version chosen here. */
export default function VersionPicker({ versionId, onChange, initialVersionId, enabledOnly }: Props) {
  const strategies = useQuery({ queryKey: ['strategies'], queryFn: api.strategies });
  const [strategyId, setStrategyId] = useState<number | ''>('');
  const versions = useQuery({ queryKey: ['strategies', strategyId, 'versions'], queryFn: () => api.versions(Number(strategyId)), enabled: strategyId !== '' });

  // Preselect the strategy owning ?version=… when arriving from the strategy page.
  useEffect(() => {
    if (!initialVersionId || strategyId !== '' || !strategies.data) return;
    Promise.all(strategies.data.map((s) => api.versions(s.id).then((vs) => ({ s, vs })))).then((all) => {
      const owner = all.find(({ vs }) => vs.some((v) => v.id === initialVersionId));
      if (owner) {
        setStrategyId(owner.s.id);
        onChange(initialVersionId);
      }
    });
  }, [initialVersionId, strategies.data, strategyId, onChange]);

  useEffect(() => {
    if (versions.data?.length && versionId === '') onChange(versions.data[0].id);
  }, [versions.data, versionId, onChange]);

  const list = (strategies.data ?? []).filter((s) => !enabledOnly || s.is_enabled);
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField size="small" select label="Strategy" value={strategyId} sx={{ minWidth: 240 }}
        onChange={(e) => { setStrategyId(Number(e.target.value)); onChange(''); }}>
        {list.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
      </TextField>
      <TextField size="small" select label="Version" value={versions.data?.some((v) => v.id === versionId) ? versionId : ''} sx={{ minWidth: 220 }}
        onChange={(e) => onChange(Number(e.target.value))} disabled={strategyId === ''}>
        {(versions.data ?? []).map((v) => (
          <MenuItem key={v.id} value={v.id}>
            v{v.version_number} · {String(v.config_json.underlying)} {timeframe(v.config_json.timeframe_seconds)} · {v.config_hash.slice(0, 8)}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
