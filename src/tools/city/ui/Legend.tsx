import type { OverlayKind } from '../types';
import { CityIcon } from './icons';
import { OVERLAY_INFO } from './overlayInfo';

interface LegendProps {
  overlay: OverlayKind;
  onClose: () => void;
}

/** What the active data view means, with its colour scale. */
export function Legend({ overlay, onClose }: LegendProps) {
  if (overlay === 'none') return null;
  const info = OVERLAY_INFO[overlay];
  const binary = !info.scale;
  const heat = overlay === 'pollution' || overlay === 'crime' || overlay === 'fireRisk' || overlay === 'traffic';
  return (
    <div className="city-panel city-legend" role="note" aria-label={`${info.label} legend`}>
      <div className="city-legend-head">
        <span className="city-view-dot" style={{ background: info.color }} />
        <b>{info.label}</b>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Back to the zone view" title="Back to the zone view">
          <CityIcon name="close" size={12} />
        </button>
      </div>
      {binary ? (
        <div className="city-legend-binary">
          <span>
            <i style={{ background: 'rgb(60,200,120)' }} /> served
          </span>
          <span>
            <i style={{ background: 'rgb(230,40,40)' }} /> not served
          </span>
        </div>
      ) : (
        <div className="city-legend-scale">
          <small>{info.scale![0]}</small>
          <span className={`city-legend-ramp${heat ? ' city-legend-heat' : ''}`} />
          <small>{info.scale![1]}</small>
        </div>
      )}
      <p>{info.hint}</p>
    </div>
  );
}
