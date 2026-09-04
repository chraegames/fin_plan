import { useEffect, useRef } from 'react';
import { buildAtlas, TILE, type Atlas } from '../sprites';

let atlasCache: Atlas | null = null;

/** A single sprite from the atlas, drawn crisp at `size` CSS pixels. */
export function Sprite({ name, size = 32 }: { name: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!atlasCache) atlasCache = buildAtlas(2);
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const col = atlasCache.index.get(name);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, el.width, el.height);
    if (col == null) return;
    ctx.drawImage(atlasCache.canvas as CanvasImageSource, col * TILE * 2, 0, TILE * 2, TILE * 2, 0, 0, el.width, el.height);
  }, [name]);
  return <canvas ref={ref} width={64} height={64} style={{ width: size, height: size }} aria-hidden />;
}
