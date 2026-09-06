// Worker ↔ main-thread protocol. Snapshots are one ArrayBuffer with a fixed
// layer layout, transferred (not copied) and recycled back to the worker.

import type { ActionResult, AdvisorMsg, CityState, HudStats, Ledger, Loan } from './types';
import { T, type Action, type Speed } from './types';
import type { SaveFile } from './save';
import type { TunableKey } from './constants';

export const SNAPSHOT_LAYERS = [
  ['plopOrigin', 2],
  ['lotOrigin', 2],
  ['pop', 2],
  ['jobs', 2],
  ['zone', 1],
  ['density', 1],
  ['road', 1],
  ['level', 1],
  ['wealth', 1],
  ['abandoned', 1],
  ['plop', 1],
  ['lotSize', 1],
  ['powered', 1],
  ['watered', 1],
  ['onFire', 1],
  ['landValue', 1],
  ['pollution', 1],
  ['crime', 1],
  ['traffic', 1],
  ['fireRisk', 1],
  ['desirability', 1],
  ['fireCover', 1],
  ['policeCover', 1],
  ['healthCover', 1],
  ['eduCover', 1],
  ['edu', 1],
  ['health', 1],
  ['commute', 1],
  ['roadAccess', 1],
] as const;

export type LayerName = (typeof SNAPSHOT_LAYERS)[number][0];

export const SNAPSHOT_BYTES = SNAPSHOT_LAYERS.reduce((n, [, b]) => n + b * T, 0);

export type SnapshotLayers = { [K in LayerName]: CityState[K] };

export interface Snapshot {
  tick: number;
  layers: SnapshotLayers;
  dirtyChunks: Uint8Array;
  changed: number;
  hud: HudStats;
  messages: AdvisorMsg[];
  buf: ArrayBuffer;
}

/** Copy the snapshot layers of `s` into `buf`. */
export function packSnapshot(s: CityState, buf: ArrayBuffer): void {
  let off = 0;
  for (const [name, bytes] of SNAPSHOT_LAYERS) {
    const src = s[name] as Uint8Array | Uint16Array;
    if (bytes === 2) new Uint16Array(buf, off, T).set(src as Uint16Array);
    else new Uint8Array(buf, off, T).set(src as Uint8Array);
    off += bytes * T;
  }
}

/** Typed-array views over a packed buffer (no copy). */
export function viewSnapshot(buf: ArrayBuffer): SnapshotLayers {
  const out: Record<string, Uint8Array | Uint16Array> = {};
  let off = 0;
  for (const [name, bytes] of SNAPSHOT_LAYERS) {
    out[name] = bytes === 2 ? new Uint16Array(buf, off, T) : new Uint8Array(buf, off, T);
    off += bytes * T;
  }
  return out as unknown as SnapshotLayers;
}

export function buildHud(s: CityState): HudStats {
  const t = s.totals;
  return {
    tick: s.tick,
    funds: s.funds,
    lastMonthNet: s.ledger[0]?.net ?? 0,
    demand: Array.from(s.demand),
    taxes: Array.from(s.taxes),
    funding: Array.from(s.funding),
    totals: { ...t },
    ledger: s.ledger.map(l => ({ ...l, expenses: l.expenses.slice() }) as Ledger),
    loans: s.loans.map(l => ({ ...l }) as Loan),
    externalConnected: s.externalConnected,
    brownout: t.powerDemand > t.powerSupply && t.powerDemand > 0,
    waterShort: t.waterDemand > t.waterSupply * 1.25 && t.waterDemand > 0,
    tornado: s.tornado ? { x: s.tornado.x, y: s.tornado.y } : null,
  };
}

export type MainToWorker =
  | { type: 'init'; seed: number; save?: SaveFile }
  | { type: 'actions'; actions: { id: number; action: Action }[] }
  | { type: 'speed'; speed: Speed }
  | { type: 'recycle'; buf: ArrayBuffer }
  | { type: 'requestSave'; id: number }
  | { type: 'requestSnapshot' }
  | { type: 'fastForward'; ticks: number }
  | { type: 'tuning'; overrides: Partial<Record<TunableKey, number>> };

export type WorkerToMain =
  | { type: 'terrain'; seed: number; height: Float32Array; sea: number; water: Uint8Array; slope: Uint8Array }
  | { type: 'snapshot'; buf: ArrayBuffer; tick: number; hud: HudStats; dirtyChunks: Uint8Array; changed: number; messages: AdvisorMsg[]; results: ActionResult[] }
  | { type: 'save'; id: number; file: SaveFile }
  | { type: 'error'; message: string };
