// ─────────────────────────────────────────────────────────────
// RepairTrack — Theme Context
// Provides Dark/Light theme state and persistence.
// Default theme: 'light'
// LocalStorage key: 'repairtrack-theme'
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const THEME_STORAGE_KEY = 'repairtrack-theme';
export const THEMES = {
  LIGHT: 'light',
  DARK:  'dark',
};

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === THEMES.DARK || saved === THEMES.LIGHT) {
      return saved;
    }
  } catch (e) {
    // LocalStorage unavailable (e.g. incognito restrictions)
  }
  return THEMES.LIGHT;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Synchronize document <html> classes and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === THEMES.DARK) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      // ignore storage errors
    }
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme === THEMES.DARK || newTheme === THEMES.LIGHT) {
      setThemeState(newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((curr) => (curr === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  const isDark = theme === THEMES.DARK;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
