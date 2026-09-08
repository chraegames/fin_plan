import { useEffect, useRef, useState } from 'react';
import { MILESTONES } from '../sim/milestones';
import { OVERLAYS, type HudStats, type OverlayKind, type Speed } from '../types';
import { formatCount, formatDate, formatMoney } from './format';
import { CityIcon, type CityIconName } from './icons';
import { OVERLAY_INFO } from './overlayInfo';

export interface ViewPrefs {
  dayCycle: boolean;
  markers: boolean;
}

interface TopBarProps {
  hud: HudStats | null;
  speed: Speed;
  overlay: OverlayKind;
  prefs: ViewPrefs;
  onSpeed: (s: Speed) => void;
  onOverlay: (k: OverlayKind) => void;
  onPrefs: (p: ViewPrefs) => void;
  onBudget: () => void;
  onStats: () => void;
  onMilestones: () => void;
  onNewCity: () => void;
  compact: boolean;
}


function Stat({ icon, color, label, children, title, onClick }: { icon: CityIconName; color: string; label: string; children: React.ReactNode; title?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="city-tile" style={{ background: color }}>
        <CityIcon name={icon} size={18} />
      </span>
      <div className="city-stat-text">
        <span className="city-stat-label">{label}</span>
        <span className="city-stat-value">{children}</span>
      </div>
    </>
  );
  if (onClick)
    return (
      <button type="button" className="city-stat city-stat-btn" title={title} onClick={onClick}>
        {inner}
      </button>
    );
  return (
    <div className="city-stat" title={title}>
      {inner}
    </div>
  );
}

function DemandBar({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.max(-100, Math.min(100, value));
  return (
    <div className="city-demand" title={`${label} demand ${Math.round(v)}`}>
      <span className="city-demand-track">
        <span className="city-demand-fill" style={{ background: v < 0 ? 'var(--cp-danger)' : color, height: `${Math.abs(v) / 2}%`, [v < 0 ? 'top' : 'bottom']: '50%' }} />
      </span>
      <span className="city-demand-label">{label}</span>
    </div>
  );
}

/** Supply vs demand chip: green when comfortable, amber when tight, red when short. */
function UtilityChip({ icon, label, supply, demand, short }: { icon: CityIconName; label: string; supply: number; demand: number; short: boolean }) {
  const ratio = demand > 0 ? supply / demand : 1;
  const state = short || (demand > 0 && ratio < 1) ? 'bad' : ratio < 1.15 ? 'warn' : 'ok';
  return (
    <span className={`city-chip city-chip-${state}`} title={`${label}: ${formatCount(demand)} used of ${formatCount(supply)}`}>
      <CityIcon name={icon} size={13} />
      <b>{demand > 0 ? `${Math.min(999, Math.round(ratio * 100))}%` : '—'}</b>
    </span>
  );
}

function useOutside(open: boolean, ref: React.RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, [open, ref, close]);
}

export function TopBar({ hud, speed, overlay, prefs, onSpeed, onOverlay, onPrefs, onBudget, onStats, onMilestones, onNewCity, compact }: TopBarProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLDivElement>(null);
  useOutside(viewOpen, viewRef, () => setViewOpen(false));
  useOutside(gearOpen, gearRef, () => setGearOpen(false));
  const d = hud?.demand ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const max3 = (k: number) => Math.max(d[k], d[k + 1], d[k + 2]);
  const speeds: { s: Speed; icon: CityIconName; label: string; extra?: string }[] = [
    { s: 0, icon: 'pause', label: 'Pause (P)' },
    { s: 1, icon: 'play', label: 'Normal speed (1)' },
    { s: 2, icon: 'play', label: 'Fast (2)', extra: '2' },
    { s: 3, icon: 'play', label: 'Fastest (3)', extra: '3' },
  ];
  const t = hud?.totals;
  const tier = MILESTONES[hud?.milestone ?? 0];
  const next = MILESTONES[(hud?.milestone ?? 0) + 1];
  const progress = next && hud ? Math.min(1, Math.max(0, (hud.totals.population - tier.pop) / (next.pop - tier.pop))) : 1;
  return (
    <div className="city-panel city-topbar">
      <Stat icon="calendar" color="var(--cp-sky)" label="Date">
        {hud ? formatDate(hud.tick) : '—'}
      </Stat>
      <Stat icon="coins" color="var(--cp-coin)" label="Treasury" title={hud ? `Last month ${formatMoney(hud.lastMonthNet)} · open the budget` : ''} onClick={onBudget}>
        <span className={hud && hud.funds < 0 ? 'city-neg' : ''}>{hud ? formatMoney(hud.funds) : '—'}</span>
        {hud && !compact && (
          <small className={hud.lastMonthNet < 0 ? 'city-neg' : 'city-pos'}>
            {hud.lastMonthNet >= 0 ? '+' : ''}
            {formatMoney(hud.lastMonthNet)}
          </small>
        )}
      </Stat>
      <Stat icon="people" color="var(--cp-r)" label="Population" title="City statistics" onClick={onStats}>
        {hud ? formatCount(hud.totals.population) : '—'}
      </Stat>
      {!compact && (
        <div className="city-hide-md">
          <Stat icon="jobs" color="var(--cp-c)" label="Jobs" title="filled / available">
            {hud ? `${formatCount(hud.totals.jobsFilled)} / ${formatCount(hud.totals.jobs)}` : '—'}
          </Stat>
        </div>
      )}
      <div className="city-demands" aria-label="RCI demand" title="Demand for residential, commercial and industrial space">
        <DemandBar label="R" value={max3(0)} color="var(--cp-r)" />
        <DemandBar label="C" value={max3(3)} color="var(--cp-c)" />
        <DemandBar label="I" value={max3(6)} color="var(--cp-i)" />
      </div>
      {t && (
        <div className="city-chips" aria-label="Utilities">
          <UtilityChip icon="pylon" label="Power" supply={t.powerSupply} demand={t.powerDemand} short={!!hud?.brownout} />
          <UtilityChip icon="pump" label="Water" supply={t.waterSupply} demand={t.waterDemand} short={!!hud?.waterShort} />
          <UtilityChip icon="bin" label="Garbage" supply={t.garbageSupply} demand={t.garbageDemand} short={!!hud?.garbageShort} />
        </div>
      )}
      <button type="button" className="city-milestone" onClick={onMilestones} title={next ? `${tier.name} · next: ${next.name} at ${next.pop.toLocaleString('en-US')} residents` : tier.name}>
        <span className="city-tile" style={{ background: 'var(--cp-purple)' }}>
          <CityIcon name="flag" size={16} />
        </span>
        {!compact && (
          <span className="city-milestone-text">
            <b>{tier.name}</b>
            <span className="city-milestone-bar">
              <i style={{ width: `${progress * 100}%` }} />
            </span>
            <small>{next ? `${formatCount(next.pop)} for ${next.name}` : 'top tier'}</small>
          </span>
        )}
      </button>
      <div className="city-speed" role="radiogroup" aria-label="Speed">
        {speeds.map(({ s, icon, label, extra }) => (
          <button key={s} type="button" role="radio" aria-checked={speed === s} className={`city-btn${speed === s ? (s === 0 ? ' city-on-pause' : ' city-on') : ''}`} onClick={() => onSpeed(s)} title={label} aria-label={label}>
            <CityIcon name={icon} size={16} />
            {extra && <b style={{ fontSize: 11, marginLeft: -4 }}>{extra}</b>}
          </button>
        ))}
      </div>
      <div className="city-actions">
        <div className="city-view" ref={viewRef}>
          <button type="button" className={`city-btn${viewOpen ? ' city-pressed' : ''}`} onClick={() => setViewOpen(o => !o)} aria-haspopup="menu" aria-expanded={viewOpen} title="Data view">
            <span className="city-view-dot" style={{ background: OVERLAY_INFO[overlay].color }} />
            {!compact && <span className={overlay === 'none' ? 'city-hide-md' : ''}>{OVERLAY_INFO[overlay].label}</span>}
            <CityIcon name="layers" size={16} />
          </button>
          {viewOpen && (
            <div className="city-panel city-view-menu" role="menu" aria-label="Data view">
              {OVERLAYS.map(k => (
                <button
                  key={k}
                  type="button"
                  role="menuitemradio"
                  aria-checked={overlay === k}
                  className={`city-view-item${overlay === k ? ' city-on' : ''}`}
                  onClick={() => {
                    onOverlay(k);
                    setViewOpen(false);
                  }}
                >
                  <span className="city-view-dot" style={{ background: OVERLAY_INFO[k].color }} />
                  {OVERLAY_INFO[k].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="city-btn" onClick={onBudget} title="Budget, taxes, funding and policies">
          <CityIcon name="budget" size={16} />
          {!compact && <span className="city-hide-md">Budget</span>}
        </button>
        <div className="city-view" ref={gearRef}>
          <button type="button" className={`city-btn city-btn-icon${gearOpen ? ' city-pressed' : ''}`} onClick={() => setGearOpen(o => !o)} aria-haspopup="menu" aria-expanded={gearOpen} title="View settings" aria-label="View settings">
            <CityIcon name="gear" size={16} />
          </button>
          {gearOpen && (
            <div className="city-panel city-view-menu city-gear-menu" role="menu" aria-label="View settings">
              <button type="button" role="menuitemcheckbox" aria-checked={prefs.dayCycle} className={`city-view-item${prefs.dayCycle ? ' city-on' : ''}`} onClick={() => onPrefs({ ...prefs, dayCycle: !prefs.dayCycle })}>
                <CityIcon name={prefs.dayCycle ? 'moon' : 'sun'} size={14} /> Day / night cycle
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={prefs.markers} className={`city-view-item${prefs.markers ? ' city-on' : ''}`} onClick={() => onPrefs({ ...prefs, markers: !prefs.markers })}>
                <CityIcon name="warning" size={14} /> Problem icons
              </button>
              <button type="button" role="menuitem" className="city-view-item" onClick={() => { setGearOpen(false); onNewCity(); }}>
                <CityIcon name="plus" size={14} /> New city…
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
