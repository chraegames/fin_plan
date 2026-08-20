// Display formatting + input parsing for the converter. Pure.

const SIG_DIGITS = 8;

/** Up to 8 significant digits, trailing zeros stripped; exponent form outside [1e-6, 1e15). */
export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return '';
  const rounded = Number(n.toPrecision(SIG_DIGITS));
  if (rounded === 0) return '0';
  const abs = Math.abs(rounded);
  if (abs >= 1e-6 && abs < 1e15) {
    // toPrecision may itself yield exponent form for small values; force plain.
    const plain = rounded.toLocaleString('en-US', {
      useGrouping: false,
      maximumFractionDigits: 20,
    });
    return plain;
  }
  return rounded.toExponential().replace(/\.?0+e/, 'e');
}

/** Parse user text; null when it isn't a finite number. Commas are ignored. */
export function parseInput(s: string): number | null {
  const cleaned = s.trim().replace(/,/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
