import { describe, expect, it } from 'vitest';
import { formatResult, parseInput } from './format';

describe('formatResult', () => {
  it('handles zero and negative zero', () => {
    expect(formatResult(0)).toBe('0');
    expect(formatResult(-0)).toBe('0');
    expect(formatResult(1e-30)).toBe('1e-30');
  });

  it('rounds to 8 significant digits and strips trailing zeros', () => {
    expect(formatResult(1 / 3)).toBe('0.33333333');
    expect(formatResult(123456789)).toBe('123456790');
    expect(formatResult(1.5)).toBe('1.5');
    expect(formatResult(1609.344)).toBe('1609.344');
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
    expect(formatResult(-2.5)).toBe('-2.5');
  });

  it('uses plain notation inside [1e-6, 1e15) and exponent outside', () => {
    expect(formatResult(1e-6)).toBe('0.000001');
    expect(formatResult(1e-7)).toBe('1e-7');
    expect(formatResult(999999999999999)).toBe('1e+15');
    expect(formatResult(1e16)).toBe('1e+16');
    expect(formatResult(1.23456789e20)).toBe('1.2345679e+20');
    expect(formatResult(100000000000000)).toBe('100000000000000');
  });

  it('returns empty for non-finite values', () => {
    expect(formatResult(NaN)).toBe('');
    expect(formatResult(Infinity)).toBe('');
  });
});

describe('parseInput', () => {
  it('parses plain, signed, decimal and comma-grouped numbers', () => {
    expect(parseInput('12')).toBe(12);
    expect(parseInput(' -3.5 ')).toBe(-3.5);
    expect(parseInput('.5')).toBe(0.5);
    expect(parseInput('-.5')).toBe(-0.5);
    expect(parseInput('1,234.5')).toBe(1234.5);
    expect(parseInput('5.')).toBe(5);
    expect(parseInput('1e3')).toBe(1000);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseInput('')).toBeNull();
    expect(parseInput('-')).toBeNull();
    expect(parseInput('.')).toBeNull();
    expect(parseInput('abc')).toBeNull();
    expect(parseInput('1.2.3')).toBeNull();
    expect(parseInput('Infinity')).toBeNull();
    expect(parseInput('0x10')).toBeNull();
  });
});
