import { useEffect, useRef, useState } from 'react';
import { OVERLAYS, type HudStats, type OverlayKind, type Speed } from '../types';
import { formatCount, formatDate, formatMoney } from './format';
import { CityIcon, type CityIconName } from './icons';

interface TopBarProps {
  hud: HudStats | null;
  speed: Speed;
  overlay: OverlayKind;
  onSpeed: (s: Speed) => void;
  onOverlay: (k: OverlayKind) => void;
  onBudget: () => void;
  onNewCity: () => void;
  compact: boolean;
}

const OVERLAY_INFO: Record<OverlayKind, { label: string; color: string }> = {
  none: { label: 'Zones', color: 'var(--cp-r)' },
  power: { label: 'Power', color: 'var(--cp-power)' },
  water: { label: 'Water', color: 'var(--cp-water)' },
  traffic: { label: 'Traffic', color: 'var(--cp-road)' },
  pollution: { label: 'Pollution', color: '#8C7A4B' },
  landValue: { label: 'Land value', color: 'var(--cp-coin)' },
  crime: { label: 'Crime', color: '#3F5FB0' },
  fireRisk: { label: 'Fire risk', color: 'var(--cp-danger)' },
  fireCover: { label: 'Fire cover', color: '#F08A5D' },
  policeCover: { label: 'Police cover', color: '#6C8AE0' },
  education: { label: 'Education', color: 'var(--cp-edu)' },
  health: { label: 'Health', color: 'var(--cp-health)' },
  desirability: { label: 'Desirability', color: 'var(--cp-purple)' },
};

function Stat({ icon, color, label, children, title }: { icon: CityIconName; color: string; label: string; children: React.ReactNode; title?: string }) {
  return (
    <div className="city-stat" title={title}>
      <span className="city-tile" style={{ background: color }}>
        <CityIcon name={icon} size={18} />
      </span>
      <div className="city-stat-text">
        <span className="city-stat-label">{label}</span>
        <span className="city-stat-value">{children}</span>
      </div>
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

export function TopBar({ hud, speed, overlay, onSpeed, onOverlay, onBudget, onNewCity, compact }: TopBarProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!viewOpen) return;
    const on = (e: PointerEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewOpen(false);
    };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, [viewOpen]);
  const d = hud?.demand ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const max3 = (k: number) => Math.max(d[k], d[k + 1], d[k + 2]);
  const speeds: { s: Speed; icon: CityIconName; label: string; extra?: string }[] = [
    { s: 0, icon: 'pause', label: 'Pause (P)' },
    { s: 1, icon: 'play', label: 'Normal speed (1)' },
    { s: 2, icon: 'play', label: 'Fast (2)', extra: '2' },
    { s: 3, icon: 'play', label: 'Fastest (3)', extra: '3' },
  ];
  return (
    <div className="city-panel city-topbar">
      <Stat icon="calendar" color="var(--cp-sky)" label="Date">
        {hud ? formatDate(hud.tick) : '—'}
      </Stat>
      <Stat icon="coins" color="var(--cp-coin)" label="Treasury" title={hud ? `Last month ${formatMoney(hud.lastMonthNet)}` : ''}>
        <span className={hud && hud.funds < 0 ? 'city-neg' : ''}>{hud ? formatMoney(hud.funds) : '—'}</span>
        {hud && !compact && (
          <small className={hud.lastMonthNet < 0 ? 'city-neg' : 'city-pos'}>
            {hud.lastMonthNet >= 0 ? '+' : ''}
            {formatMoney(hud.lastMonthNet)}
          </small>
        )}
      </Stat>
      <Stat icon="people" color="var(--cp-r)" label="Population">
        {hud ? formatCount(hud.totals.population) : '—'}
      </Stat>
      {!compact && (
        <Stat icon="jobs" color="var(--cp-c)" label="Jobs" title="filled / available">
          {hud ? `${formatCount(hud.totals.jobsFilled)} / ${formatCount(hud.totals.jobs)}` : '—'}
        </Stat>
      )}
      <div className="city-demands" aria-label="RCI demand" title="Demand for residential, commercial and industrial space">
        <DemandBar label="R" value={max3(0)} color="var(--cp-r)" />
        <DemandBar label="C" value={max3(3)} color="var(--cp-c)" />
        <DemandBar label="I" value={max3(6)} color="var(--cp-i)" />
      </div>
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
            {!compact && OVERLAY_INFO[overlay].label}
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
        <button type="button" className="city-btn" onClick={onBudget} title="Budget, taxes and funding">
          <CityIcon name="budget" size={16} />
          {!compact && 'Budget'}
        </button>
        <button type="button" className="city-btn city-btn-icon" onClick={onNewCity} title="New city" aria-label="New city">
          <CityIcon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}
