import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  FormControlLabel,
  List,
  ListItem,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { StrategyConfig, ValidationResult } from '../../types/api';
import { getPath, setPath } from './configPath';

const UNDERLYINGS = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'];
const TIMEFRAMES = [60, 180, 300, 600, 900, 1800, 3600];

interface Props {
  initial: StrategyConfig;
  strategyId?: number;
  saveLabel: string;
  saving?: boolean;
  extraFields?: ReactNode;
  onSave: (config: StrategyConfig, notes: string) => void;
}

function Grid({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5, mb: 2 }}>{children}</Box>;
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle2" color="primary" sx={{ mb: 1, mt: 1 }}>
      {children}
    </Typography>
  );
}

export default function StrategyEditor({ initial, strategyId, saveLabel, saving, extraFields, onSave }: Props) {
  const [config, setConfig] = useState<StrategyConfig>(initial);
  const [tab, setTab] = useState(0);
  const [jsonText, setJsonText] = useState(JSON.stringify(initial, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    setConfig(initial);
    setJsonText(JSON.stringify(initial, null, 2));
    setResult(null);
  }, [initial]);

  const validate = useMutation({ mutationFn: (c: StrategyConfig) => api.validate(c, strategyId), onSuccess: setResult });

  const type = (config.strategy_type as string) ?? ('rules' in config ? 'rule_based' : 'nifty_momentum');
  const update = (path: string, value: unknown) => {
    const next = setPath(config, path, value);
    setConfig(next);
    setJsonText(JSON.stringify(next, null, 2));
    setResult(null);
  };

  const num = (path: string, label: string, opts: { step?: number; nullable?: boolean; helper?: string } = {}) => (
    <TextField
      size="small"
      type="number"
      label={label}
      helperText={opts.helper}
      value={(getPath(config, path) as number | null | undefined) ?? ''}
      inputProps={{ step: opts.step ?? 1 }}
      onChange={(e) => update(path, e.target.value === '' ? (opts.nullable ? null : undefined) : Number(e.target.value))}
    />
  );
  const select = (path: string, label: string, options: [string | number, string][], fallback?: string | number) => (
    <TextField size="small" select label={label} value={(getPath(config, path) as string | number | undefined) ?? fallback ?? ''} onChange={(e) => update(path, e.target.value)}>
      {options.map(([v, l]) => (
        <MenuItem key={v} value={v}>
          {l}
        </MenuItem>
      ))}
    </TextField>
  );
  const bool = (path: string, label: string, fallback: boolean) => (
    <FormControlLabel
      control={<Switch checked={(getPath(config, path) as boolean | undefined) ?? fallback} onChange={(e) => update(path, e.target.checked)} />}
      label={label}
    />
  );
  const time = (path: string, label: string, fallback: string) => (
    <TextField size="small" type="time" label={label} inputProps={{ step: 60 }} value={((getPath(config, path) as string | undefined) ?? fallback).slice(0, 5)}
      onChange={(e) => update(path, `${e.target.value}:00`)} />
  );

  const applyJson = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) throw new Error('Configuration must be a JSON object');
      setConfig(parsed);
      setJsonError(null);
      setResult(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const ruleField = (path: string, label: string) => {
    const value = getPath(config, path);
    return (
      <TextField
        key={`${path}-${JSON.stringify(value)}`}
        label={label}
        multiline
        minRows={4}
        fullWidth
        defaultValue={value ? JSON.stringify(value, null, 2) : ''}
        helperText="JSON rule tree, e.g. {&quot;op&quot;: &quot;gt&quot;, &quot;left&quot;: {&quot;type&quot;: &quot;field&quot;, &quot;name&quot;: &quot;range&quot;}, &quot;right&quot;: 100}. Leave empty to disable."
        onBlur={(e) => {
          const text = e.target.value.trim();
          if (!text) return update(path, null);
          try {
            update(path, JSON.parse(text));
          } catch {
            setJsonError(`${label}: invalid JSON`);
          }
        }}
        sx={{ mb: 1.5, '& textarea': { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } }}
      />
    );
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Form" />
        <Tab label="JSON" />
      </Tabs>

      {tab === 0 && (
        <Box>
          {extraFields}
          <Heading>General · {type === 'rule_based' ? 'Rule-based strategy' : 'NIFTY momentum strategy'}</Heading>
          <Grid>
            <TextField size="small" label="Display name" value={(config.name as string) ?? ''} onChange={(e) => update('name', e.target.value)} />
            {select('underlying', 'Underlying', UNDERLYINGS.map((u) => [u, u]), 'NIFTY')}
            {select('timeframe_seconds', 'Candle interval', TIMEFRAMES.map((t) => [t, `${t / 60} minute${t === 60 ? '' : 's'}`]), 180)}
          </Grid>

          {type === 'nifty_momentum' ? (
            <>
              <Heading>Entry (completed signal candle; strict inequalities)</Heading>
              <Grid>
                {num('entry.range_gt', 'Range (H − L) greater than', { step: 1 })}
                {num('entry.absolute_body_gt', '|Close − Open| greater than', { step: 1 })}
              </Grid>
            </>
          ) : (
            <>
              <Heading>Entry rules (evaluated on completed candles)</Heading>
              <Grid>{select('trade_instrument', 'Trade instrument', [['OPTION', 'Options (buy CALL / PUT)'], ['FUTURE', 'Futures (long / short)']], 'OPTION')}</Grid>
              {ruleField('rules.long_entry', 'Long entry rule')}
              {ruleField('rules.short_entry', 'Short entry rule')}
              {ruleField('exits.exit_rule', 'Optional exit rule')}
            </>
          )}

          {(type === 'nifty_momentum' || getPath(config, 'trade_instrument') !== 'FUTURE') && (
            <>
              <Heading>Option selection</Heading>
              <Grid>
                {num('option_selection.target_strike_offset_points', 'Strike offset from spot (points)')}
                {select('option_selection.call_strike_side', 'CALL strike side', [['ABOVE_SPOT', 'Above spot'], ['BELOW_SPOT', 'Below spot']], 'ABOVE_SPOT')}
                {select('option_selection.put_strike_side', 'PUT strike side', [['BELOW_SPOT', 'Below spot'], ['ABOVE_SPOT', 'Above spot']], 'BELOW_SPOT')}
                {select('option_selection.strike_rounding', 'Strike rounding', [['AWAY_FROM_SPOT', 'Away from spot'], ['NEAREST', 'Nearest listed'], ['TOWARD_SPOT', 'Toward spot']], 'AWAY_FROM_SPOT')}
                {num('option_selection.max_strike_deviation_points', 'Max strike deviation (points)')}
                {select('option_selection.expiry_policy', 'Expiry', [['NEAREST_ELIGIBLE', 'Nearest eligible'], ['NEXT_AFTER_NEAREST', 'Next after nearest'], ['NEAREST_MONTHLY', 'Nearest monthly']], 'NEAREST_ELIGIBLE')}
                {num('option_selection.min_days_to_expiry', 'Min days to expiry')}
                {num('option_selection.quantity_lots', 'Quantity (lots)')}
              </Grid>
            </>
          )}
          {type === 'rule_based' && getPath(config, 'trade_instrument') === 'FUTURE' && (
            <>
              <Heading>Futures selection</Heading>
              <Grid>
                {select('future_selection.expiry_policy', 'Expiry', [['NEAREST_ELIGIBLE', 'Nearest eligible'], ['NEXT_AFTER_NEAREST', 'Next after nearest']], 'NEAREST_ELIGIBLE')}
                {num('future_selection.quantity_lots', 'Quantity (lots)')}
              </Grid>
            </>
          )}

          <Heading>Exits ({getPath(config, 'exits.reference') === 'INSTRUMENT_PRICE' ? 'instrument price points' : 'option premium points'})</Heading>
          <Grid>
            {type === 'rule_based' && select('exits.reference', 'Exit reference', [['OPTION_PREMIUM', 'Option premium'], ['INSTRUMENT_PRICE', 'Instrument price (futures)']], 'OPTION_PREMIUM')}
            {num('exits.stop_loss_points', 'Stop-loss (points below entry)', { nullable: true })}
            {num('exits.take_profit_points', 'Take-profit (points above entry)', { nullable: true })}
            {num('exits.max_holding_minutes', 'Max holding time (minutes)', { nullable: true })}
            {bool('exits.square_off_at_session_end', 'Square off at session end', true)}
          </Grid>

          <Heading>Risk limits</Heading>
          <Grid>
            {num('risk.max_open_positions', 'Max open positions')}
            {num('risk.max_lots_per_trade', 'Max lots per trade')}
            {num('risk.max_daily_loss', 'Max daily loss (₹)', { nullable: true })}
            {select('risk.on_daily_loss_breach', 'On daily-loss breach', [['KEEP_PROTECTIVE_EXITS', 'Block entries, keep stops/targets'], ['SQUARE_OFF', 'Block entries and square off']], 'KEEP_PROTECTIVE_EXITS')}
            {num('risk.max_loss_per_trade', 'Per-trade loss budget (₹)', { nullable: true })}
            {num('risk.max_entries_per_day', 'Max entries per day', { nullable: true })}
            {num('risk.stale_data_seconds', 'Stale data after (seconds)')}
            {bool('risk.daily_loss_includes_unrealized', 'Daily loss includes unrealized', true)}
            {bool('risk.allow_reentry_after_exit', 'Allow re-entry after exit', true)}
          </Grid>

          <Heading>Session (IST)</Heading>
          <Grid>
            {time('session.market_open', 'Market open', '09:15:00')}
            {time('session.no_new_entries_after', 'No new entries after', '15:00:00')}
            {time('session.square_off_time', 'Square-off time', '15:15:00')}
            {time('session.market_close', 'Market close', '15:30:00')}
          </Grid>

          <Heading>Execution (paper only)</Heading>
          <Grid>
            {select('execution.entry_order_type', 'Entry order type', [['MARKET', 'Market'], ['LIMIT', 'Limit']], 'MARKET')}
            {num('execution.limit_offset_points', 'Limit offset (points)', { step: 0.05 })}
            {num('execution.limit_timeout_seconds', 'Limit timeout (s)')}
            {select('execution.missing_quote_policy', 'If no valid option quote', [['SKIP', 'Skip entry'], ['DEFER', 'Defer until max delay']], 'SKIP')}
            {num('execution.max_entry_delay_seconds', 'Max entry delay (s)')}
            {num('execution.execution_delay_ms', 'Simulated execution delay (ms)')}
          </Grid>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            Execution mode is fixed to <strong>PAPER</strong>. There is no setting that enables real orders.
          </Alert>
        </Box>
      )}

      {tab === 1 && (
        <TextField
          multiline
          fullWidth
          minRows={18}
          value={jsonText}
          onChange={(e) => applyJson(e.target.value)}
          error={Boolean(jsonError)}
          helperText={jsonError ?? 'Edits are validated by the backend before saving.'}
          sx={{ '& textarea': { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 } }}
        />
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
        <TextField size="small" label="Version notes" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={() => validate.mutate(config)} disabled={validate.isPending || Boolean(jsonError)}>
          Validate
        </Button>
        <Button variant="contained" onClick={() => onSave(config, notes)} disabled={saving || Boolean(jsonError)}>
          {saveLabel}
        </Button>
      </Stack>
      {validate.isError && <Alert severity="error" sx={{ mt: 2 }}>{(validate.error as Error).message}</Alert>}
      {result && <ValidationPanel result={result} />}
    </Box>
  );
}

export function ValidationPanel({ result }: { result: ValidationResult }) {
  return (
    <Box sx={{ mt: 2 }}>
      {result.valid ? (
        <Alert severity="success" sx={{ mb: 1 }}>
          <AlertTitle>Configuration is valid</AlertTitle>
          Fingerprint <Chip size="small" label={result.config_hash?.slice(0, 12)} sx={{ fontFamily: 'monospace' }} />
        </Alert>
      ) : (
        <Alert severity="error" sx={{ mb: 1 }}>
          <AlertTitle>Configuration is invalid</AlertTitle>
          <List dense disablePadding>
            {result.errors.map((e, i) => (
              <ListItem key={i} disableGutters>
                <strong>{e.loc || 'config'}</strong>: {e.msg}
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
      {result.warnings.map((w, i) => (
        <Alert key={i} severity="warning" sx={{ mb: 1 }}>
          {w}
        </Alert>
      ))}
      {result.summary.length > 0 && <RuleSummary lines={result.summary} />}
    </Box>
  );
}

export function RuleSummary({ lines }: { lines: string[] }) {
  return (
    <Alert severity="info" icon={false} variant="outlined">
      <AlertTitle>Strategy rules</AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {lines.map((l, i) => (
          <li key={i}>
            <Typography variant="body2">{l}</Typography>
          </li>
        ))}
      </Box>
    </Alert>
  );
}
