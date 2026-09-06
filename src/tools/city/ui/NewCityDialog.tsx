import { useRef, useState } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { randomSeed } from '../rng';

interface NewCityDialogProps {
  open: boolean;
  hasCity: boolean;
  onStart: (seed: number) => void;
  onClose: () => void;
}

/** Seed prompt for a new map; the same seed always gives the same terrain. Remount (key) to get a fresh seed. */
export function NewCityDialog({ open, hasCity, onStart, onClose }: NewCityDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState(() => String(randomSeed() % 1_000_000));
  useFocusTrap(open, ref);
  if (!open) return null;
  const value = Number.parseInt(seed, 10);
  const valid = Number.isInteger(value) && value >= 0;
  return (
    <div className="city-modal-backdrop" onClick={onClose}>
      <div ref={ref} className="city-panel city-modal" role="dialog" aria-modal="true" aria-labelledby="city-new-title" onClick={e => e.stopPropagation()}>
        <h3 id="city-new-title">New city</h3>
        {hasCity && <p>The current city and its save will be replaced.</p>}
        <label className="city-seed">
          <span>Map seed</span>
          <input type="text" inputMode="numeric" value={seed} onChange={e => setSeed(e.target.value.replace(/[^0-9]/g, ''))} aria-label="Map seed" />
          <button type="button" className="city-btn city-btn-sm" onClick={() => setSeed(String(randomSeed() % 1_000_000))}>
            Random
          </button>
        </label>
        <p className="city-modal-note">The same seed always gives the same terrain, so you can share a map by its number.</p>
        <div className="city-modal-actions">
          <button type="button" className="city-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="city-btn city-btn-primary" disabled={!valid} onClick={() => valid && onStart(value)}>
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
