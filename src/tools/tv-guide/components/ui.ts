// Shared inline-style constants for the guide (tokens only — see styles.ts for
// the class-based rules). Kept in a .ts so .tsx files export components only.

import type { CSSProperties } from 'react';
import type { Family, TechStatus } from '../data';

export const eyebrow: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent-ink)',
};

export const h1: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 400,
  fontSize: 'clamp(30px, 5.5vw, 48px)',
  letterSpacing: '-0.03em',
  lineHeight: 1.08,
  color: 'var(--ink)',
  margin: 0,
};

export const lede: CSSProperties = {
  fontSize: 'clamp(15px, 2.4vw, 18px)',
  color: 'var(--ink-3)',
  lineHeight: 1.55,
  margin: 0,
  maxWidth: 680,
};

export const small: CSSProperties = { margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-3)' };

export const cardTitle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 19,
  letterSpacing: '-0.02em',
  color: 'var(--ink)',
  margin: 0,
};

export const crumb: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent-ink)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export function familyChipClass(family: Family): string {
  return family === 'oled' ? 'tvg-chip tvg-chip-oled' : 'tvg-chip tvg-chip-lcd';
}

export function statusChipClass(status: TechStatus): string {
  return status === 'new' ? 'tvg-chip tvg-chip-new' : 'tvg-chip tvg-chip-muted';
}

export const STATUS_LABEL: Record<TechStatus, string> = {
  mainstream: 'Mainstream',
  new: 'New in 2026',
  legacy: 'Older tech',
};

export const FAMILY_LABEL: Record<Family, string> = { lcd: 'LCD', oled: 'OLED' };
