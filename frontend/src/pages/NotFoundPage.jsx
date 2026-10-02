// ─────────────────────────────────────────────────────────────
// RepairTrack — 404 Not Found Page
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { ROUTES } from '../constants';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex-center bg-surface-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="text-center px-4 max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 shadow-card dark:shadow-none">
        <div className="flex-center mb-6">
          <div className="flex-center h-20 w-20 rounded-2xl bg-warning-100 dark:bg-warning-950/60 text-warning-600 dark:text-warning-400 border border-warning-200 dark:border-warning-800/50">
            <AlertTriangle size={40} />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <Button
          as={Link}
          to={ROUTES.HOME}
          variant="primary"
          size="lg"
          leftIcon={<ArrowLeft size={18} />}
          className="w-full sm:w-auto"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
