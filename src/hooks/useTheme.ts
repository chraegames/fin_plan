import { useCallback, useEffect, useState } from 'react';
import { track } from '../utils/analytics';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'firePlannerTheme';

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_KEY, theme);
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
