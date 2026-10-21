import { useState, type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material';
import { EmptyState } from './Layout';

export interface Column<T> {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  empty?: string;
  emptyHint?: ReactNode;
  maxHeight?: number;
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({ rows, columns, rowKey, empty = 'No data', emptyHint, maxHeight, pageSize, onRowClick }: Props<T>) {
  const [page, setPage] = useState(0);
  if (!rows.length) return <EmptyState title={empty}>{emptyHint}</EmptyState>;
  const visible = pageSize ? rows.slice(page * pageSize, page * pageSize + pageSize) : rows;
  return (
    <>
      <TableContainer sx={{ maxHeight, overflowX: 'auto' }}>
        <Table size="small" stickyHeader={Boolean(maxHeight)}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ fontWeight: 600, width: c.width }}>
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={rowKey(row)} hover onClick={onRowClick ? () => onRowClick(row) : undefined} sx={onRowClick ? { cursor: 'pointer' } : undefined}>
                {columns.map((c) => (
                  <TableCell key={c.key} align={c.align}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pageSize && rows.length > pageSize && (
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          onPageChange={(_, p) => setPage(p)}
        />
      )}
    </>
  );
}
