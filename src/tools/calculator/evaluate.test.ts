import { describe, expect, it } from 'vitest';
import { evaluate, formatResult, type EvaluateOptions } from './evaluate';

const rad: EvaluateOptions = { angle: 'rad', ans: 0 };
const deg: EvaluateOptions = { angle: 'deg', ans: 0 };

function val(src: string, opts: EvaluateOptions = rad): number {
  const r = evaluate(src, opts);
  if (!r.ok) throw new Error(`expected ok for "${src}", got ${r.message}`);
  return r.value;
}

function err(src: string, opts: EvaluateOptions = rad) {
  const r = evaluate(src, opts);
  if (r.ok) throw new Error(`expected error for "${src}", got ${r.value}`);
  return r;
}

describe('evaluate — arithmetic', () => {
  it('respects precedence', () => {
    expect(val('1+2*3')).toBe(7);
    expect(val('(1+2)*3')).toBe(9);
  });
  it('power is right-associative and binds tighter than unary minus', () => {
    expect(val('2^3^2')).toBe(512);
    expect(val('-2^2')).toBe(-4);
    expect(val('(-2)^2')).toBe(4);
  });
  it('modulo', () => {
    expect(val('10%3')).toBe(1);
  });
  it('factorial', () => {
    expect(val('5!')).toBe(120);
    expect(val('0!')).toBe(1);
    expect(err('3.5!').message).toBe('Math error');
    expect(err('(-1)!').message).toBe('Math error');
    expect(err('171!').message).toBe('Math error');
  });
  it('exponent notation and pretty glyphs', () => {
    expect(val('1e3+1')).toBe(1001);
    expect(val('6×7÷2')).toBe(21);
    expect(val('5−8')).toBe(-3);
  });
  it('ignores whitespace', () => {
    expect(val(' 1 + 2 ')).toBe(3);
  });
  it('substitutes ans', () => {
    expect(val('ans*2', { angle: 'rad', ans: 21 })).toBe(42);
  });
});

describe('evaluate — functions', () => {
  it('trig in degrees and radians', () => {
    expect(val('sin(90)', deg)).toBeCloseTo(1, 12);
    expect(val('sin(pi/2)', rad)).toBeCloseTo(1, 12);
    expect(val('cos(180)', deg)).toBeCloseTo(-1, 12);
    expect(val('asin(1)', deg)).toBeCloseTo(90, 12);
    expect(val('atan(1)', rad)).toBeCloseTo(Math.PI / 4, 12);
  });
  it('logs, roots, abs, exp', () => {
    expect(val('sqrt(16)')).toBe(4);
    expect(val('ln(e)')).toBe(1);
    expect(val('log(1000)')).toBeCloseTo(3, 12);
    expect(val('abs(-3)')).toBe(3);
    expect(val('exp(0)')).toBe(1);
  });
  it('constants', () => {
    expect(val('pi')).toBeCloseTo(Math.PI, 12);
    expect(val('2*e')).toBeCloseTo(2 * Math.E, 12);
  });
  it('function names are case-insensitive', () => {
    expect(val('SQRT(9)')).toBe(3);
  });
});

describe('evaluate — errors', () => {
  it('trailing operator', () => {
    const r = err('2+');
    expect(r.pos).toBe(2);
  });
  it('unbalanced parens', () => {
    expect(err('(1+2')).toMatchObject({ message: 'Unbalanced parentheses', pos: 4 });
    expect(err('1+2)')).toMatchObject({ message: 'Unbalanced parentheses', pos: 3 });
  });
  it('unknown identifier', () => {
    expect(err('foo(1)')).toMatchObject({ message: 'Unknown identifier "foo"', pos: 0 });
    expect(err('2*bar').pos).toBe(2);
  });
  it('division by zero', () => {
    expect(err('1/0').message).toBe('Division by zero');
    expect(err('1%0').message).toBe('Division by zero');
  });
  it('math errors', () => {
    expect(err('sqrt(-1)').message).toBe('Math error');
    expect(err('ln(0)').message).toBe('Math error');
  });
  it('empty and junk input', () => {
    expect(evaluate('', rad).ok).toBe(false);
    expect(evaluate('   ', rad).ok).toBe(false);
    expect(err('1 $ 2').pos).toBe(2);
    expect(err('1 2').pos).toBe(2);
  });
  it('function without parens', () => {
    expect(err('sin 90').pos).toBe(4);
  });
});

describe('formatResult', () => {
  it('trims float noise and handles extremes', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
    expect(formatResult(-0)).toBe('0');
    expect(formatResult(120)).toBe('120');
    expect(formatResult(1e20)).toBe('1e+20');
    expect(formatResult(1.5e-12)).toBe('1.5e-12');
  });
});
