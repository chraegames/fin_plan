// Orbit camera rig: a target on the ground, yaw/pitch/distance, damped.
// Pure state + math; renderer.ts copies the result into a THREE camera.

import { N } from '../types';

const PITCH_MIN = 0.32;
const PITCH_MAX = 1.45;
const DIST_MIN = 5;
const DIST_MAX = 260;
const DAMP = 14; // per second

export interface CameraPose {
  tx: number;
  tz: number;
  yaw: number;
  pitch: number;
  dist: number;
}

export class CameraRig {
  // current (damped) and goal
  readonly cur: CameraPose = { tx: N / 2, tz: N / 2, yaw: 0.6, pitch: 0.8, dist: 90 };
  readonly goal: CameraPose = { tx: N / 2, tz: N / 2, yaw: 0.6, pitch: 0.8, dist: 90 };

  setPose(p: Partial<CameraPose>, snap = false): void {
    Object.assign(this.goal, p);
    this.clampGoal();
    if (snap) Object.assign(this.cur, this.goal);
  }

  private clampGoal(): void {
    const g = this.goal;
    g.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, g.pitch));
    g.dist = Math.min(DIST_MAX, Math.max(DIST_MIN, g.dist));
    g.tx = Math.min(N + 8, Math.max(-8, g.tx));
    g.tz = Math.min(N + 8, Math.max(-8, g.tz));
  }

  /** Pan in screen-relative directions (dx right, dz forward), scaled by distance. */
  pan(dx: number, dz: number): void {
    const g = this.goal;
    const s = g.dist * 0.0018;
    const sy = Math.sin(g.yaw);
    const cy = Math.cos(g.yaw);
    // screen right = (cos yaw, 0, -sin yaw); screen forward = (-sin yaw, 0, -cos yaw)
    g.tx += (dx * cy - dz * sy) * s;
    g.tz += (-dx * sy - dz * cy) * s;
    this.clampGoal();
  }

  orbit(dyaw: number, dpitch: number): void {
    this.goal.yaw += dyaw;
    this.goal.pitch += dpitch;
    this.clampGoal();
  }

  /** Zoom by a factor; `toward` (ground point) keeps the point under the cursor fixed. */
  zoom(factor: number, toward?: { x: number; z: number } | null): void {
    const g = this.goal;
    const before = g.dist;
    g.dist = Math.min(DIST_MAX, Math.max(DIST_MIN, g.dist * factor));
    if (toward) {
      const f = 1 - g.dist / before;
      g.tx += (toward.x - g.tx) * f;
      g.tz += (toward.z - g.tz) * f;
    }
    this.clampGoal();
  }

  /** Advance the damping; returns true while still moving. */
  update(dt: number): boolean {
    const k = 1 - Math.exp(-DAMP * dt);
    const c = this.cur;
    const g = this.goal;
    let moving = false;
    const keys: (keyof CameraPose)[] = ['tx', 'tz', 'yaw', 'pitch', 'dist'];
    for (const key of keys) {
      const d = g[key] - c[key];
      if (Math.abs(d) < (key === 'dist' ? 1e-3 : 1e-4)) {
        c[key] = g[key];
        continue;
      }
      c[key] += d * k;
      moving = true;
    }
    return moving;
  }

  /** Eye position for the current pose, given the ground height at the target. */
  eye(targetY: number): { x: number; y: number; z: number } {
    const c = this.cur;
    const cp = Math.cos(c.pitch);
    return {
      x: c.tx + c.dist * cp * Math.sin(c.yaw),
      y: targetY + c.dist * Math.sin(c.pitch),
      z: c.tz + c.dist * cp * Math.cos(c.yaw),
    };
  }
}
