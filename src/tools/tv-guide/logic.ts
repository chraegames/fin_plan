// Pure helpers over the guide data: the two-way name decoder, the comparison
// rows and the "help me choose" recommender. No React, no DOM — tested in
// logic.test.ts.

import {
  ATTRIBUTES,
  BRANDS,
  TECHNOLOGIES,
  TECH_BY_ID,
  type AttributeId,
  type Brand,
  type BrandName,
  type Family,
  type Rating,
  type TechId,
  type Technology,
} from './data';

// ─── Decoder ─────────────────────────────────────────────────────────────

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_./()+]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export interface DecodeHit {
  kind: 'brand' | 'tech';
  /** Brand hits only. */
  brand?: Brand;
  brandName?: BrandName;
  /** The matched label (marketing name, technology name or alias). */
  name: string;
  techIds: TechId[];
  /** 3 exact, 2 prefix, 1 contains. */
  score: 1 | 2 | 3;
}

function matchScore(candidate: string, query: string): 0 | 1 | 2 | 3 {
  const c = normalize(candidate);
  if (!c || !query) return 0;
  if (c === query) return 3;
  if (c.startsWith(query) || query.startsWith(c)) return 2;
  if (c.includes(query)) return 1;
  return 0;
}

/** Looks a marketing name or technology name up; returns hits ranked exact > prefix > contains. */
export function decode(query: string): DecodeHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const hits: DecodeHit[] = [];
  for (const brand of BRANDS) {
    for (const bn of brand.names) {
      const s = Math.max(matchScore(bn.name, q), matchScore(`${brand.name} ${bn.name}`, q)) as 0 | 1 | 2 | 3;
      if (s) hits.push({ kind: 'brand', brand, brandName: bn, name: bn.name, techIds: bn.techIds, score: s });
    }
  }
  for (const t of TECHNOLOGIES) {
    const s = Math.max(matchScore(t.name, q), matchScore(t.shortName, q), ...t.aka.map(a => matchScore(a, q))) as 0 | 1 | 2 | 3;
    if (s) hits.push({ kind: 'tech', name: t.name, techIds: [t.id], score: s });
  }
  return hits.sort((a, b) => b.score - a.score);
}

export interface BrandNamesForTech {
  brand: Brand;
  names: BrandName[];
}

/** Every brand's name(s) for a technology, in brand order. */
export function namesForTech(techId: TechId): BrandNamesForTech[] {
  const out: BrandNamesForTech[] = [];
  for (const brand of BRANDS) {
    const names = brand.names.filter(n => n.techIds.includes(techId));
    if (names.length) out.push({ brand, names });
  }
  return out;
}

export function techsInFamily(family: Family): Technology[] {
  return TECHNOLOGIES.filter(t => t.family === family);
}

// ─── Comparison ──────────────────────────────────────────────────────────

export interface CompareRow {
  attribute: (typeof ATTRIBUTES)[number];
  cells: { techId: TechId; value: Rating; best: boolean }[];
}

/** One row per attribute; `best` marks the cell(s) with the most desirable rating in that row. */
export function compareRows(techIds: TechId[]): CompareRow[] {
  return ATTRIBUTES.map(attribute => {
    const values = techIds.map(id => TECH_BY_ID[id].ratings[attribute.id]);
    const target = attribute.higherIsBetter ? Math.max(...values) : Math.min(...values);
    return {
      attribute,
      cells: techIds.map((techId, i) => ({ techId, value: values[i], best: techIds.length > 1 && values[i] === target })),
    };
  });
}

export const DEFAULT_COMPARE: TechId[] = ['mini-led', 'w-oled', 'qd-oled'];
export const MAX_COMPARE = 4;

// ─── Chooser ─────────────────────────────────────────────────────────────

export type Room = 'dark' | 'mixed' | 'bright';
export type Use = 'movies' | 'sports' | 'gaming' | 'mixed' | 'news';
export type Budget = 'value' | 'mid' | 'premium';

export interface ChooserAnswers {
  room: Room;
  use: Use;
  budget: Budget;
  /** Static content on screen for hours a day (news tickers, a PC desktop, always-on dashboards). */
  staticContent?: boolean;
}

export interface ChooserOption<T extends string> {
  id: T;
  label: string;
  hint: string;
}

export const CHOOSER_OPTIONS: {
  room: ChooserOption<Room>[];
  use: ChooserOption<Use>[];
  budget: ChooserOption<Budget>[];
} = {
  room: [
    { id: 'dark', label: 'Dark or dim', hint: 'Curtains drawn, evening viewing, a dedicated cinema room' },
    { id: 'mixed', label: 'Mixed', hint: 'A normal living room — some daylight, lights on at night' },
    { id: 'bright', label: 'Bright', hint: 'Big windows, sunlight across the screen during the day' },
  ],
  use: [
    { id: 'movies', label: 'Movies & series', hint: 'Cinematic shows, HDR films' },
    { id: 'sports', label: 'Sports', hint: 'Fast motion, often with friends sitting off to the side' },
    { id: 'gaming', label: 'Gaming', hint: 'Consoles or PC, long sessions with fixed HUDs' },
    { id: 'news', label: 'News & daytime TV', hint: 'On most of the day, tickers and logos on screen' },
    { id: 'mixed', label: 'A bit of everything', hint: 'No single use dominates' },
  ],
  budget: [
    { id: 'value', label: 'Value', hint: 'The lower tiers of a brand\'s range' },
    { id: 'mid', label: 'Mid-range', hint: 'A solid step up without going flagship' },
    { id: 'premium', label: 'Premium', hint: 'Flagship and brand-new technology are on the table' },
  ],
};

export const BUDGET_MAX_TIER: Record<Budget, Rating> = { value: 2, mid: 3, premium: 5 };

type Weights = Partial<Record<AttributeId, number>>;

const BASE: Weights = {
  blackLevel: 1,
  brightness: 1,
  colorVolume: 1,
  viewingAngle: 0.5,
  burnIn: 0.5,
  blooming: 0.5,
  motion: 0.5,
};

const ROOM: Record<Room, Weights> = {
  dark: { blackLevel: 2, blooming: 1.5 },
  mixed: { blackLevel: 1, brightness: 1 },
  bright: { brightness: 3 },
};

const USE: Record<Use, Weights> = {
  movies: { blackLevel: 1, colorVolume: 1 },
  sports: { motion: 1.5, brightness: 1, viewingAngle: 1 },
  gaming: { motion: 1.5, burnIn: 1 },
  news: { burnIn: 2, brightness: 1 },
  mixed: {},
};

function add(into: Record<AttributeId, number>, w: Weights): void {
  for (const [k, v] of Object.entries(w)) into[k as AttributeId] += v ?? 0;
}

/** Desirability of a rating: higherIsBetter → value, otherwise the inverse. */
function desirability(attr: AttributeId, value: Rating): number {
  const meta = ATTRIBUTES.find(a => a.id === attr)!;
  return meta.higherIsBetter ? value : 6 - value;
}

export function scoreTech(tech: Technology, answers: ChooserAnswers): number {
  const w: Record<AttributeId, number> = {
    blackLevel: 0,
    brightness: 0,
    colorVolume: 0,
    viewingAngle: 0,
    burnIn: 0,
    blooming: 0,
    motion: 0,
    priceTier: 0,
  };
  add(w, BASE);
  add(w, ROOM[answers.room]);
  add(w, USE[answers.use]);
  let score = 0;
  for (const attr of Object.keys(w) as AttributeId[]) {
    score += w[attr] * desirability(attr, tech.ratings[attr]);
  }
  // Brand-new tech: a small "unproven" penalty so it only wins when clearly better.
  if (tech.status === 'new') score -= 1;
  return score;
}

export interface Recommendation {
  primary: TechId;
  alternatives: TechId[];
  reasons: string[];
  lookFor: { brand: Brand; name: BrandName }[];
}

const ROOM_REASON: Record<Room, string> = {
  dark: 'In a dim room, black level and freedom from halos matter more than raw brightness.',
  mixed: 'A living room with mixed light rewards a balance of contrast and brightness.',
  bright: 'Sunlight across the screen makes brightness the deciding factor.',
};

const USE_REASON: Record<Use, string> = {
  movies: 'Films and HDR series lean on contrast and rich colour.',
  sports: 'Sport needs crisp motion, brightness and wide viewing angles for a room full of people.',
  gaming: 'Games need fast pixel response, and fixed HUDs favour panels with little burn-in risk.',
  news: 'Hours of tickers and logos each day make burn-in resistance the priority.',
  mixed: 'With no single use dominating, an all-rounder wins.',
};

export function recommend(answers: ChooserAnswers): Recommendation {
  const maxTier = BUDGET_MAX_TIER[answers.budget];
  let candidates = TECHNOLOGIES.filter(t => t.status !== 'legacy' && t.ratings.priceTier <= maxTier);
  if (answers.staticContent) {
    // Hours of static content a day: keep to LCD, which has no burn-in mechanism at all.
    const safe = candidates.filter(t => t.family !== 'oled');
    if (safe.length) candidates = safe;
  }
  const ranked = candidates
    .map((t, i) => ({ t, i, s: scoreTech(t, answers) }))
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const primary = ranked[0].t;
  const reasons = [ROOM_REASON[answers.room], USE_REASON[answers.use]];
  if (answers.staticContent) reasons.push('Because static content stays on screen for hours, OLED panels were set aside in favour of LCD.');
  if (answers.budget !== 'premium') reasons.push('Flagship and brand-new technologies were left out to stay within the chosen budget tier.');
  if (primary.status === 'new') reasons.push('This is a brand-new technology — read independent reviews before buying.');
  const lookFor = namesForTech(primary.id).flatMap(({ brand, names }) => names.map(name => ({ brand, name })));
  return {
    primary: primary.id,
    alternatives: ranked.slice(1, 3).map(r => r.t.id),
    reasons,
    lookFor,
  };
}

export interface RuleOfThumbRow {
  room: Room;
  use: Use;
  tech: TechId;
}

/** The static room × use matrix (mid budget, no static-content flag) shown on the no-JS page. */
export function ruleOfThumb(): RuleOfThumbRow[] {
  const rows: RuleOfThumbRow[] = [];
  for (const room of CHOOSER_OPTIONS.room) {
    for (const use of CHOOSER_OPTIONS.use) {
      rows.push({ room: room.id, use: use.id, tech: recommend({ room: room.id, use: use.id, budget: 'mid' }).primary });
    }
  }
  return rows;
}
