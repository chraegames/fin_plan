// Headless City run: lays out a scripted town and prints yearly curves.
// Usage: npm run city:sim -- --seed 1 --years 10 [--quiet]

import { performance } from 'node:perf_hooks';
import { TICKS_PER_MONTH } from '../src/tools/city/constants';
import { createCityState } from '../src/tools/city/sim/state';
import { findSite, serviceActions, townActions, type Layout } from '../src/tools/city/sim/scenario';
import { densityUnlocked, isUnlocked, MILESTONES } from '../src/tools/city/sim/milestones';
import { plopDef } from '../src/tools/city/constants';
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
const listPlops = args.includes('--plops');

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

/** A responsive mayor: utilities and rubbish on demand, services scaled with population, civic buildings as they unlock, densification when allowed. */
let reserve = 0;
let stationSpot = 0;
const built = { police: 0, fire: 0, school: 0, clinic: 0, park: 0, garbage: 0, high: 0, hospital: 0, uni: 0, library: 0, bus: 0, cityHall: 0, stadium: 0, fireHq: 0, policeHq: 0 };
let densified = 1;
let densifyBands = 0;
function mayor(s: CityState, L: Layout, year: number): void {
  const t = s.totals;
  const unlocked = (p: number) => isUnlocked(s, p);
  // utility plots: two columns of 3×3 slots along the east edge, then the station grid
  const spot = (size = 3): { x: number; y: number } => {
    const k = reserve++;
    if (k < 10) {
      const px = L.x0 + L.w - 8 + (k >= 5 ? 4 : 0);
      const py = L.y0 + 6 + (k % 5) * 5 + 1;
      act(s, { type: 'bulldoze', rect: { x0: px, y0: py, x1: px + size - 1, y1: py + size - 1 } });
      return { x: px, y: py };
    }
    const cols = Math.floor((L.w - 10) / 7);
    const j = stationSpot++;
    const x = L.x0 + 1 + (j % cols) * 7 + 1;
    const y = L.y0 + 1 + Math.floor(j / cols) * 5;
    act(s, { type: 'bulldoze', rect: { x0: x, y0: y, x1: x + size - 1, y1: y + size - 1 } });
    return { x, y };
  };
  // a station spot inside the residential/commercial grid, next to a road
  const station = (plop: number, size = 1): void => {
    const cols = Math.floor((L.w - 10) / 7);
    const k = stationSpot++;
    const x = L.x0 + 1 + (k % cols) * 7 + 1;
    const y = L.y0 + 1 + Math.floor(k / cols) * 5;
    act(s, { type: 'bulldoze', rect: { x0: x, y0: y, x1: x + size - 1, y1: y + size - 1 } }, { type: 'plop', plop, at: { x, y } });
  };
  if (t.powerSupply === 0 || t.powerDemand > t.powerSupply * 0.9) {
    const plant = unlocked(PLOP.NUCLEAR) && t.powerDemand > 30000 ? PLOP.NUCLEAR : unlocked(PLOP.GAS) ? PLOP.GAS : PLOP.COAL;
    act(s, { type: 'plop', plop: plant, at: spot() });
    if (!quiet) console.log(`  year ${year}: + power plant ${plant}`);
  }
  if (t.waterDemand > t.waterSupply * 0.9) {
    const at = spot();
    act(s, { type: 'plop', plop: PLOP.TOWER, at }, { type: 'plop', plop: PLOP.TOWER, at: { x: at.x + 1, y: at.y } }, { type: 'plop', plop: PLOP.TOWER, at: { x: at.x + 2, y: at.y } });
  }
  if (t.population >= 150 && (t.garbageUncollected > 0.2 || t.garbageDemand > t.garbageSupply * 0.9)) {
    // rubbish facilities go inside the grid so their road reach covers the town
    const plop = unlocked(PLOP.INCINERATOR) ? PLOP.INCINERATOR : PLOP.LANDFILL;
    station(plop, plopDef(plop)!.size);
    built.garbage++;
    if (!quiet) console.log(`  year ${year}: + garbage ${plop}`);
  }
  const pop = t.population;
  if (unlocked(PLOP.POLICE) && pop / (built.police + 1) > 2500) { station(PLOP.POLICE); built.police++; }
  if (unlocked(PLOP.FIRE) && pop / (built.fire + 1) > 4000) { station(PLOP.FIRE); built.fire++; }
  if (unlocked(PLOP.SCHOOL) && pop / (built.school + 1) > 1800) { station(PLOP.SCHOOL); built.school++; }
  if (unlocked(PLOP.CLINIC) && pop / (built.clinic + 1) > 2500) { station(PLOP.CLINIC); built.clinic++; }
  if (pop / (built.park + 1) > 1500) { station(PLOP.PARK_S); built.park++; }
  if (unlocked(PLOP.HIGH) && pop / (built.high + 1) > 5000) { station(PLOP.HIGH, 2); built.high++; }
  if (unlocked(PLOP.HOSPITAL) && pop / (built.hospital + 1) > 9000) { station(PLOP.HOSPITAL, 2); built.hospital++; }
  if (unlocked(PLOP.LIBRARY) && pop / (built.library + 1) > 8000) { station(PLOP.LIBRARY, 2); built.library++; }
  if (unlocked(PLOP.UNI) && pop / (built.uni + 1) > 14000) { station(PLOP.UNI, 3); built.uni++; }
  if (unlocked(PLOP.BUS) && pop / (built.bus + 1) > 6000) { station(PLOP.BUS, 2); built.bus++; }
  if (unlocked(PLOP.CITY_HALL) && !built.cityHall) { station(PLOP.CITY_HALL, 2); built.cityHall++; }
  if (unlocked(PLOP.STADIUM) && !built.stadium && pop > 12000) { station(PLOP.STADIUM, 3); built.stadium++; }
  if (unlocked(PLOP.FIRE_HQ) && pop / (built.fireHq + 1) > 15000) { station(PLOP.FIRE_HQ, 2); built.fireHq++; }
  if (unlocked(PLOP.POLICE_HQ) && pop / (built.policeHq + 1) > 12000) { station(PLOP.POLICE_HQ, 2); built.policeHq++; }
  // densify the homes and shops a band at a time (a third of the rows per year) once the tier allows
  const third = Math.floor(L.w / 3);
  const target = densityUnlocked(s, 3) && pop > 6000 ? 3 : densityUnlocked(s, 2) && pop > 1500 ? 2 : 1;
  if (target > densified) {
    const band = (year % 3) * Math.ceil(L.h / 3);
    for (let y = L.y0 + band; y < Math.min(L.y0 + L.h, L.y0 + band + Math.ceil(L.h / 3)); y++) {
      if ((y - L.y0) % 5 === 0) continue;
      act(s, { type: 'zone', zone: 1, density: target as 2 | 3, rect: { x0: L.x0, y0: y, x1: L.x0 + third - 1, y1: y } });
      act(s, { type: 'zone', zone: 2, density: target as 2 | 3, rect: { x0: L.x0 + third, y0: y, x1: L.x0 + 2 * third - 1, y1: y } });
      act(s, { type: 'zone', zone: 3, density: 2, rect: { x0: L.x0 + 2 * third, y0: y, x1: L.x0 + L.w - 9, y1: y } });
    }
    densifyBands++;
    if (densifyBands >= 3) {
      densified = target;
      densifyBands = 0;
    }
    if (!quiet) console.log(`  year ${year}: densify band to ${target}`);
  }
  if (s.milestone >= 3 && !(s.policies & 1)) act(s, { type: 'setPolicy', policy: 1, on: true }, { type: 'setPolicy', policy: 2, on: true }, { type: 'setPolicy', policy: 8, on: true });
  if (s.funds < 5000 && s.loans.length < 3 && s.milestone >= 1) act(s, { type: 'loan', amount: 25000 });
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
  if (y > 0 && !quiet) console.log(`  ${MILESTONES[s.milestone].name} · stations police ${built.police} fire ${built.fire} school ${built.school} clinic ${built.clinic} park ${built.park} garbage ${built.garbage} high ${built.high} hosp ${built.hospital}`);
  if (y > 0) mayor(s, site, y);
  for (let m = 0; m < 12 * TICKS_PER_MONTH; m++) {
    const a = performance.now();
    tick(s);
    maxTick = Math.max(maxTick, performance.now() - a);
  }
  const t = s.totals;
  const ds = zoneMeans(s);
  if (listPlops) {
    const counts = new Map<string, number>();
    for (let i = 0; i < s.plop.length; i++) if (s.plop[i] && s.plopOrigin[i] === i) counts.set(plopDef(s.plop[i])!.key, (counts.get(plopDef(s.plop[i])!.key) ?? 0) + 1);
    console.log('  plops', [...counts.entries()].map(([k, v]) => `${k}:${v}`).join(' '), `garbage ${fmt(t.garbageDemand)}/${fmt(t.garbageSupply)}`);
  }
  const d = Array.from(s.demand).map(v => Math.round(v).toString().padStart(4)).join('');
  if (!quiet)
    console.log(
      `year ${String(y + 1).padStart(2)} pop ${fmt(t.population).padStart(7)} jobs ${fmt(t.jobsFilled).padStart(6)}/${fmt(t.jobs).padStart(6)} bld ${String(t.buildings).padStart(4)} aband ${String(t.abandoned).padStart(3)} funds ${fmt(s.funds).padStart(9)} unemp ${(t.unemployment * 100).toFixed(0).padStart(3)}% pow ${fmt(t.powerDemand)}/${fmt(t.powerSupply)} wat ${fmt(t.waterDemand)}/${fmt(t.waterSupply)} garb ${(t.garbageUncollected * 100).toFixed(0)}% poll ${t.meanPollution.toFixed(0)} crime ${t.meanCrime.toFixed(0)} edu ${t.cityEdu.toFixed(0)} hlth ${t.cityHealth.toFixed(0)} happy ${t.happiness.toFixed(0)} desir R/C/I ${ds.desir.join('/')} lv ${ds.lv} lvl ${ds.level} w ${ds.wealth} demand[${d}] fires ${t.fires}`,
    );
}
const ms = performance.now() - t0;
console.log(`${years} years in ${ms.toFixed(0)} ms (${(ms / (years * 12 * TICKS_PER_MONTH)).toFixed(2)} ms/tick, max ${maxTick.toFixed(1)} ms) → pop ${fmt(s.totals.population)} funds ${fmt(s.funds)}`);
for (const m of s.messages) console.log(`  advisor[${m.level}] ${m.text}`);
