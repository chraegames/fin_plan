// Save format: the player-owned layers, run-length encoded and base64'd, plus
// the scalars. Terrain is rebuilt from the seed; derived layers are recomputed.
// parseSaveFile is pure so it can be tested in node.

import { CITY_KEY, safeSetItem } from '../../utils/persistence';
import { createCityState } from './sim/state';
import { SERVICE_COUNT, T, type CityState, type Ledger, type Loan } from './types';

export const SAVE_VERSION = 1;
/** Bump when terrain generation changes (old saves would sit on the wrong map). */
export const GEN_VERSION = 1;

// Slow-moving derived layers are saved too so a reload continues seamlessly.
export const SAVED_U8 = ['zone', 'density', 'road', 'level', 'wealth', 'abandoned', 'plop', 'onFire', 'burnTicks', 'landValue', 'pollution', 'waterPollution', 'crime', 'edu', 'health', 'traffic', 'commute'] as const;
export const SAVED_U16 = ['age', 'plopOrigin', 'pop', 'jobs'] as const;

export interface SaveFile {
  v: number;
  gen: number;
  seed: number;
  tick: number;
  rngState: number;
  funds: number;
  taxes: number[];
  funding: number[];
  demand: number[];
  monthsInRed: number;
  nextLoanId: number;
  loans: Loan[];
  ledger: Ledger[];
  layers: Record<string, string>; // name → base64(RLE bytes)
}

// ─── RLE + base64 ──────────────────────────────────────────────────────

export function rleEncode(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < src.length) {
    const v = src[i];
    let run = 1;
    while (i + run < src.length && src[i + run] === v && run < 255) run++;
    out.push(v, run);
    i += run;
  }
  return Uint8Array.from(out);
}

export function rleDecode(src: Uint8Array, length: number): Uint8Array | null {
  const out = new Uint8Array(length);
  let o = 0;
  for (let i = 0; i + 1 < src.length; i += 2) {
    const v = src[i];
    const run = src[i + 1];
    if (o + run > length) return null;
    out.fill(v, o, o + run);
    o += run;
  }
  return o === length ? out : null;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(s: string): Uint8Array | null {
  try {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function encodeU8(a: Uint8Array): string {
  return toBase64(rleEncode(a));
}
function decodeU8(s: string): Uint8Array | null {
  const bytes = fromBase64(s);
  return bytes ? rleDecode(bytes, T) : null;
}
function encodeU16(a: Uint16Array): string {
  const lo = new Uint8Array(T);
  const hi = new Uint8Array(T);
  for (let i = 0; i < T; i++) {
    lo[i] = a[i] & 0xff;
    hi[i] = a[i] >> 8;
  }
  return `${encodeU8(lo)}.${encodeU8(hi)}`;
}
function decodeU16(s: string): Uint16Array | null {
  const parts = s.split('.');
  if (parts.length !== 2) return null;
  const lo = decodeU8(parts[0]);
  const hi = decodeU8(parts[1]);
  if (!lo || !hi) return null;
  const out = new Uint16Array(T);
  for (let i = 0; i < T; i++) out[i] = lo[i] | (hi[i] << 8);
  return out;
}

// ─── encode / decode ───────────────────────────────────────────────────

export function encodeSave(s: CityState): SaveFile {
  const layers: Record<string, string> = {};
  for (const k of SAVED_U8) layers[k] = encodeU8(s[k]);
  for (const k of SAVED_U16) layers[k] = encodeU16(s[k]);
  return {
    v: SAVE_VERSION,
    gen: GEN_VERSION,
    seed: s.seed,
    tick: s.tick,
    rngState: s.rngState,
    funds: s.funds,
    taxes: Array.from(s.taxes),
    funding: Array.from(s.funding),
    demand: Array.from(s.demand),
    monthsInRed: s.monthsInRed,
    nextLoanId: s.nextLoanId,
    loans: s.loans.map(l => ({ ...l })),
    ledger: s.ledger.map(l => ({ ...l, expenses: l.expenses.slice() })),
    layers,
  };
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown): x is number => isNum(x) && Number.isInteger(x);
const numArray = (x: unknown, n: number): x is number[] => Array.isArray(x) && x.length === n && x.every(isNum);

function isLoan(x: unknown): x is Loan {
  const o = x as Loan;
  return !!o && isInt(o.id) && isNum(o.principal) && isNum(o.balance) && isInt(o.monthsLeft);
}
function isLedger(x: unknown): x is Ledger {
  const o = x as Ledger;
  return !!o && isInt(o.month) && isNum(o.incomeR) && isNum(o.incomeC) && isNum(o.incomeI) && numArray(o.expenses, SERVICE_COUNT) && isNum(o.loanCost) && isNum(o.net);
}

/** Validate a raw JSON string; null when it is not a usable save. */
export function parseSaveFile(raw: string | null): SaveFile | null {
  if (!raw) return null;
  let o: SaveFile;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;
  if (o.v !== SAVE_VERSION || o.gen !== GEN_VERSION) return null;
  if (!isInt(o.seed) || !isInt(o.tick) || o.tick < 0 || !isInt(o.rngState) || !isNum(o.funds)) return null;
  if (!numArray(o.taxes, 3) || !numArray(o.funding, SERVICE_COUNT) || !numArray(o.demand, 9)) return null;
  if (!isInt(o.monthsInRed) || !isInt(o.nextLoanId)) return null;
  if (!Array.isArray(o.loans) || !o.loans.every(isLoan)) return null;
  if (!Array.isArray(o.ledger) || !o.ledger.every(isLedger)) return null;
  if (!o.layers || typeof o.layers !== 'object') return null;
  for (const k of [...SAVED_U8, ...SAVED_U16]) if (typeof o.layers[k] !== 'string') return null;
  return o;
}

/** Build a CityState from a validated save; null if a layer fails to decode. */
export function decodeSave(file: SaveFile): CityState | null {
  const s = createCityState(file.seed);
  for (const k of SAVED_U8) {
    const a = decodeU8(file.layers[k]);
    if (!a) return null;
    s[k].set(a);
  }
  for (const k of SAVED_U16) {
    const a = decodeU16(file.layers[k]);
    if (!a) return null;
    s[k].set(a);
  }
  s.tick = file.tick;
  s.rngState = file.rngState >>> 0;
  s.funds = file.funds;
  s.taxes.set(file.taxes);
  s.funding.set(file.funding);
  s.demand.set(file.demand);
  s.monthsInRed = file.monthsInRed;
  s.nextLoanId = file.nextLoanId;
  s.loans = file.loans.map(l => ({ ...l }));
  s.ledger = file.ledger.map(l => ({ ...l, expenses: l.expenses.slice() }));
  return s;
}

export function loadSave(): SaveFile | null {
  try {
    return parseSaveFile(localStorage.getItem(CITY_KEY));
  } catch {
    return null;
  }
}

export function writeSave(file: SaveFile): boolean {
  return safeSetItem(CITY_KEY, JSON.stringify(file));
}

export function clearSave(): void {
  try {
    localStorage.removeItem(CITY_KEY);
  } catch {
    // ignore
  }
}
