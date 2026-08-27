// Shared inline-style constants for the guide (tokens only — see styles.ts for
// the class-based rules). Kept in a .ts so .tsx files export components only.

import type { CSSProperties } from 'react';
import type { Family, TechStatus } from '../data';

export const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--accent)',
};

export const h1: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontWeight: 400,
  fontSize: 'clamp(38px, 4.6vw, 68px)',
  letterSpacing: '-0.03em',
  lineHeight: 1.02,
  color: 'var(--ink)',
  margin: 0,
  textWrap: 'pretty',
};

export const lede: CSSProperties = {
  fontSize: 16,
  color: 'var(--ink-2)',
  lineHeight: 1.65,
  margin: 0,
  maxWidth: 680,
};

export const small: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-3)' };

export const cardTitle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  color: 'var(--ink)',
  margin: 0,
};

export const crumb: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--ink-3)',
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
