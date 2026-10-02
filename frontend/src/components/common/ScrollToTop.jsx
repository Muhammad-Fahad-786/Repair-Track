// ─────────────────────────────────────────────────────────────
// RepairTrack — ScrollToTop Handler
// Ensures proper scroll position on route transitions while
// preserving smooth scrolling for anchor sections (#find-shops).
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash, state } = useLocation();

  useEffect(() => {
    // If navigation was already handled smoothly on same-page click, skip redundant scroll
    if (state?.scrolledByClick) return;

    const targetId = state?.scrollTo || (hash ? hash.replace('#', '') : null);

    if (targetId) {
      // Element anchor navigation (e.g. How It Works) when navigating from another page
      const isPrefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior = isPrefersReduced ? 'auto' : 'smooth';

      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior, block: 'start' });
        }
      }, 60);

      return () => clearTimeout(timer);
    }

    // Normal page navigation (e.g. /shops, /track, /login, /shops/:slug)
    // Instantly reset scroll to top so user never lands in the middle of a page
    if (!state?.keepScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname, hash, state]);

  return null;
}
