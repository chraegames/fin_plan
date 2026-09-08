import { SERVICE_NAMES } from '../constants';
import type { HistoryPoint, HudStats } from '../types';
import { formatCount, formatMoney } from './format';
import { CityIcon, type CityIconName } from './icons';

interface StatsPanelProps {
  hud: HudStats | null;
  onClose: () => void;
}

/** Inline SVG sparkline of one history field. */
function Spark({ points, field, color, format }: { points: HistoryPoint[]; field: keyof HistoryPoint; color: string; format: (v: number) => string }) {
  const W = 240;
  const H = 56;
  const vals = points.map(p => p[field]);
  const n = vals.length;
  let min = Math.min(0, ...vals);
  let max = Math.max(1, ...vals);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;
  const x = (k: number) => (n > 1 ? (k / (n - 1)) * W : W);
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const d = n ? vals.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ') : '';
  const area = n ? `${d} L${W},${H} L0,${H} Z` : '';
  const last = vals[n - 1] ?? 0;
  const first = vals[0] ?? 0;
  return (
    <div className="city-spark">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {n > 1 && <path d={area} fill={color} opacity={0.18} />}
        {n > 1 && <path d={d} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />}
        {min < 0 && max > 0 && <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--cp-line)" strokeDasharray="3 3" opacity={0.4} />}
      </svg>
      <div className="city-spark-vals">
        <b>{format(last)}</b>
        {n > 1 && <small className={last >= first ? 'city-pos' : 'city-neg'}>{last >= first ? '▲' : '▼'} {format(Math.abs(last - first))} over {n} months</small>}
      </div>
    </div>
  );
}

function Row({ icon, color, label, value, hint }: { icon: CityIconName; color: string; label: string; value: string; hint?: string }) {
  return (
    <div className="city-fact" title={hint}>
      <span className="city-tile" style={{ background: color }}>
        <CityIcon name={icon} size={13} />
      </span>
      <span className="city-fact-label">{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function StatsPanel({ hud, onClose }: StatsPanelProps) {
  const t = hud?.totals;
  const h = hud?.history ?? [];
  const pct = (v: number) => `${Math.round(v)}%`;
  const exp = hud?.ledger[0]?.expenses ?? [];
  const biggest = exp.length ? exp.reduce((b, v, k) => (v > exp[b] ? k : b), 0) : -1;
  return (
    <div className="city-panel city-sheet city-stats" role="dialog" aria-label="City statistics">
      <div className="city-panel-head">
        <span>
          <CityIcon name="chart" size={16} style={{ verticalAlign: -3, marginRight: 8 }} />
          City statistics
        </span>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Close statistics">
          <CityIcon name="close" size={14} />
        </button>
      </div>
      <div className="city-stats-grid">
        <section>
          <h4>Population</h4>
          <Spark points={h} field="population" color="var(--cp-r)" format={formatCount} />
          <h4>Treasury</h4>
          <Spark points={h} field="funds" color="var(--cp-coin)" format={formatMoney} />
          <h4>Jobs filled</h4>
          <Spark points={h} field="jobs" color="var(--cp-c)" format={formatCount} />
          <h4>Happiness</h4>
          <Spark points={h} field="happiness" color="var(--cp-purple)" format={pct} />
        </section>
        <section>
          <h4>People</h4>
          {t && (
            <>
              <Row icon="smile" color="var(--cp-purple)" label="Happiness" value={pct(t.happiness)} hint="How much residents like where they live (desirability of their homes)" />
              <Row icon="jobs" color="var(--cp-c)" label="Unemployment" value={pct(t.unemployment * 100)} hint="Workers who cannot reach a job" />
              <Row icon="school" color="var(--cp-edu)" label="Education" value={`${Math.round(t.cityEdu)} / 100`} hint="Above 40 attracts wealthy households and clean industry" />
              <Row icon="clinic" color="var(--cp-health)" label="Health" value={`${Math.round(t.cityHealth)} / 100`} />
              <Row icon="coins" color="var(--cp-coin)" label="Average wealth" value={['', '$', '$$', '$$$'][Math.round(t.avgWealth)] ?? '$'} hint={`${t.avgWealth.toFixed(2)} of 3`} />
            </>
          )}
          <h4>City</h4>
          {t && (
            <>
              <Row icon="house" color="var(--cp-r)" label="Buildings" value={`${formatCount(t.buildings)}${t.abandoned ? ` · ${t.abandoned} abandoned` : ''}`} />
              <Row icon="warning" color="var(--cp-danger)" label="Lots with problems" value={formatCount(t.problems)} hint="Turn on the data views or problem icons to find them" />
              <Row icon="road" color="var(--cp-road)" label="Road tiles" value={formatCount(t.roadTiles)} />
              <Row icon="flame" color="#B3261E" label="Pollution" value={`${Math.round(t.meanPollution)} / 255`} hint="Mean over built tiles" />
              <Row icon="police" color="#3F5FB0" label="Crime" value={`${Math.round(t.meanCrime)} / 255`} hint="Mean over built tiles" />
            </>
          )}
          <h4>Utilities</h4>
          {t && (
            <>
              <Row icon="pylon" color="var(--cp-power)" label="Power" value={`${formatCount(t.powerDemand)} / ${formatCount(t.powerSupply)}`} hint="used / capacity" />
              <Row icon="pump" color="var(--cp-water)" label="Water" value={`${formatCount(t.waterDemand)} / ${formatCount(t.waterSupply)}`} hint="used / capacity" />
              <Row icon="bin" color="#8C7A4B" label="Garbage" value={`${formatCount(t.garbageDemand)} / ${formatCount(t.garbageSupply)}`} hint="produced / collected per month" />
              {biggest >= 0 && <Row icon="budget" color="var(--cp-coin)" label="Biggest expense" value={`${SERVICE_NAMES[biggest]} ${formatMoney(exp[biggest])}`} />}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
