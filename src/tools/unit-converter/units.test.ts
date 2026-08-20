import { describe, expect, it } from 'vitest';
import { UNIT_CATEGORIES, convert } from './units';

describe('UNIT_CATEGORIES', () => {
  it('round-trips every unit through its base', () => {
    for (const cat of UNIT_CATEGORIES) {
      for (const unit of cat.units) {
        for (const x of [-12.5, 0, 1, 987654.321]) {
          expect(unit.fromBase(unit.toBase(x)), `${cat.id}/${unit.id}`).toBeCloseTo(x, 6);
        }
      }
    }
  });

  it('has unique unit ids within each category', () => {
    for (const cat of UNIT_CATEGORIES) {
      const ids = cat.units.map(u => u.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('defaultFrom / defaultTo exist in their category', () => {
    for (const cat of UNIT_CATEGORIES) {
      const ids = cat.units.map(u => u.id);
      expect(ids).toContain(cat.defaultFrom);
      expect(ids).toContain(cat.defaultTo);
      expect(cat.defaultFrom).not.toBe(cat.defaultTo);
    }
  });
});

describe('convert', () => {
  it('pins exact definitions', () => {
    expect(convert('length', 'mi', 'm', 1)).toBeCloseTo(1609.344, 9);
    expect(convert('length', 'in', 'cm', 1)).toBeCloseTo(2.54, 12);
    expect(convert('length', 'nmi', 'm', 1)).toBe(1852);
    expect(convert('weight', 'lb', 'kg', 1)).toBeCloseTo(0.45359237, 12);
    expect(convert('weight', 'st', 'kg', 1)).toBeCloseTo(6.35029318, 9);
    expect(convert('weight', 'oz', 'g', 16)).toBeCloseTo(453.59237, 9);
    expect(convert('volume', 'gal_us', 'l', 1)).toBeCloseTo(3.785411784, 12);
    expect(convert('volume', 'gal_uk', 'l', 1)).toBeCloseTo(4.54609, 12);
    expect(convert('volume', 'cup_us', 'floz_us', 1)).toBeCloseTo(8, 9);
    expect(convert('volume', 'tbsp', 'tsp', 1)).toBeCloseTo(3, 9);
    expect(convert('area', 'acre', 'm2', 1)).toBeCloseTo(4046.8564224, 9);
    expect(convert('area', 'mi2', 'acre', 1)).toBeCloseTo(640, 6);
    expect(convert('speed', 'knot', 'kmh', 1)).toBeCloseTo(1.852, 12);
    expect(convert('speed', 'mph', 'fts', 60)).toBeCloseTo(88, 9);
  });

  it('handles temperature', () => {
    expect(convert('temperature', 'c', 'f', 0)).toBeCloseTo(32, 12);
    expect(convert('temperature', 'c', 'k', 100)).toBeCloseTo(373.15, 12);
    expect(convert('temperature', 'c', 'f', -40)).toBeCloseTo(-40, 12);
    expect(convert('temperature', 'f', 'c', 212)).toBeCloseTo(100, 12);
    expect(convert('temperature', 'k', 'f', 0)).toBeCloseTo(-459.67, 9);
  });

  it('returns NaN for unknown units', () => {
    expect(convert('length', 'm', 'parsec', 1)).toBeNaN();
    expect(convert('nope', 'm', 'km', 1)).toBeNaN();
  });
});
