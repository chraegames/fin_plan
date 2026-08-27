// Per-category accent. Every inner page inherits the accent of its category
// (FIRE Planner → finance teal, TV guide / converters → utilities indigo, …)
// by overriding the --accent* family on its root element; components below
// keep reading var(--accent) and pick the right colour up automatically.
//
// PURE: returns a style object, no DOM access — usable from the prerender tree.

import type { CSSProperties } from 'react';
import type { CategoryId } from './manifest';

/** The canonical --cat-* token for a category. */
export function categoryVar(category: CategoryId): string {
  return `var(--cat-${category})`;
}

/**
 * CSS custom-property overrides that re-point the accent family at a category
 * colour. Finance is the site default, so it needs no override.
 */
export function accentFor(category?: CategoryId): CSSProperties {
  if (!category || category === 'finance') return {};
  const accent = categoryVar(category);
  return {
    '--accent': accent,
    '--accent-2': `color-mix(in srgb, ${accent} 85%, var(--ink))`,
    '--accent-ink': accent,
    '--accent-soft': `color-mix(in srgb, ${accent} 24%, transparent)`,
    '--accent-tint': `color-mix(in srgb, ${accent} 12%, transparent)`,
  } as CSSProperties;
}
