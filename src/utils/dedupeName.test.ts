import { describe, it, expect } from 'vitest';
import { dedupeName } from './dedupeName';

describe('dedupeName', () => {
  it('returns the base name when no collision exists', () => {
    expect(dedupeName('Default', [])).toBe('Default');
    expect(dedupeName('Default', ['Other', 'Another'])).toBe('Default');
  });

  it('appends " (2)" on the first collision', () => {
    expect(dedupeName('Default', ['Default'])).toBe('Default (2)');
  });

  it('skips to " (3)" when both base and "(2)" exist', () => {
    expect(dedupeName('Default', ['Default', 'Default (2)'])).toBe('Default (3)');
  });

  it('fills the smallest available gap', () => {
    expect(
      dedupeName('Default', ['Default', 'Default (2)', 'Default (4)']),
    ).toBe('Default (3)');
  });

  it('does not match suffix-only siblings (no base collision)', () => {
    // Bare "Default" not in the set → return "Default" even though
    // "Default (2)" is present.
    expect(dedupeName('Default', ['Default (2)'])).toBe('Default');
  });

  it('handles a Set as well as an array', () => {
    expect(dedupeName('Default', new Set(['Default']))).toBe('Default (2)');
  });

  it('treats whitespace and casing as significant', () => {
    expect(dedupeName('Default', ['default'])).toBe('Default');
    expect(dedupeName('Default', ['Default '])).toBe('Default');
  });

  it('handles bases that already look like a numbered duplicate', () => {
    // No special handling — just appends another " (N)".
    expect(dedupeName('Default (2)', ['Default (2)'])).toBe('Default (2) (2)');
  });

  it('handles Profile-style numeric bases', () => {
    expect(
      dedupeName('Profile 3', ['Profile 1', 'Profile 3']),
    ).toBe('Profile 3 (2)');
  });
});
