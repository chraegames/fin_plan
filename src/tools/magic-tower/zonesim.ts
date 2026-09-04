// A small, clonable simulation of one hero inside one zone of a tower. The
// solver searches over it, the naive policies walk it, and the validator
// compares its verdicts with the real reducer. It models exactly what the
// game allows: free movement over passable tiles, fights (only winnable
// ones), doors (only with a key), stairs between the zone's floors, holes,
// vault breaches, holy water and shop purchases.

import { applyFight, canWin, type FightCtx } from './combat';
import { KEY_GOLD, shopAtk, shopDef, shopHp, shopPrice } from './curves';
import { afterKill, applyItem, drinkHolyWater, spendKey } from './items';
import { loopDef } from './loops';
import { frontier, reach, type FloorState, type Reach } from './path';
import { T, neighbours, XY, type Action, type Floor, type Hero, type Tower } from './types';

interface LineNode {
  a: Action;
  prev: LineNode | null;
}

interface Ords {
  mon: Map<number, number>;
  door: Map<number, number>;
  item: Map<number, number>;
  hole: Map<number, number>;
}

export interface SimOption {
  action: Action;
  /** HP the action costs (fight damage + walking through zones). */
  cost: number;
  /** Rough value gained (for heuristics). */
  value: number;
}

export class ZoneSim {
  readonly tower: Tower;
  readonly zone: number;
  readonly floors: Floor[];
  hero: Hero;
  fi: number; // index into floors
  pos: number;
  /** Per-floor bitmasks over the floor's ordinal maps (see ords()). */
  killed: number[];
  opened: number[];
  taken: number[];
  holes: number[];
  /** Persistent linked list of actions (cheap to clone). */
  private lineNode: LineNode | null = null;
  private cache: Reach | null = null;
  private static ordCache = new WeakMap<Floor, Ords>();

  /**
   * Ordinal maps (tile → bit index) per floor. Append-only: a monster/door/item
   * added to a floor after the map exists (the generator converts doors to
   * guards mid-walk) gets the next free ordinal, so existing masks stay valid.
   */
  static ords(f: Floor): Ords {
    let o = ZoneSim.ordCache.get(f);
    if (!o) {
      o = { mon: new Map(), door: new Map(), item: new Map(), hole: new Map() };
      ZoneSim.ordCache.set(f, o);
      ZoneSim.refreshOrds(f);
    }
    return o;
  }

  /** Call after adding monsters/doors/items to a floor that sims may already reference. */
  static refreshOrds(f: Floor): void {
    const o = ZoneSim.ordCache.get(f);
    if (!o) return;
    const sync = (m: Map<number, number>, keys: string[]) => {
      for (const k of keys.map(Number).sort((a, b) => a - b)) if (!m.has(k)) m.set(k, m.size);
    };
    sync(o.mon, Object.keys(f.mons));
    sync(o.door, Object.keys(f.doors));
    sync(o.item, Object.keys(f.items));
  }

  constructor(tower: Tower, zone: number, hero: Hero, start?: { fi: number; pos: number }) {
    this.tower = tower;
    this.zone = zone;
    this.floors = tower.zones[zone].floors.map(n => tower.floors[n - 1]);
    this.hero = hero;
    this.fi = start?.fi ?? 0;
    this.pos = start?.pos ?? this.floors[this.fi].entry;
    this.killed = this.floors.map(() => 0);
    this.opened = this.floors.map(() => 0);
    this.taken = this.floors.map(() => 0);
    this.holes = this.floors.map(() => 0);
  }

  clone(): ZoneSim {
    const c = new ZoneSim(this.tower, this.zone, this.hero, { fi: this.fi, pos: this.pos });
    c.killed = this.killed.slice();
    c.opened = this.opened.slice();
    c.taken = this.taken.slice();
    c.holes = this.holes.slice();
    c.lineNode = this.lineNode;
    return c;
  }

  isKilled(fi: number, i: number): boolean {
    const k = ZoneSim.ords(this.floors[fi]).mon.get(i);
    return k != null && (this.killed[fi] & (1 << k)) !== 0;
  }
  isOpened(fi: number, i: number): boolean {
    const k = ZoneSim.ords(this.floors[fi]).door.get(i);
    return k != null && (this.opened[fi] & (1 << k)) !== 0;
  }
  isTaken(fi: number, i: number): boolean {
    const k = ZoneSim.ords(this.floors[fi]).item.get(i);
    return k != null && (this.taken[fi] & (1 << k)) !== 0;
  }
  isHole(fi: number, i: number): boolean {
    const k = ZoneSim.holeOrd(this.floors[fi], i, false);
    return k != null && (this.holes[fi] & (1 << k)) !== 0;
  }
  private static holeOrd(f: Floor, i: number, create: boolean): number | null {
    const o = ZoneSim.ords(f);
    let k = o.hole.get(i);
    if (k == null && create) {
      k = o.hole.size;
      o.hole.set(i, k);
    }
    return k ?? null;
  }
  private setKilled(fi: number, i: number): void {
    this.killed[fi] |= 1 << ZoneSim.ords(this.floors[fi]).mon.get(i)!;
  }
  private setOpened(fi: number, i: number): void {
    this.opened[fi] |= 1 << ZoneSim.ords(this.floors[fi]).door.get(i)!;
  }
  private setTaken(fi: number, i: number): void {
    this.taken[fi] |= 1 << ZoneSim.ords(this.floors[fi]).item.get(i)!;
  }
  private setHole(fi: number, i: number): void {
    this.holes[fi] |= 1 << ZoneSim.holeOrd(this.floors[fi], i, true)!;
  }
  /** Hole tile indices on a floor. */
  holeTiles(fi: number): number[] {
    const out: number[] = [];
    for (const [i, k] of ZoneSim.ords(this.floors[fi]).hole) if (this.holes[fi] & (1 << k)) out.push(i);
    return out;
  }


  /** Actions applied so far, oldest first. */
  get line(): Action[] {
    const out: Action[] = [];
    for (let n = this.lineNode; n; n = n.prev) out.push(n.a);
    return out.reverse();
  }

  private pushLine(a: Action): void {
    this.lineNode = { a, prev: this.lineNode };
  }

  get floor(): Floor {
    return this.floors[this.fi];
  }

  state(fi = this.fi): FloorState {
    return {
      isKilled: i => this.isKilled(fi, i),
      isOpened: i => this.isOpened(fi, i),
      isTaken: i => this.isTaken(fi, i),
      isHole: i => this.isHole(fi, i),
      isDug: () => false,
    };
  }

  reach(): Reach {
    if (!this.cache) this.cache = reach(this.floor, this.state(), this.pos);
    return this.cache;
  }

  private invalidate(): void {
    this.cache = null;
  }

  fightCtx(at: number, fi = this.fi): FightCtx {
    const f = this.floors[fi];
    let auraPct = 0;
    let supporters = 0;
    for (const k in f.mons) {
      const i = Number(k);
      if (i === at || this.isKilled(fi, i)) continue;
      const m = f.mons[i];
      if (m.abilities.includes('aura')) auraPct += m.auraPct ?? 0.2;
    }
    for (const n of neighbours(at)) {
      const m = f.mons[n];
      if (m && !this.isKilled(fi, n) && m.abilities.includes('support')) supporters++;
    }
    return { auraPct: auraPct || undefined, supporters: supporters || undefined };
  }

  /**
   * Pick up every reachable item except holy water (a deliberate action),
   * walking to each one in turn — cheapest first from where the hero stands —
   * so the recorded takes and their zone costs match what the game charges.
   */
  autoTake(): void {
    const f = this.floor;
    const flags = loopDef(this.tower.loop).flags;
    for (;;) {
      const r = this.reach();
      let best = -1;
      let bestCost = Infinity;
      for (const k in f.items) {
        const i = Number(k);
        if (this.isTaken(this.fi, i) || r.cost[i] === Infinity || f.items[i].kind === 'holyWater') continue;
        if (r.cost[i] < bestCost || (r.cost[i] === bestCost && i < best)) {
          best = i;
          bestCost = r.cost[i];
        }
      }
      if (best < 0) return;
      if (bestCost >= this.hero.hp) return; // walking there would kill us
      this.setTaken(this.fi, best);
      this.hero = applyItem({ ...this.hero, hp: this.hero.hp - bestCost }, f.items[best], flags.potionMult);
      this.pos = best;
      this.pushLine({ t: 'take', floor: f.n, at: best });
      this.invalidate();
    }
  }

  bossDead(): boolean {
    const last = this.floors.length - 1;
    const f = this.floors[last];
    for (const k in f.mons) if (f.mons[Number(k)].boss && !this.isKilled(last, Number(k))) return false;
    return true;
  }

  /** Zone cleared: standing on the last floor with its boss dead and the exit reachable. */
  done(): boolean {
    if (this.fi !== this.floors.length - 1) return false;
    if (!this.bossDead()) return false;
    return this.reach().cost[this.floor.exit] !== Infinity;
  }

  /** Every legal next step from here. */
  options(): SimOption[] {
    this.autoTake();
    const f = this.floor;
    const r = this.reach();
    const st = this.state();
    const out: SimOption[] = [];
    for (const fr of frontier(f, st, r)) {
      const m = f.mons[fr.at];
      if (m && !st.isKilled(fr.at)) {
        if (canWin(this.hero, m, this.fightCtx(fr.at))) {
          const d = this.hero.hp - applyFight(this.hero, m, this.fightCtx(fr.at)).hp;
          out.push({ action: { t: 'fight', floor: f.n, at: fr.at }, cost: fr.approachCost + Math.max(0, d), value: m.gold + m.exp });
        }
        continue;
      }
      const door = f.doors[fr.at];
      if (door && !st.isOpened(fr.at)) {
        if (this.hero.keys[door] > 0) out.push({ action: { t: 'door', floor: f.n, at: fr.at }, cost: fr.approachCost, value: 0 });
        continue;
      }
      const npc = f.npcs[fr.at];
      if (npc && npc.kind === 'shop') {
        const n = this.hero.shopBuys + 1;
        let price = shopPrice(n, npc.tier);
        if (this.hero.perks.includes('merchant')) price = Math.round(price * 0.75);
        if (this.hero.gold >= price) {
          out.push({ action: { t: 'shop', floor: f.n, at: fr.at, what: 'def' }, cost: fr.approachCost, value: shopDef(npc.tier) * 2 });
          out.push({ action: { t: 'shop', floor: f.n, at: fr.at, what: 'atk' }, cost: fr.approachCost, value: shopAtk(npc.tier) * 2 });
          out.push({ action: { t: 'shop', floor: f.n, at: fr.at, what: 'hp' }, cost: fr.approachCost, value: shopHp(npc.tier) / 50 });
        }
      }
    }
    // Holy water on the floor: take now.
    for (const k in f.items) {
      const i = Number(k);
      if (f.items[i].kind === 'holyWater' && !st.isTaken(i) && r.cost[i] !== Infinity) {
        out.push({ action: { t: 'take', floor: f.n, at: i }, cost: r.cost[i], value: 5 });
      }
    }
    if (this.hero.holyWater > 0) out.push({ action: { t: 'holyWater', floor: f.n }, cost: 0, value: 5 });
    // Stairs onward (boss floors: only once the boss is dead).
    const bossFloor = this.fi === this.floors.length - 1;
    if (!bossFloor && r.cost[f.exit] !== Infinity) {
      out.push({ action: { t: 'stairs', floor: f.n, to: this.floors[this.fi + 1].n }, cost: r.cost[f.exit], value: 1 });
    }
    if (this.fi > 0 && r.cost[f.entry] !== Infinity) {
      out.push({ action: { t: 'stairs', floor: f.n, to: this.floors[this.fi - 1].n }, cost: r.cost[f.entry], value: 0 });
    }
    // Holes made earlier: two-way passages.
    for (const h of this.holeTiles(this.fi)) {
      if (r.cost[h] === Infinity) continue;
      for (const d of [-1, 1]) {
        const j = this.fi + d;
        if (j < 0 || j >= this.floors.length) continue;
        if (this.isHole(j, h)) out.push({ action: { t: 'hole', floor: f.n, at: h, to: this.floors[j].n }, cost: r.cost[h], value: 0 });
      }
    }
    // Vault breaches: from a reachable tile aligned with a neighbouring floor's vault centre.
    const onStairs = this.pos === f.entry || this.pos === f.exit;
    if (this.hero.stones > 0 && !onStairs) {
      for (const d of [-1, 1]) {
        const j = this.fi + d;
        if (j < 0 || j >= this.floors.length) continue;
        if (d === 1 && bossFloor) continue; // sealed ceiling
        const g = this.floors[j];
        for (const v of g.vaults) {
          if (this.isTaken(j, v) || this.isHole(j, v)) continue;
          if (r.cost[v] === Infinity || v === f.entry || v === f.exit) continue;
          out.push({ action: { t: 'breach', floor: f.n, at: v, to: g.n }, cost: r.cost[v], value: 8 });
        }
      }
    }
    return out;
  }

  /** Apply an option (assumed to come from options()). Returns false if illegal. */
  apply(a: Action): boolean {
    const f = this.floor;
    const flags = loopDef(this.tower.loop).flags;
    switch (a.t) {
      case 'take': {
        const it = f.items[a.at];
        if (!it || this.isTaken(this.fi, a.at)) return false;
        const r = this.reach();
        if (r.cost[a.at] === Infinity) return false;
        this.hero = { ...this.hero, hp: this.hero.hp - r.cost[a.at] };
        this.setTaken(this.fi, a.at);
        this.hero = applyItem(this.hero, it, flags.potionMult);
        this.pos = a.at;
        break;
      }
      case 'fight': {
        const m = f.mons[a.at];
        if (!m || this.isKilled(this.fi, a.at)) return false;
        const fr = frontier(f, this.state(), this.reach()).find(x => x.at === a.at);
        if (!fr) return false;
        const ctx = this.fightCtx(a.at);
        const h0 = { ...this.hero, hp: this.hero.hp - fr.approachCost };
        if (h0.hp <= 0 || !canWin(h0, m, ctx)) return false;
        this.hero = afterKill(applyFight(h0, m, ctx));
        this.setKilled(this.fi, a.at);
        this.pos = fr.via;
        if (m.boss && flags.keyToGold) {
          // Loop 4+ "Chains": keys carried past a boss turn to gold (mirrors game.ts).
          const k = this.hero.keys;
          const gold = k.y * KEY_GOLD.y + k.b * KEY_GOLD.b + k.r * KEY_GOLD.r;
          this.hero = { ...this.hero, gold: this.hero.gold + gold, keys: { y: 0, b: 0, r: 0 } };
        }
        break;
      }
      case 'door': {
        const c = f.doors[a.at];
        if (!c || this.isOpened(this.fi, a.at)) return false;
        const fr = frontier(f, this.state(), this.reach()).find(x => x.at === a.at);
        if (!fr) return false;
        const h = spendKey({ ...this.hero, hp: this.hero.hp - fr.approachCost }, c);
        if (!h || h.hp <= 0) return false;
        this.hero = h;
        this.setOpened(this.fi, a.at);
        this.pos = fr.via;
        break;
      }
      case 'stairs': {
        const j = this.floors.findIndex(x => x.n === a.to);
        if (j !== this.fi + 1 && j !== this.fi - 1) return false;
        const forward = j === this.fi + 1;
        if (forward && this.fi === this.floors.length - 1) return false;
        const via = forward ? f.exit : f.entry;
        const r = this.reach();
        if (r.cost[via] === Infinity) return false;
        this.hero = { ...this.hero, hp: this.hero.hp - r.cost[via] };
        // Stairs land on the matching stairs of the other floor (same coordinates).
        const g = this.floors[j];
        this.fi = j;
        this.pos = forward ? g.entry : g.exit;
        break;
      }
      case 'hole': {
        const j = this.floors.findIndex(x => x.n === a.to);
        if (j < 0 || !this.isHole(this.fi, a.at) || !this.isHole(j, a.at)) return false;
        const r = this.reach();
        if (r.cost[a.at] === Infinity) return false;
        this.hero = { ...this.hero, hp: this.hero.hp - r.cost[a.at] };
        this.fi = j;
        this.pos = a.at;
        break;
      }
      case 'breach': {
        const j = this.floors.findIndex(x => x.n === a.to);
        if (j < 0 || Math.abs(j - this.fi) !== 1 || this.hero.stones <= 0) return false;
        if (j > this.fi && this.fi === this.floors.length - 1) return false;
        const r = this.reach();
        if (r.cost[a.at] === Infinity) return false;
        const g = this.floors[j];
        const dest = g.base[a.at];
        const hollow = dest === T.Floor || (dest === T.VaultWall && g.vaults.includes(a.at));
        if (!hollow) return false;
        this.hero = { ...this.hero, hp: this.hero.hp - r.cost[a.at], stones: this.hero.stones - 1 };
        this.setHole(this.fi, a.at);
        this.setHole(j, a.at);
        this.fi = j;
        this.pos = a.at;
        break;
      }
      case 'holyWater': {
        if (this.hero.holyWater <= 0) return false;
        this.hero = drinkHolyWater(this.hero);
        break;
      }
      case 'shop': {
        const npc = f.npcs[a.at];
        if (!npc || npc.kind !== 'shop') return false;
        const fr = frontier(f, this.state(), this.reach()).find(x => x.at === a.at);
        if (!fr) return false;
        const n = this.hero.shopBuys + 1;
        let price = shopPrice(n, npc.tier);
        if (this.hero.perks.includes('merchant')) price = Math.round(price * 0.75);
        if (this.hero.gold < price) return false;
        const h = { ...this.hero, hp: this.hero.hp - fr.approachCost, gold: this.hero.gold - price, shopBuys: n };
        if (a.what === 'atk') h.atk += shopAtk(npc.tier);
        else if (a.what === 'def') h.def += shopDef(npc.tier);
        else h.hp += shopHp(npc.tier);
        this.hero = h;
        this.pos = fr.via;
        break;
      }
      default:
        return false;
    }
    this.pushLine(a);
    this.invalidate();
    this.autoTake();
    return true;
  }

  /** Dominance key: same floor + same masks ⇒ compare by HP only. */
  key(): string {
    let k = `${this.fi}|${this.hero.shopBuys}|${this.hero.holyWater}|${this.hero.stones}`;
    for (let i = 0; i < this.floors.length; i++) k += `|${this.killed[i]},${this.opened[i]},${this.taken[i]},${this.holes[i]}`;
    return k;
  }

  /** Healing available in the zone (for slack). */
  static zoneHealing(tower: Tower, zone: number): number {
    return tower.zones[zone].floors.reduce((s, n) => s + tower.healing[n - 1], 0);
  }

  /** Human-readable coordinates for logs. */
  static xy(i: number): string {
    const { x, y } = XY(i);
    return `(${x},${y})`;
  }
}
