import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { EmptyState } from '../components/common/Layout';

export default function NotFoundPage() {
  return (
    <EmptyState title="Page not found">
      <Link component={RouterLink} to="/">Back to the dashboard</Link>
    </EmptyState>
  );
}
