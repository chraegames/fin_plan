import { useCallback, useEffect, useState } from 'react';
import { track } from '../utils/analytics';
import { THEME_KEY, safeSetItem } from '../utils/persistence';

export type Theme = 'light' | 'dark';

// Must agree with THEME_BOOT_SCRIPT in scripts/head.ts, which applies the same
// rule before first paint — otherwise the page would flip theme on mount.
function readInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // storage unavailable — fall through to the OS preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeSetItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(
    () =>
      setThemeState(prev => {
        const next = prev === 'dark' ? 'light' : 'dark';
        track('theme_toggled', { theme: next });
        return next;
      }),
    [],
  );

  return { theme, toggle, setTheme };
}
