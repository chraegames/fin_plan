// Traffic: trips from residential blocks to jobs over the road graph, assigned
// with a few rounds of successive averages so congestion reroutes commuters.
// Writes traffic[] (link load), commute[] (per R tile) and employment totals.

import { TUNING } from '../constants';
import { CHANGE, N, T, ZONE, type CityState } from '../types';
import { tileCapacity } from './buildings';
import { idx, nbr } from './grid';
import { isEdge } from './roads';

export const EXTERNAL_BASE_JOBS = 2500;

const dist = new Float32Array(T);
const prev = new Int32Array(T);
const inHeap = new Uint8Array(T);
const heapNodes = new Int32Array(T);
const heapKeys = new Float32Array(T);
const heapPos = new Int32Array(T);
const destJobs = new Float32Array(T);
const destJobsBase = new Float32Array(T);
const volE = new Float32Array(T); // link tile → east neighbour
const volS = new Float32Array(T); // link tile → south neighbour
const volEnew = new Float32Array(T);
const volSnew = new Float32Array(T);
const attach = new Int32Array(T); // nearest road tile per tile
const attachDist = new Uint8Array(T);
const touchedList = new Int32Array(T);
const blockCommute = new Float32Array(T);

interface Origin {
  node: number;
  trips: number;
  block: number;
  commute: number;
  /** Share of trips made by car (bus riders do not load the roads). */
  cars: number;
}

// ─── binary heap over tiles ──────────────────────────────────────────
let heapSize = 0;
function heapPush(node: number, key: number): void {
  let i = heapSize++;
  heapNodes[i] = node;
  heapKeys[i] = key;
  heapPos[node] = i;
  inHeap[node] = 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapKeys[p] <= heapKeys[i]) break;
    swap(i, p);
    i = p;
  }
}
function heapDecrease(node: number, key: number): void {
  let i = heapPos[node];
  heapKeys[i] = key;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapKeys[p] <= heapKeys[i]) break;
    swap(i, p);
    i = p;
  }
}
function heapPop(): number {
  const top = heapNodes[0];
  inHeap[top] = 0;
  heapSize--;
  if (heapSize > 0) {
    heapNodes[0] = heapNodes[heapSize];
    heapKeys[0] = heapKeys[heapSize];
    heapPos[heapNodes[0]] = 0;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heapSize && heapKeys[l] < heapKeys[m]) m = l;
      if (r < heapSize && heapKeys[r] < heapKeys[m]) m = r;
      if (m === i) break;
      swap(i, m);
      i = m;
    }
  }
  return top;
}
function swap(a: number, b: number): void {
  const n = heapNodes[a];
  heapNodes[a] = heapNodes[b];
  heapNodes[b] = n;
  const k = heapKeys[a];
  heapKeys[a] = heapKeys[b];
  heapKeys[b] = k;
  heapPos[heapNodes[a]] = a;
  heapPos[heapNodes[b]] = b;
}

/** Link between tile a and its neighbour b (b = a ± 1 or ± N): volume array + index. */
function linkVol(vol: { e: Float32Array; s: Float32Array }, a: number, b: number): [Float32Array, number] {
  if (b === a + 1) return [vol.e, a];
  if (b === a - 1) return [vol.e, b];
  if (b === a + N) return [vol.s, a];
  return [vol.s, b];
}

function nearestRoads(s: CityState): void {
  const q = s.queue;
  let head = 0;
  let tail = 0;
  attach.fill(-1);
  attachDist.fill(255);
  for (let i = 0; i < T; i++) {
    if (s.road[i]) {
      attach[i] = i;
      attachDist[i] = 0;
      q[tail++] = i;
    }
  }
  while (head < tail) {
    const i = q[head++];
    const d = attachDist[i] + 1;
    if (d > 3) continue;
    for (let k = 0; k < 4; k++) {
      const n = nbr(i, k);
      if (n >= 0 && attachDist[n] === 255) {
        attachDist[n] = d;
        attach[n] = attach[i];
        q[tail++] = n;
      }
    }
  }
}

export function assignTraffic(s: CityState): void {
  nearestRoads(s);
  // destinations
  destJobsBase.fill(0);
  let totalJobs = 0;
  for (let i = 0; i < T; i++) {
    if (!s.level[i] || s.abandoned[i] || s.zone[i] === ZONE.R || !s.powered[i] || attach[i] < 0) continue;
    const j = tileCapacity(s, i);
    destJobsBase[attach[i]] += j;
    totalJobs += j;
  }
  if (s.externalConnected) {
    let edges = 0;
    for (let i = 0; i < T; i++) if (s.road[i] && isEdge(i) && s.extAccess[i]) edges++;
    const ext = Math.max(EXTERNAL_BASE_JOBS, TUNING.externalJobShare * totalJobs) / Math.max(1, edges);
    for (let i = 0; i < T; i++) if (s.road[i] && isEdge(i) && s.extAccess[i]) destJobsBase[i] += ext;
  }
  // origins per block
  const B = TUNING.originBlock;
  const origins: Origin[] = [];
  const blocksPerSide = N / B;
  for (let by = 0; by < blocksPerSide; by++) {
    for (let bx = 0; bx < blocksPerSide; bx++) {
      let trips = 0;
      let transitW = 0;
      let node = -1;
      let bestPop = -1;
      for (let y = by * B; y < (by + 1) * B; y++) {
        for (let x = bx * B; x < (bx + 1) * B; x++) {
          const i = idx(x, y);
          if (!s.level[i] || s.abandoned[i] || s.zone[i] !== ZONE.R || attach[i] < 0) continue;
          const w = s.pop[i] * TUNING.workforceRate;
          trips += w;
          // commuters on a bus route leave the car at home (they still get a job below)
          transitW += w * (s.transitCover[i] / 255);
          if (s.pop[i] > bestPop) {
            bestPop = s.pop[i];
            node = attach[i];
          }
        }
      }
      if (trips > 0 && node >= 0) origins.push({ node, trips, block: by * blocksPerSide + bx, commute: 255, cars: 1 - TUNING.transitTripCut * (transitW / trips) });
    }
  }
  origins.sort((a, b) => b.trips - a.trips || a.block - b.block);

  const cap = TUNING.linkCapacity * (0.5 + 0.5 * Math.min(1, s.funding[2]));
  volE.fill(0);
  volS.fill(0);
  let employed = 0;
  const K = TUNING.msaIterations;
  for (let iter = 1; iter <= K; iter++) {
    destJobs.set(destJobsBase);
    volEnew.fill(0);
    volSnew.fill(0);
    employed = 0;
    const vol = { e: volE, s: volS };
    const volNew = { e: volEnew, s: volSnew };
    for (const o of origins) {
      let assigned = 0;
      let costSum = 0;
      let nTouched = 0;
      let pops = 0;
      heapSize = 0;
      dist[o.node] = 0;
      prev[o.node] = -1;
      touchedList[nTouched++] = o.node;
      heapPush(o.node, 0);
      while (heapSize > 0 && assigned < o.trips && pops < TUNING.maxDijkstraPops) {
        const u = heapPop();
        pops++;
        const avail = destJobs[u];
        if (avail > 0) {
          const take = Math.min(avail, o.trips - assigned);
          destJobs[u] -= take;
          assigned += take;
          costSum += take * dist[u];
          // load the path
          let cur = u;
          while (prev[cur] >= 0) {
            const [arr, li] = linkVol(volNew, prev[cur], cur);
            arr[li] += take * o.cars;
            cur = prev[cur];
          }
        }
        const du = dist[u];
        for (let k = 0; k < 4; k++) {
          const v = nbr(u, k);
          if (v < 0 || !s.road[v]) continue;
          const [arr, li] = linkVol(vol, u, v);
          const load = arr[li] / (s.road[u] === 2 && s.road[v] === 2 ? cap * TUNING.avenueCapacity : cap);
          const w = 1 + TUNING.congestionK * load * load;
          const nd = du + w;
          if (dist[v] < 0 || nd < dist[v]) {
            if (dist[v] < 0) {
              touchedList[nTouched++] = v;
              dist[v] = nd;
              prev[v] = u;
              heapPush(v, nd);
            } else {
              dist[v] = nd;
              prev[v] = u;
              if (inHeap[v]) heapDecrease(v, nd);
              else heapPush(v, nd);
            }
          }
        }
      }
      for (let k = 0; k < nTouched; k++) {
        const t = touchedList[k];
        dist[t] = -1;
        inHeap[t] = 0;
      }
      heapSize = 0;
      o.commute = assigned > 0 ? costSum / assigned : 255;
      employed += assigned;
    }
    // successive averages
    const a = 1 / iter;
    for (let i = 0; i < T; i++) {
      volE[i] = (1 - a) * volE[i] + a * volEnew[i];
      volS[i] = (1 - a) * volS[i] + a * volSnew[i];
    }
  }
  // write outputs
  for (let i = 0; i < T; i++) {
    if (!s.road[i]) {
      s.traffic[i] = 0;
      continue;
    }
    let load = Math.max(volE[i], volS[i]);
    if (i >= 1 && s.road[i - 1]) load = Math.max(load, volE[i - 1]);
    if (i >= N && s.road[i - N]) load = Math.max(load, volS[i - N]);
    const tileCap = s.road[i] === 2 ? cap * TUNING.avenueCapacity : cap;
    s.traffic[i] = Math.min(255, Math.round((128 * load) / tileCap));
  }
  const noise = [1, 0.7, 0.4, 0.2];
  for (let i = 0; i < T; i++) {
    if (s.road[i] || attach[i] < 0) continue;
    s.traffic[i] = Math.round(s.traffic[attach[i]] * noise[attachDist[i]]);
  }
  blockCommute.fill(255);
  for (const o of origins) blockCommute[o.block] = Math.min(254, Math.round(o.commute));
  for (let i = 0; i < T; i++) {
    if (s.zone[i] !== ZONE.R) {
      s.commute[i] = 0;
      continue;
    }
    const x = i % N;
    const y = (i / N) | 0;
    s.commute[i] = blockCommute[((y / B) | 0) * blocksPerSide + ((x / B) | 0)];
  }
  const workforce = s.totals.population * TUNING.workforceRate;
  s.totals.employed = Math.round(employed);
  s.totals.unemployment = workforce > 0 ? Math.max(0, 1 - employed / workforce) : 0;
  s.changed |= CHANGE.TRAFFIC | CHANGE.HUD;
}

// dist uses -1 as "unvisited"
dist.fill(-1);
