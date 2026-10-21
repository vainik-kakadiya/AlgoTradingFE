import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { CostConfig, ExecutionConfig } from '../types/api';

/** Editable copies of the backend's default cost and execution assumptions. */
export function useAssumptionDefaults() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings, staleTime: 60_000 });
  const [costs, setCosts] = useState<CostConfig | null>(null);
  const [execution, setExecution] = useState<ExecutionConfig | null>(null);
  useEffect(() => {
    if (settings.data && !costs) {
      setCosts(settings.data.defaults.costs);
      setExecution(settings.data.defaults.execution);
    }
  }, [settings.data, costs]);
  return { costs, execution, setCosts, setExecution, error: settings.error };
}
