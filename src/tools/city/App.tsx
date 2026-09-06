import { useEffect, useRef, useState } from 'react';
import { ToolShell } from '../../components/layout/ToolShell';
import { byPath } from '../../site/manifest';
import type { InputHandlers } from './render/input';
import type { CityRenderer, TerrainData } from './render/renderer';
import { Viewport } from './render/Viewport';
import { generateTerrain } from './sim/terrain';
import { CITY_STYLES } from './ui/styles';
import type { XY } from './types';

const entry = byPath('/city/')!;

export default function App() {
  const [terrain] = useState<TerrainData>(() => {
    const t = generateTerrain(1);
    return { seed: 1, height: t.height, sea: t.sea, water: t.water };
  });
  const [hover, setHover] = useState<XY | null>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const handlersRef = useRef<InputHandlers>({
    getMode: () => 'pan',
    getPaint: () => false,
    onHover: () => {},
    onTap: () => {},
    onDragPreview: () => {},
    onDragEnd: () => {},
    onDragCancel: () => {},
  });

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = CITY_STYLES;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    handlersRef.current = {
      getMode: () => 'pan',
      getPaint: () => false,
      onHover: t => {
        setHover(t);
        rendererRef.current?.setCursor(t ? { x0: t.x, y0: t.y, x1: t.x, y1: t.y } : null);
      },
      onTap: () => {},
      onDragPreview: () => {},
      onDragEnd: () => {},
      onDragCancel: () => {},
    };
  }, []);

  return (
    <ToolShell entry={entry} layout="full">
      <div className="city-root">
        <div className="city-hud">
          <div className="city-panel city-topbar">
            <div className="city-stat">
              <span>Tile</span>
              <span>{hover ? `${hover.x}, ${hover.y}` : '—'}</span>
            </div>
          </div>
        </div>
        <Viewport terrain={terrain} rendererRef={rendererRef} handlersRef={handlersRef} panCursor />
        <div className="city-hint">Drag to pan · right-drag to orbit · wheel to zoom · WASD / Q E</div>
      </div>
    </ToolShell>
  );
}
