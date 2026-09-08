import type { AdvisorMsg, OverlayKind } from '../types';
import { CityIcon, type CityIconName } from './icons';

const LOOK: Record<AdvisorMsg['level'], { icon: CityIconName; color: string }> = {
  info: { icon: 'bulb', color: 'var(--cp-sky)' },
  warn: { icon: 'warning', color: 'var(--cp-coin)' },
  bad: { icon: 'siren', color: 'var(--cp-danger)' },
};

export function Advisor({ messages, onOverlay }: { messages: AdvisorMsg[]; onOverlay: (k: OverlayKind) => void }) {
  if (!messages.length) return null;
  return (
    <div className="city-advisor" aria-live="polite">
      {messages.map(m => (
        <div key={m.id} className="city-panel city-advice">
          <span className="city-tile" style={{ background: LOOK[m.level].color }}>
            <CityIcon name={LOOK[m.level].icon} size={16} />
          </span>
          <span className="city-advice-text">{m.text}</span>
          {m.overlay && (
            <button type="button" className="city-btn city-btn-sm city-btn-icon city-advice-show" onClick={() => onOverlay(m.overlay!)} title="Show on the map" aria-label="Show on the map">
              <CityIcon name="eye" size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
