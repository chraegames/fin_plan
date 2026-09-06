import { DENSITY_NAMES, WEALTH_SYMBOL, ZONE_NAMES, plopDef } from '../constants';
import type { SnapshotLayers } from '../protocol';
import { N, ZONE, type XY } from '../types';
import { capacityOf } from '../sim/buildings';
import { CityIcon } from './icons';

interface InspectorProps {
  tile: XY;
  layers: SnapshotLayers | null;
  /** Changes whenever the layers were refreshed (they are mutated in place). */
  version: number;
  onClose: () => void;
}

type Row = [string, React.ReactNode];

function Meter({ v, color }: { v: number; color: string }) {
  return (
    <>
      {Math.round((v / 255) * 100)}%
      <span className="city-meter">
        <i style={{ width: `${(v / 255) * 100}%`, background: color }} />
      </span>
    </>
  );
}

const yesNo = (b: boolean) => <span className={b ? 'city-yes' : 'city-no'}>{b ? 'yes' : 'no'}</span>;

export function Inspector({ tile, layers: L, version, onClose }: InspectorProps) {
  void version;
  const i = tile.y * N + tile.x;
  const rows: Row[] = [];
  let title = `Tile ${tile.x}, ${tile.y}`;
  if (L) {
    const z = L.zone[i];
    const plop = L.plop[i] ? plopDef(L.plop[i]) : undefined;
    if (plop) title = plop.name;
    else if (z) {
      title = `${ZONE_NAMES[z]} · ${DENSITY_NAMES[L.density[i]]}`;
      if (L.level[i]) {
        rows.push(['Building', `Level ${L.level[i]} · ${WEALTH_SYMBOL[L.wealth[i]]}${L.abandoned[i] ? ' · abandoned' : ''}`]);
        const cap = capacityOf(z, L.density[i], L.level[i], L.wealth[i]);
        rows.push([z === ZONE.R ? 'Residents' : 'Jobs', `${z === ZONE.R ? L.pop[i] : L.jobs[i]} / ${cap}`]);
      } else rows.push(['Building', 'nothing built yet']);
      rows.push(['Desirability', <Meter v={L.desirability[i]} color="var(--cp-purple)" />]);
    } else if (L.road[i]) {
      title = 'Road';
      rows.push(['Traffic', <Meter v={L.traffic[i]} color="var(--cp-road)" />]);
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
    rows.push(['Pollution', <Meter v={L.pollution[i]} color="#8C7A4B" />]);
    rows.push(['Crime', <Meter v={L.crime[i]} color="#3F5FB0" />]);
    if (L.fireRisk[i]) rows.push(['Fire risk', <Meter v={L.fireRisk[i]} color="var(--cp-danger)" />]);
    rows.push(['Fire · police', `${Math.round((L.fireCover[i] / 255) * 100)}% · ${Math.round((L.policeCover[i] / 255) * 100)}%`]);
    rows.push(['Health · schools', `${Math.round((L.healthCover[i] / 255) * 100)}% · ${Math.round((L.eduCover[i] / 255) * 100)}%`]);
    if (L.onFire[i]) rows.push(['On fire', <span className="city-no">yes</span>]);
  }
  return (
    <div className="city-panel city-inspector" role="dialog" aria-label="Tile inspector">
      <div className="city-panel-head">
        <span>
          <CityIcon name="inspect" size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          {title}
        </span>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Close inspector">
          <CityIcon name="close" size={14} />
        </button>
      </div>
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
