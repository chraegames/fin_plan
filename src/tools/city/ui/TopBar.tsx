import { OVERLAYS, type HudStats, type OverlayKind, type Speed } from '../types';
import { formatCount, formatDate, formatMoney } from './format';

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

const OVERLAY_LABELS: Record<OverlayKind, string> = {
  none: 'Zones',
  power: 'Power',
  water: 'Water',
  traffic: 'Traffic',
  pollution: 'Pollution',
  landValue: 'Land value',
  crime: 'Crime',
  fireRisk: 'Fire risk',
  fireCover: 'Fire cover',
  policeCover: 'Police',
  education: 'Education',
  health: 'Health',
  desirability: 'Desirability',
};

function DemandBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(-100, Math.min(100, value));
  return (
    <div className="city-demand" title={`${label} demand ${Math.round(v)}`}>
      <span className="city-demand-label">{label}</span>
      <span className="city-demand-track">
        <span className={`city-demand-fill${v < 0 ? ' city-demand-neg' : ''}`} style={{ width: `${Math.abs(v) / 2}%`, [v < 0 ? 'right' : 'left']: '50%' }} />
      </span>
    </div>
  );
}

export function TopBar({ hud, speed, overlay, onSpeed, onOverlay, onBudget, onNewCity, compact }: TopBarProps) {
  const d = hud?.demand ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const max3 = (k: number) => Math.max(d[k], d[k + 1], d[k + 2]);
  return (
    <div className="city-panel city-topbar">
      <div className="city-stat">
        <span>Date</span>
        <span>{hud ? formatDate(hud.tick) : '—'}</span>
      </div>
      <div className="city-stat">
        <span>Funds</span>
        <span className={hud && hud.funds < 0 ? 'city-neg' : ''} title={hud ? `Last month ${formatMoney(hud.lastMonthNet)}` : ''}>
          {hud ? formatMoney(hud.funds) : '—'}
          {hud && !compact && <small className={hud.lastMonthNet < 0 ? 'city-neg' : 'city-pos'}> {hud.lastMonthNet >= 0 ? '+' : ''}{formatMoney(hud.lastMonthNet)}</small>}
        </span>
      </div>
      <div className="city-stat">
        <span>Population</span>
        <span>{hud ? formatCount(hud.totals.population) : '—'}</span>
      </div>
      {!compact && (
        <div className="city-stat">
          <span>Jobs</span>
          <span>{hud ? `${formatCount(hud.totals.jobsFilled)} / ${formatCount(hud.totals.jobs)}` : '—'}</span>
        </div>
      )}
      <div className="city-demands" aria-label="RCI demand">
        <DemandBar label="R" value={max3(0)} />
        <DemandBar label="C" value={max3(3)} />
        <DemandBar label="I" value={max3(6)} />
      </div>
      <div className="city-speed" role="radiogroup" aria-label="Speed">
        {([0, 1, 2, 3] as Speed[]).map(s => (
          <button key={s} type="button" role="radio" aria-checked={speed === s} className={`city-speed-btn${speed === s ? ' city-speed-active' : ''}`} onClick={() => onSpeed(s)} title={s === 0 ? 'Pause' : `Speed ${s}`}>
            {s === 0 ? '❚❚' : '▶'.repeat(s)}
          </button>
        ))}
      </div>
      <label className="city-overlay-select">
        {!compact && <span>View</span>}
        <select value={overlay} onChange={e => onOverlay(e.target.value as OverlayKind)} aria-label="Data view">
          {OVERLAYS.map(k => (
            <option key={k} value={k}>
              {OVERLAY_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="city-btn" onClick={onBudget}>
        Budget
      </button>
      <button type="button" className="city-btn" onClick={onNewCity} title="Start a new city (the current one is replaced)">
        New
      </button>
    </div>
  );
}
