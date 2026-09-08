import { plopDef } from '../constants';
import { MILESTONES } from '../sim/milestones';
import type { HudStats } from '../types';
import { formatCount, formatMoney } from './format';
import { CityIcon } from './icons';
import { PLOP_COLOR, PLOP_ICON } from './toolbarData';

interface MilestonePanelProps {
  hud: HudStats | null;
  onClose: () => void;
}

/** The progression ladder: every tier, what it unlocks and how far the city is. */
export function MilestonePanel({ hud, onClose }: MilestonePanelProps) {
  const reached = hud?.milestone ?? 0;
  const pop = hud?.totals.population ?? 0;
  return (
    <div className="city-panel city-sheet city-milestones" role="dialog" aria-label="Milestones">
      <div className="city-panel-head">
        <span>
          <CityIcon name="flag" size={16} style={{ verticalAlign: -3, marginRight: 8 }} />
          Milestones
        </span>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Close milestones">
          <CityIcon name="close" size={14} />
        </button>
      </div>
      <p className="city-sheet-intro">Grow the population to climb the ladder. Each tier pays a grant and unlocks new buildings; nothing is ever taken away.</p>
      <ol className="city-ladder">
        {MILESTONES.map((m, k) => {
          const done = k <= reached;
          const current = k === reached;
          const next = k === reached + 1;
          const prog = next ? Math.min(1, Math.max(0, (pop - MILESTONES[reached].pop) / (m.pop - MILESTONES[reached].pop))) : done ? 1 : 0;
          return (
            <li key={m.name} className={`city-ladder-row${done ? ' city-done' : ''}${current ? ' city-current' : ''}${next ? ' city-next' : ''}`}>
              <span className="city-ladder-mark">
                <CityIcon name={done ? 'check' : next ? 'target' : 'lock'} size={14} />
              </span>
              <div className="city-ladder-body">
                <div className="city-ladder-title">
                  <b>{m.name}</b>
                  <span>{m.pop ? `${formatCount(m.pop)} residents` : 'start'}</span>
                  {m.reward > 0 && <em>+{formatMoney(m.reward)}</em>}
                </div>
                {next && (
                  <span className="city-milestone-bar city-ladder-bar">
                    <i style={{ width: `${prog * 100}%` }} />
                  </span>
                )}
                {(m.unlocks.length > 0 || m.features.length > 0) && (
                  <div className="city-ladder-unlocks">
                    {m.unlocks.map(p => {
                      const d = plopDef(p);
                      if (!d) return null;
                      return (
                        <span key={p} className="city-unlock" title={d.desc}>
                          <span className="city-tile" style={{ background: PLOP_COLOR[p] }}>
                            <CityIcon name={PLOP_ICON[p] ?? 'house'} size={12} />
                          </span>
                          {d.name}
                        </span>
                      );
                    })}
                    {m.features.map(f => (
                      <span key={f} className="city-unlock city-unlock-feature">
                        <CityIcon name="policy" size={12} /> {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
