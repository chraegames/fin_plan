/**
 * Suffix `base` with " (N)" until the result doesn't collide with any
 * name in `existing`. Fills the smallest available N — so given
 * existing = { "Default", "Default (2)", "Default (4)" } and
 * base = "Default", the result is "Default (3)" (gap-filling, like
 * macOS Finder).
 *
 * Comparison is exact-string (case-sensitive, whitespace-sensitive).
 */
export function dedupeName(base: string, existing: Iterable<string>): string {
  const set = existing instanceof Set ? existing : new Set(existing);
  if (!set.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!set.has(candidate)) return candidate;
  }
}
