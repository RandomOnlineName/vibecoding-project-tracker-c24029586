/**
 * useTheme — light / dark colour theme.
 * The inline script in index.html sets <html data-theme> before first paint;
 * this hook reads it, toggles it and saves the choice in localStorage under 'vt_theme'.
 * Exposes: { theme, toggleTheme }
 */
import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'vt_theme';
const THEME_COLORS = { dark: '#17181b', light: '#f7f7f8' }; // surface-page per theme

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked: theme still applies this session */ }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
