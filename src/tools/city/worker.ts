// Module worker: hosts the simulation off the main thread.

import type { MainToWorker, WorkerToMain } from './protocol';
import { SimHost } from './sim/host';

const ctx = self as unknown as { postMessage(msg: WorkerToMain, transfer?: Transferable[]): void; onmessage: ((e: MessageEvent<MainToWorker>) => void) | null };

const host = new SimHost((msg, transfer) => {
  if (transfer) ctx.postMessage(msg, transfer);
  else ctx.postMessage(msg);
});

ctx.onmessage = (e: MessageEvent<MainToWorker>) => {
  try {
    host.handle(e.data);
  } catch (err) {
    ctx.postMessage({ type: 'error', message: String(err) });
  }
};

setInterval(() => {
  try {
    host.step(performance.now());
  } catch (err) {
    ctx.postMessage({ type: 'error', message: String(err) });
  }
}, 20);
