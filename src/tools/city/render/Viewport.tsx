// The 3D canvas. Lazily imports the three.js renderer, wires input, resize
// and the frame loop, and hands the renderer back to App through a ref.

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { InputHandlers } from './input';
import type { CityRenderer, TerrainData } from './renderer';

interface ViewportProps {
  terrain: TerrainData | null;
  rendererRef: RefObject<CityRenderer | null>;
  handlersRef: RefObject<InputHandlers>;
  panCursor: boolean;
}

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function Viewport({ terrain, rendererRef, handlersRef, panCursor }: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!terrain || !canvas) return;
    let renderer: CityRenderer | null = null;
    let input: { dispose(): void; update(dt: number): void } | null = null;
    let raf = 0;
    let alive = true;
    let last = 0;

    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!renderer) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      input?.update(dt);
      renderer.frame(now);
    };

    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r && renderer) renderer.resize(r.width, r.height);
    });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') cancelAnimationFrame(raf);
      else {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    const themeObs = new MutationObserver(() => renderer?.setTheme(currentTheme()));

    import('./renderer')
      .then(mod => import('./input').then(inputMod => ({ mod, inputMod })))
      .then(({ mod, inputMod }) => {
        if (!alive) return;
        try {
          renderer = new mod.CityRenderer(canvas, terrain);
        } catch (err) {
          console.warn('City: WebGL unavailable', err);
          setStatus('failed');
          return;
        }
        renderer.setTheme(currentTheme());
        rendererRef.current = renderer;
        const proxy: InputHandlers = {
          getMode: () => handlersRef.current.getMode(),
          getPaint: () => handlersRef.current.getPaint(),
          onHover: t => handlersRef.current.onHover(t),
          onTap: t => handlersRef.current.onTap(t),
          onDragPreview: (a, b) => handlersRef.current.onDragPreview(a, b),
          onDragEnd: (a, b) => handlersRef.current.onDragEnd(a, b),
          onDragCancel: () => handlersRef.current.onDragCancel(),
        };
        input = new inputMod.InputController(canvas, renderer, proxy);
        const parent = canvas.parentElement!;
        renderer.resize(parent.clientWidth, parent.clientHeight);
        ro.observe(parent);
        themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        document.addEventListener('visibilitychange', onVisibility);
        raf = requestAnimationFrame(loop);
        setStatus('ready');
      })
      .catch(err => {
        console.warn('City: renderer failed to load', err);
        if (alive) setStatus('failed');
      });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObs.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      input?.dispose();
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, [terrain, rendererRef, handlersRef]);

  return (
    <div className={`city-viewport${panCursor ? ' city-pan' : ''}`}>
      <canvas ref={canvasRef} tabIndex={0} aria-label="City map" />
      {status !== 'ready' && (
        <div className="city-loading">
          {status === 'failed' ? 'This device cannot run WebGL, which the city needs.' : terrain ? 'Loading 3D…' : 'Generating terrain…'}
        </div>
      )}
    </div>
  );
}
