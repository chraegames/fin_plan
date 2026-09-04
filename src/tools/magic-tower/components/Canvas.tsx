import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../game';
import type { Overlay } from '../overlay';
import { drawFloor, tileAt, type Fx } from '../render';
import { buildAtlas, type Atlas } from '../sprites';
import { H, W } from '../types';

interface Props {
  state: GameState;
  route: number[];
  hover: number;
  floats: Fx['floats'];
  overlays: Map<number, Overlay>;
  onHover: (tile: number) => void;
  onTap: (tile: number) => void;
}

let atlasCache: Atlas | null = null;
function atlas(): Atlas {
  if (!atlasCache) atlasCache = buildAtlas(2);
  return atlasCache;
}

export function Canvas({ state, route, hover, floats, overlays, onHover, onTap }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [px, setPx] = useState(0);
  const fx = useMemo<Fx>(() => ({ floats, route, hover, overlays }), [floats, route, hover, overlays]);

  // Track the displayed size so the backing store can match it × DPR.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setPx(Math.round(w * (window.devicePixelRatio || 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !px) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const cell = px / W;
    let raf = 0;
    const loop = () => {
      drawFloor(ctx, atlas(), state, fx, performance.now(), cell);
      if (fx.floats.some(f => performance.now() - f.born < 900)) raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [state, fx, px]);

  return (
    <canvas
      ref={ref}
      className="mt-canvas"
      width={px || W * 32}
      height={px ? Math.round((px * H) / W) : H * 32}
      role="img"
      aria-label={`Floor ${state.tower.floors[state.run.floor - 1].label}`}
      onMouseMove={e => onHover(tileAt(e.currentTarget, e.clientX, e.clientY))}
      onMouseLeave={() => onHover(-1)}
      onClick={e => onTap(tileAt(e.currentTarget, e.clientX, e.clientY))}
    />
  );
}
