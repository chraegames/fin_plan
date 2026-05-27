import { describe, it, expect } from 'vitest';
import { formatDollars, formatDollarsCompact } from './format';

describe('formatDollars', () => {
  it('formats zero', () => {
    expect(formatDollars(0)).toBe('$0');
  });

  it('formats positive integers with grouping', () => {
    expect(formatDollars(1234567)).toBe('$1,234,567');
  });

  it('formats small positives', () => {
    expect(formatDollars(42)).toBe('$42');
  });

  it('rounds sub-dollar amounts', () => {
    expect(formatDollars(0.4)).toBe('$0');
    expect(formatDollars(0.6)).toBe('$1');
  });

  it('formats negatives with a minus prefix before the dollar sign', () => {
    expect(formatDollars(-1234)).toBe('-$1,234');
  });

  it('drops cents on inputs with decimals', () => {
    expect(formatDollars(99.99)).toBe('$100');
    expect(formatDollars(-99.49)).toBe('-$99');
  });
});

describe('formatDollarsCompact', () => {
  it('formats values under 1000 with full precision (rounded)', () => {
    expect(formatDollarsCompact(0)).toBe('$0');
    expect(formatDollarsCompact(999)).toBe('$999');
    expect(formatDollarsCompact(-200)).toBe('-$200');
  });

  it('formats thousands with a K suffix', () => {
    expect(formatDollarsCompact(1_000)).toBe('$1K');
    expect(formatDollarsCompact(45_000)).toBe('$45K');
    expect(formatDollarsCompact(999_499)).toBe('$999K');
  });

  it('promotes near-million values into the M branch instead of "$1000K"', () => {
    expect(formatDollarsCompact(999_500)).toBe('$1.0M');
    expect(formatDollarsCompact(999_999.5)).toBe('$1.0M');
  });

  it('formats millions with one decimal and M suffix', () => {
    expect(formatDollarsCompact(1_000_000)).toBe('$1.0M');
    expect(formatDollarsCompact(1_234_567)).toBe('$1.2M');
    expect(formatDollarsCompact(12_500_000)).toBe('$12.5M');
  });

  it('places the minus sign before the dollar prefix for negatives', () => {
    expect(formatDollarsCompact(-1_234_567)).toBe('-$1.2M');
    expect(formatDollarsCompact(-5_000)).toBe('-$5K');
    expect(formatDollarsCompact(-200)).toBe('-$200');
  });
});
