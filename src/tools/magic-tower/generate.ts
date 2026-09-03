// Zone generation for the UI: in a worker when available, else inline.

import { emptyTower, generateZone, hasZone, heroForZone } from './floorgen';
import { loopDef } from './loops';
import type { Hero, Tower } from './types';

export { emptyTower, hasZone, heroForZone };

function inline(tower: Tower, zone: number, heroIn: Hero): Tower {
  const t: Tower = { ...tower, floors: tower.floors.slice(), zones: tower.zones.slice(), healing: tower.healing.slice() };
  generateZone(t.seed, loopDef(t.loop), t, zone, heroIn);
  return t;
}

export function generateZoneAsync(tower: Tower, zone: number, heroIn: Hero): Promise<Tower> {
  if (typeof Worker === 'undefined') {
    return new Promise(resolve => setTimeout(() => resolve(inline(tower, zone, heroIn)), 20));
  }
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      setTimeout(() => resolve(inline(tower, zone, heroIn)), 20);
      return;
    }
    worker.onmessage = (e: MessageEvent<{ type: string; tower?: Tower; message?: string }>) => {
      const d = e.data;
      if (d.type === 'done' && d.tower) {
        worker.terminate();
        resolve(d.tower);
      } else if (d.type === 'error') {
        worker.terminate();
        reject(new Error(d.message));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      setTimeout(() => {
        try {
          resolve(inline(tower, zone, heroIn));
        } catch (err) {
          reject(err as Error);
        }
      }, 20);
    };
    worker.postMessage({ tower, zone, heroIn });
  });
}
