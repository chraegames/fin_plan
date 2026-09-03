// Module worker: generates one zone off the main thread.

import { generateZone } from './floorgen';
import { loopDef } from './loops';
import type { Hero, Tower } from './types';

self.onmessage = (e: MessageEvent<{ tower: Tower; zone: number; heroIn: Hero }>) => {
  const { tower, zone, heroIn } = e.data;
  try {
    generateZone(tower.seed, loopDef(tower.loop), tower, zone, heroIn);
    self.postMessage({ type: 'done', tower });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
