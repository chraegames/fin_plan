import { useEffect, useMemo, useRef } from 'react';
import type { GameState } from '../game';
import { CELL, drawFloor, tileAt, type Fx } from '../render';
import { buildAtlas, type Atlas } from '../sprites';
import { H, W } from '../types';

interface Props {
  state: GameState;
  route: number[];
  hover: number;
  floats: Fx['floats'];
  onHover: (tile: number) => void;
  onTap: (tile: number) => void;
}

let atlasCache: Atlas | null = null;
function atlas(): Atlas {
  if (!atlasCache) atlasCache = buildAtlas(2);
  return atlasCache;
}

export function Canvas({ state, route, hover, floats, onHover, onTap }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fx = useMemo<Fx>(() => ({ floats, route, hover, hollow: { up: false, down: false } }), [floats, route, hover]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const loop = () => {
      drawFloor(ctx, atlas(), state, fx, performance.now());
      const live = fx.floats.some(f => performance.now() - f.born < 900);
      if (live) raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [state, fx]);

  return (
    <canvas
      ref={ref}
      className="mt-canvas"
      width={W * CELL}
      height={H * CELL}
      role="img"
      aria-label={`Floor ${state.tower.floors[state.run.floor - 1].label}`}
      onMouseMove={e => onHover(tileAt(e.currentTarget, e.clientX, e.clientY))}
      onMouseLeave={() => onHover(-1)}
      onClick={e => onTap(tileAt(e.currentTarget, e.clientX, e.clientY))}
    />
  );
}
