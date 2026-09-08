import type { HudStats } from '../types';
import { CityIcon } from './icons';
import { onboardingSteps } from './onboardingSteps';

interface OnboardingProps {
  hud: HudStats;
  onClose: () => void;
}

export function Onboarding({ hud, onClose }: OnboardingProps) {
  const steps = onboardingSteps(hud);
  const done = steps.filter(s => s.done).length;
  return (
    <div className="city-panel city-onboarding" role="region" aria-label="Getting started">
      <div className="city-onboarding-head">
        <span className="city-tile" style={{ background: 'var(--cp-good)' }}>
          <CityIcon name="bulb" size={14} />
        </span>
        <b>Getting started</b>
        <small>
          {done} / {steps.length}
        </small>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Hide the checklist" title="Hide">
          <CityIcon name="close" size={12} />
        </button>
      </div>
      <ol>
        {steps.map(s => (
          <li key={s.key} className={s.done ? 'city-done' : ''}>
            <span className="city-check">{s.done && <CityIcon name="check" size={11} />}</span>
            {s.text}
          </li>
        ))}
      </ol>
      <p>Buildings only grow where a lot has road access, power and demand. Click any tile with the inspect tool to see what it is missing.</p>
    </div>
  );
}
