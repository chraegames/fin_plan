import type { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { Logo } from './Logo';
import type { Profile, Scenario } from '../../models/types';

interface AppBarProps {
  profile: Profile;
  scenario: Scenario;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: () => void;
  onAbout: () => void;
  onHistory: () => void;
  onHome: () => void;
  rightSlot?: ReactNode;
}

export function AppBar({
  profile,
  scenario,
  theme,
  onToggleTheme,
  onExport,
  onImport,
  onAbout,
  onHistory,
  onHome,
  rightSlot,
}: AppBarProps) {
  const initial = profile.name.trim().charAt(0).toUpperCase() || '·';
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 56,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border-soft)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <button
          onClick={onHome}
          style={{ display: 'flex', alignItems: 'center', gap: 9 }}
          title="Home"
        >
          <Logo />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 17,
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
            }}
          >
            FIRE Planner
          </span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 30,
            padding: '0 12px',
            gap: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Scenario</span>
          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
            {scenario.name}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {rightSlot}
        <Button variant="ghost" size="md" onClick={onHistory} leading={<Icon name="calendar" />}>
          History
        </Button>
        <Button variant="ghost" size="md" onClick={onExport} leading={<Icon name="download" />}>
          Export
        </Button>
        <Button variant="ghost" size="md" onClick={onImport} leading={<Icon name="upload" />}>
          Import
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={onToggleTheme}
          leading={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          aria-label="Toggle theme"
        />
        <Button variant="ghost" size="md" onClick={onAbout} leading={<Icon name="info" />}>
          About
        </Button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px 0 8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            height: 32,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 99,
              background: 'var(--accent)',
              color: 'oklch(0.995 0.005 80)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
            {profile.name}
          </span>
        </div>
      </div>
    </header>
  );
}
