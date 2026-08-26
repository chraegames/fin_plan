import { describe, it, expect } from 'vitest';
import { TECHNOLOGIES, TECH_BY_ID, type TechId } from './data';
import {
  BUDGET_MAX_TIER,
  CHOOSER_OPTIONS,
  compareRows,
  decode,
  namesForTech,
  normalize,
  recommend,
  ruleOfThumb,
  techsInFamily,
  type Budget,
  type Room,
  type Use,
} from './logic';

const techIds = (ids: string[]) => ids.sort();

describe('decoder', () => {
  it('normalizes case, spaces, hyphens and punctuation', () => {
    expect(normalize('Neo QLED')).toBe('neoqled');
    expect(normalize('QD-Mini LED')).toBe('qdminiled');
    expect(normalize(' Bravia 8 II ')).toBe('bravia8ii');
  });

  it('maps well-known brand names to the right technology', () => {
    expect(techIds(decode('Neo QLED')[0].techIds)).toEqual(['mini-led']);
    expect(decode('neo-qled')[0].brand?.id).toBe('samsung');
    expect(techIds(decode('bravia 8 ii')[0].techIds)).toEqual(['qd-oled']);
    expect(techIds(decode('QNED')[0].techIds)).toEqual(['mini-led', 'qled']);
    expect(decode('True RGB')[0].techIds).toContain('rgb-mini-led');
    expect(decode('ULED X')[0].brand?.id).toBe('hisense');
    expect(decode('Quantum Pro')[0].brand?.id).toBe('vizio');
  });

  it('also matches generic technology names and aliases', () => {
    const hit = decode('QD-OLED').find(h => h.kind === 'tech');
    expect(hit?.techIds).toEqual(['qd-oled']);
    expect(decode('super quantum dot').some(h => h.techIds.includes('sqd-mini-led'))).toBe(true);
    expect(decode('primary rgb tandem').some(h => h.techIds.includes('tandem-oled'))).toBe(true);
  });

  it('ranks exact matches above prefix and contains matches', () => {
    const hits = decode('QLED');
    expect(hits[0].score).toBe(3);
    expect(hits[0].name).toBe('QLED');
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score >= hits[i].score).toBe(true);
  });

  it('returns nothing for short or unknown queries', () => {
    expect(decode('q')).toEqual([]);
    expect(decode('zzzzzz')).toEqual([]);
  });

  it('lists every brand name for a technology', () => {
    const qd = namesForTech('qd-oled').map(x => x.brand.id);
    expect(qd).toContain('samsung');
    expect(qd).toContain('sony');
    expect(namesForTech('edge-led').map(x => x.brand.id)).toContain('samsung');
    expect(techsInFamily('oled').map(t => t.id)).toEqual(['w-oled', 'qd-oled', 'tandem-oled']);
  });
});

describe('compare', () => {
  it('marks the most desirable rating per row, honouring lower-is-better attributes', () => {
    const rows = compareRows(['mini-led', 'w-oled']);
    const burn = rows.find(r => r.attribute.id === 'burnIn')!;
    expect(burn.cells.find(c => c.techId === 'mini-led')!.best).toBe(true);
    expect(burn.cells.find(c => c.techId === 'w-oled')!.best).toBe(false);
    const blacks = rows.find(r => r.attribute.id === 'blackLevel')!;
    expect(blacks.cells.find(c => c.techId === 'w-oled')!.best).toBe(true);
    // single column: nothing is "best"
    expect(compareRows(['qled']).every(r => r.cells.every(c => !c.best))).toBe(true);
  });
});

describe('recommend', () => {
  const rooms = CHOOSER_OPTIONS.room.map(o => o.id);
  const uses = CHOOSER_OPTIONS.use.map(o => o.id);
  const budgets = CHOOSER_OPTIONS.budget.map(o => o.id);

  it('always returns a valid, non-legacy technology within the budget tier for every combination', () => {
    for (const room of rooms as Room[])
      for (const use of uses as Use[])
        for (const budget of budgets as Budget[])
          for (const staticContent of [false, true]) {
            const r = recommend({ room, use, budget, staticContent });
            const t = TECH_BY_ID[r.primary];
            expect(t, `${room}/${use}/${budget}`).toBeDefined();
            expect(t.status).not.toBe('legacy');
            expect(t.ratings.priceTier).toBeLessThanOrEqual(BUDGET_MAX_TIER[budget]);
            expect(r.alternatives).not.toContain(r.primary);
            expect(r.reasons.length).toBeGreaterThanOrEqual(2);
            expect(r.lookFor.length).toBeGreaterThanOrEqual(1);
          }
  });

  it('dark room + movies + premium → an OLED; bright room + sports + value → an LCD', () => {
    expect(TECH_BY_ID[recommend({ room: 'dark', use: 'movies', budget: 'premium' }).primary].family).toBe('oled');
    expect(TECH_BY_ID[recommend({ room: 'bright', use: 'sports', budget: 'value' }).primary].family).toBe('lcd');
    expect(recommend({ room: 'bright', use: 'sports', budget: 'mid' }).primary).toBe('mini-led');
  });

  it('static content steers away from OLED at every budget', () => {
    for (const budget of budgets as Budget[])
      for (const room of rooms as Room[]) {
        const r = recommend({ room, use: 'news', budget, staticContent: true });
        expect(TECH_BY_ID[r.primary].family, `${room}/${budget}`).toBe('lcd');
      }
  });

  it('value budget never picks a premium or flagship tier', () => {
    for (const room of rooms as Room[])
      for (const use of uses as Use[]) expect(TECH_BY_ID[recommend({ room, use, budget: 'value' }).primary].ratings.priceTier).toBeLessThanOrEqual(2);
  });

  it('rule-of-thumb matrix covers every room × use at mid budget', () => {
    const rows = ruleOfThumb();
    expect(rows).toHaveLength(rooms.length * uses.length);
    const ids = new Set(TECHNOLOGIES.map(t => t.id));
    for (const r of rows) expect(ids.has(r.tech as TechId)).toBe(true);
  });
});
