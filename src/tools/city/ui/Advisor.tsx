import type { AdvisorMsg } from '../types';
import { CityIcon, type CityIconName } from './icons';

const LOOK: Record<AdvisorMsg['level'], { icon: CityIconName; color: string }> = {
  info: { icon: 'bulb', color: 'var(--cp-sky)' },
  warn: { icon: 'warning', color: 'var(--cp-coin)' },
  bad: { icon: 'siren', color: 'var(--cp-danger)' },
};

export function Advisor({ messages }: { messages: AdvisorMsg[] }) {
  if (!messages.length) return null;
  return (
    <div className="city-advisor" aria-live="polite">
      {messages.map(m => (
        <div key={m.id} className="city-panel city-advice">
          <span className="city-tile" style={{ background: LOOK[m.level].color }}>
            <CityIcon name={LOOK[m.level].icon} size={16} />
          </span>
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  );
}
