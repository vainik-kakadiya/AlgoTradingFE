import { Accordion, AccordionDetails, AccordionSummary, Box, FormControlLabel, MenuItem, Switch, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { CostConfig, ExecutionConfig } from '../../types/api';

const COST_FIELDS: { key: keyof CostConfig; label: string }[] = [
  { key: 'brokerage_per_order', label: 'Brokerage per order (₹)' },
  { key: 'options_stt_sell_pct', label: 'Options STT on sell (%)' },
  { key: 'options_exchange_txn_pct', label: 'Options exchange txn (%)' },
  { key: 'futures_stt_sell_pct', label: 'Futures STT on sell (%)' },
  { key: 'futures_exchange_txn_pct', label: 'Futures exchange txn (%)' },
  { key: 'sebi_fee_pct', label: 'SEBI fee (%)' },
  { key: 'stamp_duty_buy_pct_options', label: 'Stamp duty options buy (%)' },
  { key: 'stamp_duty_buy_pct_futures', label: 'Stamp duty futures buy (%)' },
  { key: 'gst_pct', label: 'GST (%)' },
];

interface Props {
  costs: CostConfig;
  execution: ExecutionConfig;
  onCosts: (c: CostConfig) => void;
  onExecution: (e: ExecutionConfig) => void;
}

/** Editable transaction-cost, slippage and fill-model assumptions. Values are stored with each run. */
export default function AssumptionsForm({ costs, execution, onCosts, onExecution }: Props) {
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1.5 };
  return (
    <>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            Slippage & execution model · {execution.slippage.points} pts slippage, {execution.price_source === 'BID_ASK' ? 'bid/ask' : 'LTP'} fills, limit {execution.limit_fill_rule.toLowerCase().replace('_', '-')}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={grid}>
            <TextField size="small" type="number" label="Slippage (points per fill)" value={execution.slippage.points} inputProps={{ step: 0.05, min: 0 }}
              onChange={(e) => onExecution({ ...execution, slippage: { ...execution.slippage, points: Number(e.target.value) } })} />
            <TextField size="small" type="number" label="Slippage (% of price)" value={execution.slippage.pct} inputProps={{ step: 0.01, min: 0 }}
              onChange={(e) => onExecution({ ...execution, slippage: { ...execution.slippage, pct: Number(e.target.value) } })} />
            <TextField size="small" select label="Market fill price" value={execution.price_source}
              onChange={(e) => onExecution({ ...execution, price_source: e.target.value as ExecutionConfig['price_source'] })}>
              <MenuItem value="BID_ASK">Ask for buys / bid for sells</MenuItem>
              <MenuItem value="LTP">Last traded price</MenuItem>
            </TextField>
            <TextField size="small" select label="Limit fill rule" value={execution.limit_fill_rule}
              onChange={(e) => onExecution({ ...execution, limit_fill_rule: e.target.value as ExecutionConfig['limit_fill_rule'] })}>
              <MenuItem value="TRADE_THROUGH">Price must trade through</MenuItem>
              <MenuItem value="TOUCH">Touch is enough (optimistic)</MenuItem>
            </TextField>
            <TextField size="small" type="number" label="Max quote age (s)" value={execution.max_quote_age_seconds} inputProps={{ min: 0.1, step: 0.5 }}
              onChange={(e) => onExecution({ ...execution, max_quote_age_seconds: Number(e.target.value) })} />
            <FormControlLabel control={<Switch checked={execution.allow_ltp_fallback} onChange={(e) => onExecution({ ...execution, allow_ltp_fallback: e.target.checked })} />}
              label="Allow LTP when bid/ask missing" />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Ambiguous bars where stop and target are both reachable always assume the stop first. Stops that gap through fill at the gap price.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion disableGutters variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Transaction costs · {costs.enabled ? `₹${costs.brokerage_per_order}/order + statutory charges` : 'disabled'}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel control={<Switch checked={costs.enabled} onChange={(e) => onCosts({ ...costs, enabled: e.target.checked })} />} label="Apply transaction costs" />
          <Box sx={{ ...grid, mt: 1 }}>
            {COST_FIELDS.map((f) => (
              <TextField key={f.key} size="small" type="number" label={f.label} value={costs[f.key] as number} disabled={!costs.enabled}
                inputProps={{ step: 0.0001, min: 0 }} onChange={(e) => onCosts({ ...costs, [f.key]: Number(e.target.value) })} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Defaults approximate Zerodha F&O charges; statutory rates change, so verify them. The values used are saved with every result.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
