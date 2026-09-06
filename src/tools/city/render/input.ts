// Pointer / wheel / keyboard / touch handling for the viewport. Owns no game
// state: it asks `handlers.getMode()` what a left-drag means and reports
// tiles back. Camera moves go straight to the renderer's rig.

import type { XY } from '../types';
import type { CityRenderer } from './renderer';

export type DragMode = 'pan' | 'point' | 'rect' | 'line';

export interface InputHandlers {
  getMode(): DragMode;
  /** Touch: one-finger drags apply the tool instead of panning. */
  getPaint(): boolean;
  onHover(tile: XY | null): void;
  onTap(tile: XY): void;
  onDragPreview(from: XY, to: XY): void;
  onDragEnd(from: XY, to: XY): void;
  onDragCancel(): void;
}

interface PointerState {
  id: number;
  x: number;
  y: number;
  button: number;
  pointerType: string;
}

export class InputController {
  private pointers = new Map<number, PointerState>();
  private drag: { from: XY; to: XY } | null = null;
  private camDrag: 'orbit' | 'pan' | null = null;
  private lastX = 0;
  private lastY = 0;
  private pinchDist = 0;
  private pinchAngle = 0;
  private keys = new Set<string>();
  private spaceHeld = false;
  private lastHover: XY | null = null;
  private readonly off: (() => void)[] = [];

  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: CityRenderer;
  private readonly handlers: InputHandlers;

  constructor(canvas: HTMLCanvasElement, renderer: CityRenderer, handlers: InputHandlers) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.handlers = handlers;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on(canvas, 'pointerdown', (e: PointerEvent) => this.down(e));
    on(canvas, 'pointermove', (e: PointerEvent) => this.move(e));
    on(canvas, 'pointerup', (e: PointerEvent) => this.up(e));
    on(canvas, 'pointercancel', (e: PointerEvent) => this.up(e, true));
    on(canvas, 'pointerleave', () => this.leave());
    on(canvas, 'wheel', (e: WheelEvent) => this.wheel(e), { passive: false });
    on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
    on(window, 'keydown', (e: KeyboardEvent) => this.key(e, true));
    on(window, 'keyup', (e: KeyboardEvent) => this.key(e, false));
    on(window, 'blur', () => {
      this.keys.clear();
      this.spaceHeld = false;
    });
    canvas.style.touchAction = 'none';
  }

  dispose(): void {
    for (const f of this.off) f();
    this.off.length = 0;
  }

  private pick(e: { clientX: number; clientY: number }): XY | null {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    return this.renderer.pick(nx, ny);
  }

  private ground(e: { clientX: number; clientY: number }): { x: number; z: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    return this.renderer.ground(nx, ny);
  }

  private down(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY, button: e.button, pointerType: e.pointerType });
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (this.pointers.size === 2) {
      // second finger: cancel any tool drag, start pinch
      this.cancelDrag();
      this.camDrag = null;
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchAngle = Math.atan2(a.y - b.y, a.x - b.x);
      return;
    }
    if (this.pointers.size > 2) return;
    const touch = e.pointerType === 'touch';
    const mode = this.handlers.getMode();
    const wantsTool = touch ? this.handlers.getPaint() && mode !== 'pan' : e.button === 0 && !e.shiftKey && !this.spaceHeld && mode !== 'pan';
    if (wantsTool) {
      const t = this.pick(e);
      if (!t) return;
      this.drag = { from: t, to: t };
      this.handlers.onDragPreview(t, t);
      return;
    }
    if (e.button === 2) this.camDrag = 'orbit';
    else this.camDrag = 'pan';
  }

  private move(e: PointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (p) {
      p.x = e.clientX;
      p.y = e.clientY;
    }
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(a.y - b.y, a.x - b.x);
      if (this.pinchDist > 0) {
        this.renderer.rig.zoom(this.pinchDist / d, this.ground({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
        this.renderer.rig.orbit(ang - this.pinchAngle, 0);
      }
      this.pinchDist = d;
      this.pinchAngle = ang;
      // pan with the midpoint
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (p) {
        this.renderer.rig.pan(-(mx - this.lastX) * 0.5, (my - this.lastY) * 0.5);
      }
      this.lastX = mx;
      this.lastY = my;
      return;
    }
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (this.drag) {
      const t = this.pick(e);
      if (t && (t.x !== this.drag.to.x || t.y !== this.drag.to.y)) {
        this.drag.to = t;
        this.handlers.onDragPreview(this.drag.from, t);
      }
      return;
    }
    if (this.camDrag === 'orbit') {
      this.renderer.rig.orbit(-dx * 0.006, dy * 0.005);
      return;
    }
    if (this.camDrag === 'pan') {
      // grab: the ground under the cursor follows the pointer
      this.renderer.rig.pan(-dx, dy);
      return;
    }
    const t = this.pick(e);
    if (!t || !this.lastHover || t.x !== this.lastHover.x || t.y !== this.lastHover.y) {
      this.lastHover = t;
      this.handlers.onHover(t);
    }
  }

  private up(e: PointerEvent, cancel = false): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 1) {
      const [a] = [...this.pointers.values()];
      this.lastX = a.x;
      this.lastY = a.y;
      this.pinchDist = 0;
      return;
    }
    if (this.pointers.size > 0) return;
    if (this.drag) {
      const d = this.drag;
      this.drag = null;
      if (cancel) this.handlers.onDragCancel();
      else if (d.from.x === d.to.x && d.from.y === d.to.y) this.handlers.onTap(d.from);
      else this.handlers.onDragEnd(d.from, d.to);
    } else if (this.camDrag === null && !cancel && e.pointerType === 'touch') {
      // touch tap without paint mode still selects / inspects
      const t = this.pick(e);
      if (t) this.handlers.onTap(t);
    }
    this.camDrag = null;
  }

  private leave(): void {
    if (this.lastHover) {
      this.lastHover = null;
      this.handlers.onHover(null);
    }
  }

  private cancelDrag(): void {
    if (this.drag) {
      this.drag = null;
      this.handlers.onDragCancel();
    }
  }

  private wheel(e: WheelEvent): void {
    e.preventDefault();
    const f = Math.exp(Math.min(80, Math.max(-80, e.deltaY)) * 0.0022);
    this.renderer.rig.zoom(f, this.ground(e));
  }

  private key(e: KeyboardEvent, downState: boolean): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
    if (e.code === 'Space') {
      this.spaceHeld = downState;
      return;
    }
    if (downState && e.key === 'Escape') this.cancelDrag();
    const nav = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'];
    if (!nav.includes(e.code)) return;
    if (downState) this.keys.add(e.code);
    else this.keys.delete(e.code);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  }

  /** Apply held keys; call once per frame. */
  update(dt: number): void {
    if (this.keys.size === 0) return;
    const k = this.keys;
    const v = 600 * dt;
    let dx = 0;
    let dz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) dz += v;
    if (k.has('KeyS') || k.has('ArrowDown')) dz -= v;
    if (k.has('KeyA') || k.has('ArrowLeft')) dx -= v;
    if (k.has('KeyD') || k.has('ArrowRight')) dx += v;
    if (dx || dz) this.renderer.rig.pan(dx, dz);
    if (k.has('KeyQ')) this.renderer.rig.orbit(1.6 * dt, 0);
    if (k.has('KeyE')) this.renderer.rig.orbit(-1.6 * dt, 0);
    if (k.has('Equal') || k.has('NumpadAdd')) this.renderer.rig.zoom(Math.exp(-1.6 * dt));
    if (k.has('Minus') || k.has('NumpadSubtract')) this.renderer.rig.zoom(Math.exp(1.6 * dt));
  }
}
