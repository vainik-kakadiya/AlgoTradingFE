import { createTheme } from '@mui/material/styles';

export function buildTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#1565c0' : '#64b5f6' },
      secondary: { main: '#6a1b9a' },
      success: { main: mode === 'light' ? '#2e7d32' : '#66bb6a' },
      error: { main: mode === 'light' ? '#c62828' : '#ef5350' },
      background: mode === 'light' ? { default: '#f4f6f9', paper: '#ffffff' } : { default: '#0f1419', paper: '#171d24' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'Inter, "Segoe UI", Roboto, system-ui, sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiTableCell: { styleOverrides: { root: { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } } },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  });
}
