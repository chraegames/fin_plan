// Persisted selection for the converter (category + unit pair). Pure helpers;
// the component reads once in a useState initializer and writes in an effect.

import { UNIT_CONVERTER_KEY, safeSetItem } from '../../utils/persistence';
import { getCategory, getUnit, UNIT_CATEGORIES, type CategoryId } from './units';

export interface Selection {
  category: CategoryId;
  fromId: string;
  toId: string;
}

export function defaultSelection(category: CategoryId = UNIT_CATEGORIES[0].id): Selection {
  const cat = getCategory(category) ?? UNIT_CATEGORIES[0];
  return { category: cat.id, fromId: cat.defaultFrom, toId: cat.defaultTo };
}

function isSelection(v: unknown): v is Selection {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.category === 'string' &&
    typeof o.fromId === 'string' &&
    typeof o.toId === 'string' &&
    !!getUnit(o.category, o.fromId) &&
    !!getUnit(o.category, o.toId)
  );
}

export function loadSelection(): Selection {
  try {
    const raw = localStorage.getItem(UNIT_CONVERTER_KEY);
    if (!raw) return defaultSelection();
    const parsed: unknown = JSON.parse(raw);
    return isSelection(parsed) ? parsed : defaultSelection();
  } catch {
    return defaultSelection();
  }
}

export function saveSelection(sel: Selection): void {
  safeSetItem(UNIT_CONVERTER_KEY, JSON.stringify(sel));
}
