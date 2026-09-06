// SimClient: the main thread's handle on the simulation. Worker-backed when
// possible, otherwise the same SimHost runs inline on a timer.

import type { MainToWorker, Snapshot, WorkerToMain } from './protocol';
import { viewSnapshot } from './protocol';
import type { SaveFile } from './save';
import type { TerrainData } from './render/renderer';
import type { Action, ActionResult, Speed } from './types';

export interface SimClient {
  init(seed: number, save?: SaveFile): void;
  send(action: Action): Promise<ActionResult>;
  setSpeed(speed: Speed): void;
  fastForward(ticks: number): void;
  requestSave(): Promise<SaveFile>;
  requestSnapshot(): void;
  /** Return a snapshot buffer once the renderer is done with it. */
  recycle(buf: ArrayBuffer): void;
  onTerrain(cb: (t: TerrainData) => void): void;
  onSnapshot(cb: (s: Snapshot) => void): void;
  onError(cb: (message: string) => void): void;
  dispose(): void;
}

class ClientBase implements SimClient {
  protected nextId = 1;
  protected pendingResults = new Map<number, (r: ActionResult) => void>();
  protected pendingSaves = new Map<number, (f: SaveFile) => void>();
  protected terrainCb: ((t: TerrainData) => void) | null = null;
  protected snapshotCb: ((s: Snapshot) => void) | null = null;
  protected errorCb: ((m: string) => void) | null = null;
  protected postFn: (msg: MainToWorker, transfer?: Transferable[]) => void = () => {};

  init(seed: number, save?: SaveFile): void {
    this.postFn({ type: 'init', seed, save });
  }
  send(action: Action): Promise<ActionResult> {
    const id = this.nextId++;
    return new Promise(resolve => {
      this.pendingResults.set(id, resolve);
      this.postFn({ type: 'actions', actions: [{ id, action }] });
    });
  }
  setSpeed(speed: Speed): void {
    this.postFn({ type: 'speed', speed });
  }
  fastForward(ticks: number): void {
    this.postFn({ type: 'fastForward', ticks });
  }
  requestSave(): Promise<SaveFile> {
    const id = this.nextId++;
    return new Promise(resolve => {
      this.pendingSaves.set(id, resolve);
      this.postFn({ type: 'requestSave', id });
    });
  }
  requestSnapshot(): void {
    this.postFn({ type: 'requestSnapshot' });
  }
  recycle(buf: ArrayBuffer): void {
    this.postFn({ type: 'recycle', buf }, [buf]);
  }
  onTerrain(cb: (t: TerrainData) => void): void {
    this.terrainCb = cb;
  }
  onSnapshot(cb: (s: Snapshot) => void): void {
    this.snapshotCb = cb;
  }
  onError(cb: (m: string) => void): void {
    this.errorCb = cb;
  }
  dispose(): void {}

  protected receive(msg: WorkerToMain): void {
    switch (msg.type) {
      case 'terrain':
        this.terrainCb?.({ seed: msg.seed, height: msg.height, sea: msg.sea, water: msg.water, slope: msg.slope });
        return;
      case 'snapshot': {
        for (const r of msg.results) {
          const cb = this.pendingResults.get(r.id);
          if (cb) {
            this.pendingResults.delete(r.id);
            cb(r);
          }
        }
        const snap: Snapshot = {
          tick: msg.tick,
          layers: viewSnapshot(msg.buf),
          dirtyChunks: msg.dirtyChunks,
          changed: msg.changed,
          hud: msg.hud,
          messages: msg.messages,
          buf: msg.buf,
        };
        this.snapshotCb?.(snap);
        return;
      }
      case 'save': {
        const cb = this.pendingSaves.get(msg.id);
        if (cb) {
          this.pendingSaves.delete(msg.id);
          cb(msg.file);
        }
        return;
      }
      case 'error':
        this.errorCb?.(msg.message);
        return;
    }
  }
}

class WorkerClient extends ClientBase {
  private worker: Worker;
  constructor(worker: Worker) {
    super();
    this.worker = worker;
    worker.onmessage = (e: MessageEvent<WorkerToMain>) => this.receive(e.data);
    worker.onerror = e => this.errorCb?.(e.message);
    this.postFn = (msg, transfer) => (transfer ? worker.postMessage(msg, transfer) : worker.postMessage(msg));
  }
  dispose(): void {
    this.worker.terminate();
  }
}

class InlineClient extends ClientBase {
  private timer: ReturnType<typeof setInterval>;
  constructor() {
    super();
    // Same host class as the worker; messages are delivered synchronously.
    let host: import('./sim/host').SimHost | null = null;
    const queue: MainToWorker[] = [];
    import('./sim/host').then(m => {
      host = new m.SimHost(msg => this.receive(msg));
      for (const q of queue) host.handle(q);
      queue.length = 0;
    });
    this.postFn = msg => (host ? host.handle(msg) : queue.push(msg));
    this.timer = setInterval(() => host?.step(performance.now()), 20);
  }
  dispose(): void {
    clearInterval(this.timer);
  }
}

export function createSimClient(): SimClient {
  if (typeof Worker !== 'undefined') {
    try {
      return new WorkerClient(new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }));
    } catch (err) {
      console.warn('City: worker unavailable, simulating inline', err);
    }
  }
  return new InlineClient();
}
