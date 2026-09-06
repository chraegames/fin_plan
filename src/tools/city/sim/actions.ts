// Player actions: validate, charge, mutate, flag what changed. Every mutation
// of the saved layers by the player goes through here.

import { COST, PLOPS, TUNING, plopDef } from '../constants';
import { CHANGE, PLOP, ZONE, type Action, type ActionFail, type ActionResult, type CityState, type XY } from '../types';
import { clampRect, idx, inBounds, lineTiles, xOf, yOf } from './grid';
import { markDirty } from './state';
import { buildable } from './terrain';
import { earthquake, startTornado } from './disasters';
import { demolish } from './growth';

const lineBuf: number[] = [];

function fail(id: number, reason: ActionFail): ActionResult {
  return { id, ok: false, cost: 0, reason };
}

function clearBuilding(s: CityState, i: number): void {
  s.level[i] = 0;
  s.wealth[i] = 0;
  s.abandoned[i] = 0;
  s.age[i] = 0;
  s.pop[i] = 0;
  s.jobs[i] = 0;
  s.onFire[i] = 0;
  s.burnTicks[i] = 0;
}

/** Remove the whole plop that covers tile i. */
export function removePlop(s: CityState, i: number): void {
  const origin = s.plopOrigin[i];
  const def = plopDef(s.plop[i]);
  if (!def) return;
  const ox = xOf(origin);
  const oy = yOf(origin);
  for (let dy = 0; dy < def.size; dy++) {
    for (let dx = 0; dx < def.size; dx++) {
      const j = idx(ox + dx, oy + dy);
      if (s.plopOrigin[j] === origin && s.plop[j] === def.id) {
        s.plop[j] = PLOP.NONE;
        s.plopOrigin[j] = 0;
        s.onFire[j] = 0;
        s.burnTicks[j] = 0;
        markDirty(s, j);
      }
    }
  }
  flagPlop(s, def.kind);
}

function flagPlop(s: CityState, kind: string): void {
  s.flags.netDirty = true;
  if (kind === 'water') s.flags.waterDirty = true;
  if (kind === 'park' || kind === 'water') s.flags.distDirty = true;
  s.flags.serviceDirty = true;
}

/** Tile is free ground: land, gentle, no road, no plop, no building. */
function emptyGround(s: CityState, i: number): boolean {
  return buildable(s, i) && !s.road[i] && !s.plop[i] && !s.level[i];
}

function charge(s: CityState, id: number, cost: number): ActionResult | null {
  if (cost > 0 && s.funds < cost) return fail(id, 'funds');
  s.funds -= cost;
  s.changed |= CHANGE.HUD;
  return null;
}

export function canPlop(s: CityState, plop: number, at: XY): boolean {
  const def = plopDef(plop);
  if (!def) return false;
  for (let dy = 0; dy < def.size; dy++) {
    for (let dx = 0; dx < def.size; dx++) {
      if (!inBounds(at.x + dx, at.y + dy)) return false;
      if (!emptyGround(s, idx(at.x + dx, at.y + dy))) return false;
    }
  }
  return true;
}

/** Preview cost of an action without applying it (for the HUD). */
export function previewCost(s: CityState, a: Action): number {
  switch (a.type) {
    case 'zone': {
      const r = clampRect(a.rect);
      let n = 0;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (zoneable(s, idx(x, y), a.zone, a.density)) n++;
      return n * COST.zone;
    }
    case 'road':
    case 'line': {
      lineTiles(a.from, a.to, lineBuf);
      let n = 0;
      for (const i of lineBuf) {
        if (a.type === 'road') {
          if (roadable(s, i, !!a.avenue)) n += roadCost(s, i, !!a.avenue);
        } else if (lineable(s, i)) n += plopDef(PLOP.LINE)?.cost ?? 5;
      }
      return n;
    }
    case 'plop':
      return plopDef(a.plop)?.cost ?? 0;
    case 'bulldoze': {
      const r = clampRect(a.rect);
      let n = 0;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (hasSomething(s, idx(x, y))) n++;
      return n * COST.bulldoze;
    }
    default:
      return 0;
  }
}

function zoneable(s: CityState, i: number, zone: number, density: number): boolean {
  if (!buildable(s, i) || s.road[i] || s.plop[i]) return false;
  // a built lot may change density (it redevelops) but not zone kind — bulldoze first
  if (s.level[i] && s.zone[i] !== zone) return false;
  return s.zone[i] !== zone || s.density[i] !== density;
}
function roadable(s: CityState, i: number, avenue = false): boolean {
  if (!buildable(s, i) || s.plop[i] || s.level[i]) return false;
  // a street can be upgraded to an avenue; nothing else may be rebuilt
  return s.road[i] === 0 || (avenue && s.road[i] === 1);
}
function roadCost(s: CityState, i: number, avenue: boolean): number {
  if (!avenue) return COST.road;
  return s.road[i] === 1 ? COST.avenue - COST.road : COST.avenue;
}
function lineable(s: CityState, i: number): boolean {
  return buildable(s, i) && !s.road[i] && !s.plop[i] && !s.level[i];
}
function hasSomething(s: CityState, i: number): boolean {
  return !!(s.road[i] || s.plop[i] || s.level[i] || s.zone[i]);
}

export function applyAction(s: CityState, a: Action, id: number): ActionResult {
  switch (a.type) {
    case 'zone': {
      const r = clampRect(a.rect);
      const tiles: number[] = [];
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (zoneable(s, idx(x, y), a.zone, a.density)) tiles.push(idx(x, y));
      if (!tiles.length) return fail(id, 'noop');
      const cost = tiles.length * COST.zone;
      const err = charge(s, id, cost);
      if (err) return err;
      for (const i of tiles) {
        s.zone[i] = a.zone;
        s.density[i] = a.density;
        // a built lot changing density is redeveloped: it comes down and regrows
        if (s.level[i]) demolish(s, i);
        markDirty(s, i);
      }
      s.flags.netDirty = true;
      return { id, ok: true, cost };
    }
    case 'dezone': {
      const r = clampRect(a.rect);
      let n = 0;
      for (let y = r.y0; y <= r.y1; y++) {
        for (let x = r.x0; x <= r.x1; x++) {
          const i = idx(x, y);
          if (s.zone[i] && !s.level[i]) {
            s.zone[i] = ZONE.NONE;
            s.density[i] = 0;
            markDirty(s, i);
            n++;
          }
        }
      }
      if (!n) return fail(id, 'noop');
      s.flags.netDirty = true;
      return { id, ok: true, cost: 0 };
    }
    case 'bulldoze': {
      const r = clampRect(a.rect);
      const tiles: number[] = [];
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (hasSomething(s, idx(x, y))) tiles.push(idx(x, y));
      if (!tiles.length) return fail(id, 'noop');
      const cost = tiles.length * COST.bulldoze;
      const err = charge(s, id, cost);
      if (err) return err;
      for (const i of tiles) {
        if (s.plop[i]) removePlop(s, i);
        if (s.road[i]) {
          s.road[i] = 0;
          s.flags.waterDirty = true;
          s.flags.serviceDirty = true;
        }
        if (s.level[i]) demolish(s, i); // whole lot
        clearBuilding(s, i);
        s.zone[i] = ZONE.NONE;
        s.density[i] = 0;
        markDirty(s, i);
      }
      s.flags.netDirty = true;
      s.changed |= CHANGE.FIRE;
      return { id, ok: true, cost };
    }
    case 'road':
    case 'line': {
      lineTiles(a.from, a.to, lineBuf);
      const isRoad = a.type === 'road';
      const avenue = isRoad && !!a.avenue;
      const tiles = lineBuf.filter(i => (isRoad ? roadable(s, i, avenue) : lineable(s, i)));
      if (!tiles.length) return fail(id, lineBuf.every(i => (isRoad ? s.road[i] : s.plop[i] === PLOP.LINE)) ? 'noop' : 'terrain');
      let cost = 0;
      for (const i of tiles) cost += isRoad ? roadCost(s, i, avenue) : (plopDef(PLOP.LINE)?.cost ?? 5);
      const err = charge(s, id, cost);
      if (err) return err;
      for (const i of tiles) {
        s.zone[i] = ZONE.NONE;
        s.density[i] = 0;
        if (isRoad) s.road[i] = avenue ? 2 : 1;
        else {
          s.plop[i] = PLOP.LINE;
          s.plopOrigin[i] = i;
        }
        markDirty(s, i);
      }
      s.flags.netDirty = true;
      if (isRoad) {
        s.flags.waterDirty = true;
        s.flags.serviceDirty = true;
      }
      return { id, ok: true, cost };
    }
    case 'plop': {
      const def = plopDef(a.plop);
      if (!def || def.id === PLOP.LINE) return fail(id, 'noop');
      if (!canPlop(s, a.plop, a.at)) return fail(id, 'occupied');
      const err = charge(s, id, def.cost);
      if (err) return err;
      const origin = idx(a.at.x, a.at.y);
      for (let dy = 0; dy < def.size; dy++) {
        for (let dx = 0; dx < def.size; dx++) {
          const i = idx(a.at.x + dx, a.at.y + dy);
          s.zone[i] = ZONE.NONE;
          s.density[i] = 0;
          s.plop[i] = def.id;
          s.plopOrigin[i] = origin;
          markDirty(s, i);
        }
      }
      flagPlop(s, def.kind);
      return { id, ok: true, cost: def.cost };
    }
    case 'setTax': {
      const rate = Math.max(0, Math.min(20, Math.round(a.rate)));
      s.taxes[a.zone - 1] = rate;
      s.changed |= CHANGE.HUD;
      return { id, ok: true, cost: 0 };
    }
    case 'setFunding': {
      s.funding[a.service] = Math.max(0, Math.min(1.5, Math.round(a.level * 20) / 20));
      s.flags.serviceDirty = true;
      s.flags.netDirty = true;
      s.flags.waterDirty = true;
      s.changed |= CHANGE.HUD;
      return { id, ok: true, cost: 0 };
    }
    case 'loan': {
      if (!(TUNING.loanSizes as readonly number[]).includes(a.amount) || s.loans.length >= 3) return fail(id, 'noop');
      s.loans.push({ id: s.nextLoanId++, principal: a.amount, balance: a.amount, monthsLeft: TUNING.loanMonths });
      s.funds += a.amount;
      s.changed |= CHANGE.HUD;
      return { id, ok: true, cost: 0 };
    }
    case 'repay': {
      const k = s.loans.findIndex(l => l.id === a.id);
      if (k < 0) return fail(id, 'noop');
      const bal = s.loans[k].balance;
      if (s.funds < bal) return fail(id, 'funds');
      s.funds -= bal;
      s.loans.splice(k, 1);
      s.changed |= CHANGE.HUD;
      return { id, ok: true, cost: bal };
    }
    case 'disaster': {
      if (!inBounds(a.at.x, a.at.y)) return fail(id, 'bounds');
      const i = idx(a.at.x, a.at.y);
      if (a.kind === 'fire') {
        if (!(s.level[i] || (s.plop[i] && s.plop[i] !== PLOP.LINE))) return fail(id, 'noop');
        s.onFire[i] = 120;
        s.flags.anyFire = true;
        s.changed |= CHANGE.FIRE;
      } else if (a.kind === 'tornado') {
        if (s.tornado) return fail(id, 'noop');
        startTornado(s, a.at);
      } else earthquake(s, a.at);
      return { id, ok: true, cost: 0 };
    }
  }
}

export { PLOPS };
