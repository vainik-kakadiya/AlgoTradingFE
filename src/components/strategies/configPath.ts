import type { StrategyConfig } from '../../types/api';

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

/** Immutable set of a dotted path; creates intermediate objects as needed. */
export function setPath(obj: StrategyConfig, path: string, value: unknown): StrategyConfig {
  const keys = path.split('.');
  const clone: Record<string, unknown> = { ...obj };
  let cursor = clone;
  keys.slice(0, -1).forEach((k) => {
    const next = cursor[k];
    cursor[k] = next && typeof next === 'object' && !Array.isArray(next) ? { ...(next as Record<string, unknown>) } : {};
    cursor = cursor[k] as Record<string, unknown>;
  });
  cursor[keys[keys.length - 1]] = value;
  return clone as StrategyConfig;
}
