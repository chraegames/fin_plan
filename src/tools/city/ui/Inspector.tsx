import { DENSITY_NAMES, WEALTH_SYMBOL, ZONE_NAMES, plopDef } from '../constants';
import type { SnapshotLayers } from '../protocol';
import { N, ZONE, type XY } from '../types';
import { capacityOf } from '../sim/buildings';

interface InspectorProps {
  tile: XY;
  layers: SnapshotLayers | null;
  /** Changes whenever the layers were refreshed (they are mutated in place). */
  version: number;
  onClose: () => void;
}

const pct = (v: number) => `${Math.round((v / 255) * 100)}%`;

export function Inspector({ tile, layers: L, version, onClose }: InspectorProps) {
  void version;
  const i = tile.y * N + tile.x;
  const rows: [string, string][] = [];
  if (L) {
    const z = L.zone[i];
    const plop = L.plop[i] ? plopDef(L.plop[i]) : undefined;
    if (plop) rows.push(['Building', plop.name]);
    else if (z) {
      rows.push(['Zone', `${ZONE_NAMES[z]} · ${DENSITY_NAMES[L.density[i]]} density`]);
      if (L.level[i]) {
        rows.push(['Building', `Level ${L.level[i]} · ${WEALTH_SYMBOL[L.wealth[i]]}${L.abandoned[i] ? ' · abandoned' : ''}`]);
        const cap = capacityOf(z, L.density[i], L.level[i], L.wealth[i]);
        rows.push([z === ZONE.R ? 'Residents' : 'Jobs', `${z === ZONE.R ? L.pop[i] : L.jobs[i]} / ${cap}`]);
      } else rows.push(['Building', 'none yet']);
      rows.push(['Desirability', pct(L.desirability[i])]);
    } else if (L.road[i]) rows.push(['Road', `traffic ${pct(L.traffic[i])}`]);
    else rows.push(['Land', 'empty']);
    if (z || plop) {
      rows.push(['Power', L.powered[i] ? 'yes' : 'no']);
      rows.push(['Water', L.watered[i] ? 'yes' : 'no']);
      rows.push(['Road access', L.roadAccess[i] ? `${L.roadAccess[i] - 1} tiles` : 'none']);
    }
    if (z === ZONE.R && L.level[i]) {
      rows.push(['Commute', L.commute[i] === 255 ? 'no jobs reachable' : `${L.commute[i]} tiles`]);
      rows.push(['Education', `${L.edu[i]}`]);
      rows.push(['Health', `${L.health[i]}`]);
    }
    rows.push(['Land value', pct(L.landValue[i])]);
    rows.push(['Pollution', pct(L.pollution[i])]);
    rows.push(['Crime', pct(L.crime[i])]);
    if (L.fireRisk[i]) rows.push(['Fire risk', pct(L.fireRisk[i])]);
    rows.push(['Fire · police', `${pct(L.fireCover[i])} · ${pct(L.policeCover[i])}`]);
    rows.push(['Health · schools', `${pct(L.healthCover[i])} · ${pct(L.eduCover[i])}`]);
    if (L.onFire[i]) rows.push(['On fire', 'yes']);
  }
  return (
    <div className="city-panel city-inspector" role="dialog" aria-label="Tile inspector">
      <div className="city-inspector-head">
        <span>Tile {tile.x}, {tile.y}</span>
        <button type="button" className="city-btn city-btn-sm" onClick={onClose} aria-label="Close inspector">
          ✕
        </button>
      </div>
      <table>
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
