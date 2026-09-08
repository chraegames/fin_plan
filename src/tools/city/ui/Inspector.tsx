import { DENSITY_NAMES, TUNING, WEALTH_SYMBOL, ZONE_NAMES, plopDef } from '../constants';
import type { SnapshotLayers } from '../protocol';
import { N, PROBLEM, ZONE, type OverlayKind, type XY } from '../types';
import { capacityOf } from '../sim/buildings';
import { CityIcon, type CityIconName } from './icons';
import { PLOP_COLOR, PLOP_ICON } from './toolbarData';

interface InspectorProps {
  tile: XY;
  layers: SnapshotLayers | null;
  /** Changes whenever the layers were refreshed (they are mutated in place). */
  version: number;
  /** The nine RCI demand bars (for the "next level" checklist). */
  demand: number[];
  onClose: () => void;
  onOverlay: (k: OverlayKind) => void;
}

interface Need {
  text: string;
  done: boolean;
  /** 0..1 progress toward the requirement (for a bar). */
  progress: number;
}

/** What a built lot still needs to grow a level or attract the next wealth tier. */
function nextNeeds(L: SnapshotLayers, i: number, demand: number[]): { title: string; needs: Need[] } | null {
  const z = L.zone[i];
  const lv = L.level[i];
  const w = L.wealth[i];
  const desir = L.desirability[i];
  if (lv < 3) {
    const needDesir = TUNING.upgradeDesir[lv];
    const d = demand[(z - 1) * 3 + (w - 1)] ?? 0;
    return {
      title: `Next: level ${lv + 1}`,
      needs: [
        { text: `Desirability above ${Math.round((needDesir / 255) * 100)}%`, done: desir > needDesir, progress: Math.min(1, desir / needDesir) },
        { text: `Demand for ${WEALTH_SYMBOL[w]} ${ZONE_NAMES[z].toLowerCase()} above +${TUNING.upgradeMinDemand}`, done: d > TUNING.upgradeMinDemand, progress: Math.min(1, Math.max(0, d / (TUNING.upgradeMinDemand + 1))) },
        { text: `Settled for ${TUNING.upgradeMinAgeMonths + 1} months`, done: L.age[i] > TUNING.upgradeMinAgeMonths, progress: Math.min(1, L.age[i] / (TUNING.upgradeMinAgeMonths + 1)) },
      ],
    };
  }
  if (w < 3) {
    const needDesir = TUNING.wealthMinDesir[w + 1];
    const needLv = TUNING.wealthMinLandValue[w + 1];
    const d = demand[(z - 1) * 3 + w] ?? 0;
    return {
      title: `Next: ${WEALTH_SYMBOL[w + 1]} tenants`,
      needs: [
        { text: `Desirability above ${Math.round((needDesir / 255) * 100)}%`, done: desir >= needDesir, progress: Math.min(1, desir / needDesir) },
        { text: `Land value above ${Math.round((needLv / 255) * 100)}%`, done: L.landValue[i] >= needLv, progress: Math.min(1, L.landValue[i] / Math.max(1, needLv)) },
        { text: `Demand for ${WEALTH_SYMBOL[w + 1]} ${ZONE_NAMES[z].toLowerCase()} (needs education and health)`, done: d > 0, progress: Math.min(1, Math.max(0, (d + 30) / 40)) },
      ],
    };
  }
  return null;
}

type Row = [string, React.ReactNode];

function Meter({ v, color, invert }: { v: number; color: string; invert?: boolean }) {
  const pct = Math.round((v / 255) * 100);
  return (
    <>
      {pct}%
      <span className="city-meter" title={invert ? 'lower is better' : 'higher is better'}>
        <i style={{ width: `${pct}%`, background: color }} />
      </span>
    </>
  );
}

const yesNo = (b: boolean) => <span className={b ? 'city-yes' : 'city-no'}>{b ? 'yes' : 'no'}</span>;

interface ProblemInfo {
  bit: number;
  icon: CityIconName;
  color: string;
  title: string;
  fix: string;
  overlay?: OverlayKind;
}

const PROBLEM_INFO: ProblemInfo[] = [
  { bit: PROBLEM.NO_POWER, icon: 'pylon', color: 'var(--cp-power)', title: 'No power', fix: 'Connect a power plant: roads, zones and power lines all conduct. If plants exist, supply may be short.', overlay: 'power' },
  { bit: PROBLEM.NO_WATER, icon: 'pump', color: 'var(--cp-water)', title: 'No water', fix: 'Pipes run under roads within 6 tiles of a pump or tower. Add supply or a pipe.', overlay: 'water' },
  { bit: PROBLEM.NO_ROAD, icon: 'road', color: 'var(--cp-road)', title: 'No road access', fix: 'Lots must be within 3 tiles of a road.' },
  { bit: PROBLEM.NO_JOBS, icon: 'jobs', color: 'var(--cp-health)', title: 'No jobs reachable', fix: 'Zone commercial or industrial land connected by road, or build a road to the map edge.', overlay: 'traffic' },
  { bit: PROBLEM.NO_WORKERS, icon: 'people', color: 'var(--cp-c)', title: 'Not enough workers', fix: 'Zone more residential land so people move in.' },
  { bit: PROBLEM.NO_CUSTOMERS, icon: 'shop', color: 'var(--cp-i)', title: 'No customers', fix: 'Shops want homes within about six tiles.' },
  { bit: PROBLEM.GARBAGE, icon: 'bin', color: '#8C7A4B', title: 'No rubbish collection', fix: 'A landfill, incinerator or recycling centre must reach this lot along the roads.', overlay: 'garbage' },
  { bit: PROBLEM.BLIGHT, icon: 'warning', color: 'var(--cp-danger)', title: 'Crime or pollution', fix: 'Police cover and parks help; keep industry away from homes.', overlay: 'crime' },
];

export function Inspector({ tile, layers: L, version, demand, onClose, onOverlay }: InspectorProps) {
  void version;
  const i = tile.y * N + tile.x;
  const rows: Row[] = [];
  let title = `Tile ${tile.x}, ${tile.y}`;
  let icon: CityIconName = 'inspect';
  let color = 'var(--cp-purple)';
  let problems: ProblemInfo[] = [];
  let next: { title: string; needs: Need[] } | null = null;
  let status: { text: string; tone: 'ok' | 'warn' | 'bad' } | null = null;
  if (L) {
    const z = L.zone[i];
    const plop = L.plop[i] ? plopDef(L.plop[i]) : undefined;
    if (plop) {
      title = plop.name;
      icon = PLOP_ICON[plop.id] ?? 'house';
      color = PLOP_COLOR[plop.id] ?? color;
      const o = L.plopOrigin[i];
      rows.push(['Size', `${plop.size}×${plop.size}`]);
      rows.push(['Upkeep', `$${plop.monthly}/month`]);
      if (plop.kind === 'power') rows.push(['Output', `${plop.capacity.toLocaleString('en-US')} power`]);
      if (plop.kind === 'water') rows.push(['Output', `${plop.capacity.toLocaleString('en-US')} water`]);
      if (plop.kind === 'garbage') rows.push(['Capacity', `${plop.capacity.toLocaleString('en-US')} / month`]);
      if (TUNING.serviceRange[plop.id]) rows.push(['Reach', `${TUNING.serviceRange[plop.id]} road tiles`]);
      if (TUNING.serviceCapacity[plop.id]) rows.push(['Capacity', `${TUNING.serviceCapacity[plop.id].toLocaleString('en-US')} people`]);
      if (plop.needsRoad) {
        // a road must touch the footprint
        let road = false;
        const ox = o % N;
        const oy = (o / N) | 0;
        for (let dy = -1; dy <= plop.size && !road; dy++) for (let dx = -1; dx <= plop.size && !road; dx++) {
          const x = ox + dx;
          const y = oy + dy;
          if (x >= 0 && y >= 0 && x < N && y < N && L.road[y * N + x]) road = true;
        }
        rows.push(['Road next to it', yesNo(road)]);
        if (!road) status = { text: 'Not working: it needs a road touching it.', tone: 'bad' };
      }
      if (L.onFire[o]) status = { text: 'On fire!', tone: 'bad' };
      else if (!status) status = { text: plop.desc, tone: 'ok' };
    } else if (z) {
      title = `${ZONE_NAMES[z]} · ${DENSITY_NAMES[L.density[i]]}`;
      icon = z === ZONE.R ? 'house' : z === ZONE.C ? 'shop' : 'factory';
      color = z === ZONE.R ? 'var(--cp-r)' : z === ZONE.C ? 'var(--cp-c)' : 'var(--cp-i)';
      if (L.level[i]) {
        const k = L.lotSize[i] || 1;
        const o = k > 1 ? L.lotOrigin[i] : i;
        const cap = capacityOf(z, L.density[i], L.level[i], L.wealth[i]);
        rows.push(['Building', `Level ${L.level[i]} · ${WEALTH_SYMBOL[L.wealth[i]]}${k > 1 ? ` · ${k}×${k} lot` : ''}`]);
        rows.push([z === ZONE.R ? 'Residents' : 'Jobs', `${z === ZONE.R ? L.pop[i] : L.jobs[i]} / ${cap}`]);
        rows.push(['Age', L.age[i] === 0 ? 'under construction' : `${L.age[i]} months`]);
        if (L.abandoned[i]) status = { text: 'Abandoned. It recovers when demand and desirability return, or is demolished.', tone: 'bad' };
        else if (L.onFire[i]) status = { text: 'On fire!', tone: 'bad' };
        else {
          const bits = L.problems[o];
          problems = PROBLEM_INFO.filter(p => bits & p.bit);
          next = nextNeeds(L, o, demand);
          if (!problems.length) {
            const d = L.desirability[i];
            status = d > TUNING.upgradeDesir[L.level[i]] && L.level[i] < 3 ? { text: 'Thriving — likely to grow to the next level.', tone: 'ok' } : d < TUNING.abandonDesir + 20 ? { text: 'Struggling: desirability is low.', tone: 'warn' } : { text: 'Doing fine.', tone: 'ok' };
          }
        }
      } else {
        rows.push(['Building', 'nothing built yet']);
        if (!L.roadAccess[i]) status = { text: 'Will not grow: no road within 3 tiles.', tone: 'bad' };
        else if (!L.powered[i]) status = { text: 'Will grow slowly: no power reaches this lot yet.', tone: 'warn' };
        else status = { text: 'Waiting for demand. Buildings appear when the RCI bar for this zone is positive.', tone: 'ok' };
      }
      rows.push(['Desirability', <Meter v={L.desirability[i]} color="var(--cp-purple)" />]);
    } else if (L.road[i]) {
      title = L.road[i] === 2 ? 'Avenue' : 'Street';
      icon = L.road[i] === 2 ? 'avenue' : 'road';
      color = 'var(--cp-road)';
      rows.push(['Traffic', <Meter v={L.traffic[i]} color="var(--cp-road)" invert />]);
      rows.push(['Bus service', <Meter v={L.transitCover[i]} color="#E0A33B" />]);
      status = L.traffic[i] > 200 ? { text: 'Jammed. Upgrade to an avenue or add a bus depot.', tone: 'bad' } : L.traffic[i] > 128 ? { text: 'Busy.', tone: 'warn' } : { text: 'Flowing freely. Roads carry power and water too.', tone: 'ok' };
    } else title = 'Open land';
    if (z || plop) {
      rows.push(['Power', yesNo(!!L.powered[i])]);
      rows.push(['Water', yesNo(!!L.watered[i])]);
      rows.push(['Road access', L.roadAccess[i] ? `${L.roadAccess[i] - 1} tiles away` : <span className="city-no">none</span>]);
    }
    if (z === ZONE.R && L.level[i]) {
      rows.push(['Commute', L.commute[i] === 255 ? <span className="city-no">no jobs reachable</span> : `${L.commute[i]} tiles`]);
      rows.push(['Education', `${L.edu[i]} / 100`]);
      rows.push(['Health', `${L.health[i]} / 100`]);
    }
    rows.push(['Land value', <Meter v={L.landValue[i]} color="var(--cp-coin)" />]);
    rows.push(['Pollution', <Meter v={L.pollution[i]} color="#8C7A4B" invert />]);
    rows.push(['Crime', <Meter v={L.crime[i]} color="#3F5FB0" invert />]);
    if (L.fireRisk[i]) rows.push(['Fire risk', <Meter v={L.fireRisk[i]} color="var(--cp-danger)" invert />]);
    rows.push(['Fire · police', `${Math.round((L.fireCover[i] / 255) * 100)}% · ${Math.round((L.policeCover[i] / 255) * 100)}%`]);
    rows.push(['Health · schools', `${Math.round((L.healthCover[i] / 255) * 100)}% · ${Math.round((L.eduCover[i] / 255) * 100)}%`]);
    if (L.level[i]) rows.push(['Garbage', <Meter v={L.garbageCover[i]} color="#8C7A4B" />]);
  }
  return (
    <div className="city-panel city-inspector" role="dialog" aria-label="Tile inspector">
      <div className="city-panel-head">
        <span className="city-inspector-title">
          <span className="city-tile" style={{ background: color }}>
            <CityIcon name={icon} size={15} />
          </span>
          {title}
        </span>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Close inspector">
          <CityIcon name="close" size={14} />
        </button>
      </div>
      {status && <div className={`city-status city-status-${status.tone}`}>{status.text}</div>}
      {problems.length > 0 && (
        <ul className="city-problems">
          {problems.map(p => (
            <li key={p.bit}>
              <span className="city-tile" style={{ background: p.color }}>
                <CityIcon name={p.icon} size={13} />
              </span>
              <span>
                <b>{p.title}</b>
                <small>{p.fix}</small>
              </span>
              {p.overlay && (
                <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={() => onOverlay(p.overlay!)} title="Show on the map" aria-label="Show on the map">
                  <CityIcon name="eye" size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {next && (
        <div className="city-next">
          <b>{next.title}</b>
          <ul>
            {next.needs.map(n => (
              <li key={n.text} className={n.done ? 'city-done' : ''}>
                <span className="city-check">{n.done && <CityIcon name="check" size={10} />}</span>
                <span>
                  {n.text}
                  {!n.done && (
                    <span className="city-meter city-meter-sm">
                      <i style={{ width: `${n.progress * 100}%`, background: 'var(--cp-purple)' }} />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <table className="city-kv">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
