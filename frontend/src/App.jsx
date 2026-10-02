// ─────────────────────────────────────────────────────────────
// RepairTrack — Root Application Component
// ─────────────────────────────────────────────────────────────

import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider }    from './context/ThemeContext';
import { AuthProvider }     from './context/AuthContext';
import { AppStateProvider } from './context/AppStateContext';
import AppRoutes            from './routes/AppRoutes';
import ScrollToTop          from './components/common/ScrollToTop';

/**
 * App root component:
 * - ThemeProvider wraps application for dark/light theme state.
 * - AuthProvider wraps the entire application for auth state.
 * - AppStateProvider manages platform mock state with persistence.
 * - BrowserRouter wraps routing infrastructure.
 * - ScrollToTop handles resetting scroll position on route changes.
 * - AppRoutes handles all route definitions.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppStateProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
        </AppStateProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
