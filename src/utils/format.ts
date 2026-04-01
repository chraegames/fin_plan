/** Full dollar format: $1,234,567 or -$1,234,567 */
export function formatDollars(v: number): string {
  const formatted = Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v < 0 ? `-$${formatted}` : `$${formatted}`;
}

/** Compact dollar format: $1.2M, $45K, $999 */
export function formatDollarsCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
