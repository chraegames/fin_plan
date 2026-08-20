// Pure due-date helpers. Dates are plain 'YYYY-MM-DD' strings; all arithmetic
// goes through Date.UTC on parsed y/m/d integers so local DST shifts and
// timezone offsets never skew a day count.

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later' | 'none';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidISODate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const parts = parseISO(s);
  if (!parts) return false;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseISO(s: string): [number, number, number] | null {
  const m = ISO_RE.exec(s);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  const a = parseISO(from);
  const b = parseISO(to);
  if (!a || !b) return 0;
  const ms = Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2]);
  return Math.round(ms / 86_400_000);
}

export function dueStatus(due: string | undefined, today: string): DueStatus {
  if (!due || !isValidISODate(due)) return 'none';
  const diff = daysBetween(today, due);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'later';
}

export function formatDue(due: string, today: string): string {
  const parts = parseISO(due);
  if (!parts) return due;
  const diff = daysBetween(today, due);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0 && diff >= -14) return `${-diff} days overdue`;
  if (diff > 1 && diff <= 14) return `In ${diff} days`;
  const [y, m, d] = parts;
  const todayParts = parseISO(today);
  const sameYear = todayParts ? todayParts[0] === y : true;
  const base = `${MONTHS[m - 1]} ${d}`;
  return sameYear ? base : `${base}, ${y}`;
}
