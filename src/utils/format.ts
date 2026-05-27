/** Full dollar format: $1,234,567 or -$1,234,567 */
export function formatDollars(v: number): string {
  const formatted = Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v < 0 ? `-$${formatted}` : `$${formatted}`;
}

/** Compact dollar format: $1.2M, $45K, $999. Negatives prepend the
 *  minus before the dollar sign (-$1.2M), matching formatDollars. The K
 *  threshold reaches up to 999_500 so values that would round to "1000K"
 *  promote to "$1.0M" instead. */
export function formatDollarsCompact(v: number): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 999_500) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
