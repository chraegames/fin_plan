import { CALCULATOR_HISTORY_KEY, safeSetItem } from '../../utils/persistence';

export interface HistoryItem {
  expr: string;
  result: string;
  at: number;
}

export const HISTORY_MAX = 50;

export function pushHistory(list: HistoryItem[], item: HistoryItem, max = HISTORY_MAX): HistoryItem[] {
  return [item, ...list].slice(0, max);
}

function isHistoryItem(x: unknown): x is HistoryItem {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.expr === 'string' && typeof o.result === 'string' && typeof o.at === 'number';
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(CALCULATOR_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem).slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryItem[]): boolean {
  return safeSetItem(CALCULATOR_HISTORY_KEY, JSON.stringify(list));
}
