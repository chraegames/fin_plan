// The one hooked component in the guide — imported only by App.tsx, never by
// the prerender tree (useTheme → analytics → import.meta.env).

import { Button } from '../../../components/primitives/Button';
import { Icon } from '../../../components/primitives/Icon';
import { useTheme } from '../../../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="md"
      onClick={toggle}
      leading={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />}
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      aria-label="Toggle theme"
    />
  );
}
