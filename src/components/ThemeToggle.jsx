/**
 * ThemeToggle — icon button in the top bar that switches light / dark mode.
 * Shows the mode you'd switch to: a sun in dark mode, a moon in light mode.
 */
import { useTheme } from '../hooks/useTheme.js';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  const label = `Switch to ${next} mode`;

  return (
    <button type="button" onClick={toggleTheme} className="btn-ghost px-2" aria-label={label} title={label}>
      {next === 'light' ? (
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
