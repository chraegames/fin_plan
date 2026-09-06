// Number and date formatting for the HUD (pure).

import { START_YEAR, TICKS_PER_MONTH } from '../constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(tick: number): string {
  const months = Math.floor(tick / TICKS_PER_MONTH);
  return `${MONTHS[months % 12]} ${START_YEAR + Math.floor(months / 12)}`;
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(Math.round(n));
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  return `${sign}$${v.toLocaleString('en-US')}`;
}

export function formatCount(n: number): string {
  const v = Math.round(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 100_000) return `${Math.round(v / 1000)}k`;
  return v.toLocaleString('en-US');
}

export function formatPercent(f: number): string {
  return `${Math.round(f * 100)}%`;
}
