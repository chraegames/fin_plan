// Headless City run: lays out a scripted town and prints yearly curves.
// Usage: npm run city:sim -- --seed 1 --years 10 [--quiet]

import { performance } from 'node:perf_hooks';
import { TICKS_PER_MONTH } from '../src/tools/city/constants';
import { createCityState } from '../src/tools/city/sim/state';
import { densifyActions, findSite, serviceActions, townActions } from '../src/tools/city/sim/scenario';
import { applyActions, primeDerived, tick } from '../src/tools/city/sim/tick';
import { PLOP, type Action, type CityState } from '../src/tools/city/types';

const args = process.argv.slice(2);
const opt = (name: string, def: number): number => {
  const k = args.indexOf(`--${name}`);
  return k >= 0 ? Number(args[k + 1]) : def;
};
const seed = opt('seed', 1);
const years = opt('years', 10);
const quiet = args.includes('--quiet');

let nextId = 1;
function act(s: CityState, ...actions: Action[]): void {
  applyActions(s, actions.map(action => ({ id: nextId++, action })));
}

/** Mean desirability per zone kind, mean land value and mean level over built tiles. */
export function zoneMeans(s: CityState): { desir: number[]; lv: number; level: string; wealth: string } {
  const sum = [0, 0, 0, 0];
  const n = [0, 0, 0, 0];
  let lv = 0;
  let lvN = 0;
  let level = 0;
  let wealth = 0;
  let built = 0;
  for (let i = 0; i < s.zone.length; i++) {
    const z = s.zone[i];
    if (!z) continue;
    sum[z] += s.desirability[i];
    n[z]++;
    lv += s.landValue[i];
    lvN++;
    if (s.level[i]) {
      built++;
      level += s.level[i];
      wealth += s.wealth[i];
    }
  }
  return {
    desir: [1, 2, 3].map(z => Math.round(sum[z] / Math.max(1, n[z]))),
    lv: Math.round(lv / Math.max(1, lvN)),
    level: (level / Math.max(1, built)).toFixed(2),
    wealth: (wealth / Math.max(1, built)).toFixed(2),
  };
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** A simple responsive mayor: adds plants, water and services when the advisor would nag. */
let reserve = 0;
function mayor(s: CityState, L: Layout, year: number): void {
  const t = s.totals;
  const spot = (): { x: number; y: number } => {
    // reserve lots along the industrial side, below the plant
    const px = L.x0 + L.w - 8;
    const py = L.y0 + 6 + (reserve++ % 5) * 5 + 1;
    act(s, { type: 'bulldoze', rect: { x0: px, y0: py, x1: px + 2, y1: py + 2 } });
    return { x: px, y: py };
  };
  if (t.powerSupply === 0 || t.powerDemand > t.powerSupply * 0.9) {
    const at = spot();
    act(s, { type: 'plop', plop: PLOP.COAL, at });
    if (!quiet) console.log(`  year ${year}: + coal plant`);
  }
  if (t.waterDemand > t.waterSupply * 0.9) {
    const at = spot();
    act(s, { type: 'plop', plop: PLOP.TOWER, at }, { type: 'plop', plop: PLOP.TOWER, at: { x: at.x + 1, y: at.y } }, { type: 'plop', plop: PLOP.TOWER, at: { x: at.x + 2, y: at.y } });
    if (!quiet) console.log(`  year ${year}: + water towers`);
  }
  if (year === 4) act(s, ...serviceActions({ ...L, y0: L.y0 + 15 }));
  if (year === 5) {
    const cx = L.x0 + Math.floor(L.w / 2);
    act(s, { type: 'bulldoze', rect: { x0: cx - 1, y0: L.y0 + 21, x1: cx, y1: L.y0 + 22 } }, { type: 'plop', plop: PLOP.HIGH, at: { x: cx - 1, y: L.y0 + 21 } });
    act(s, { type: 'bulldoze', rect: { x0: cx + 2, y0: L.y0 + 21, x1: cx + 3, y1: L.y0 + 22 } }, { type: 'plop', plop: PLOP.PARK_L, at: { x: cx + 2, y: L.y0 + 21 } });
  }
}

const s = createCityState(seed);
const site = findSite(s, 45, 31);
if (!site) {
  console.error('no site found for seed', seed);
  process.exit(1);
}
act(s, ...townActions(site));
const failed = s.results.filter(r => !r.ok);
if (!quiet) console.log(`seed ${seed} site ${site.edge} @${site.x0},${site.y0} actions ${s.results.length} failed ${failed.length} funds ${fmt(s.funds)}`);
s.results.length = 0;
primeDerived(s);
const t0 = performance.now();
let maxTick = 0;
for (let y = 0; y < years; y++) {
  if (y === 1) act(s, ...serviceActions(site));
  if (y === 3 || y === 6) act(s, ...densifyActions(site, y === 3 ? 2 : 3));
  if (y > 0) mayor(s, site, y);
  for (let m = 0; m < 12 * TICKS_PER_MONTH; m++) {
    const a = performance.now();
    tick(s);
    maxTick = Math.max(maxTick, performance.now() - a);
  }
  const t = s.totals;
  const ds = zoneMeans(s);
  const d = Array.from(s.demand).map(v => Math.round(v).toString().padStart(4)).join('');
  if (!quiet)
    console.log(
      `year ${String(y + 1).padStart(2)} pop ${fmt(t.population).padStart(7)} jobs ${fmt(t.jobsFilled).padStart(6)}/${fmt(t.jobs).padStart(6)} bld ${String(t.buildings).padStart(4)} aband ${String(t.abandoned).padStart(3)} funds ${fmt(s.funds).padStart(9)} unemp ${(t.unemployment * 100).toFixed(0).padStart(3)}% pow ${fmt(t.powerDemand)}/${fmt(t.powerSupply)} wat ${fmt(t.waterDemand)}/${fmt(t.waterSupply)} poll ${t.meanPollution.toFixed(0)} crime ${t.meanCrime.toFixed(0)} edu ${t.cityEdu.toFixed(0)} desir R/C/I ${ds.desir.join('/')} lv ${ds.lv} lvl ${ds.level} w ${ds.wealth} demand[${d}] fires ${t.fires}`,
    );
}
const ms = performance.now() - t0;
console.log(`${years} years in ${ms.toFixed(0)} ms (${(ms / (years * 12 * TICKS_PER_MONTH)).toFixed(2)} ms/tick, max ${maxTick.toFixed(1)} ms) → pop ${fmt(s.totals.population)} funds ${fmt(s.funds)}`);
for (const m of s.messages) console.log(`  advisor[${m.level}] ${m.text}`);
