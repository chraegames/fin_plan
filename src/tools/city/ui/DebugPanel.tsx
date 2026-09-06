import { useMemo, useState } from 'react';
import { TUNABLE_KEYS, TUNING, type TunableKey } from '../constants';
import type { SnapshotLayers } from '../protocol';
import { T, type HudStats } from '../types';
import { CityIcon } from './icons';

interface DebugPanelProps {
  hud: HudStats | null;
  layers: SnapshotLayers | null;
  version: number;
  onFastForward: (ticks: number) => void;
  onGrant: (amount: number) => void;
  onTuning: (overrides: Partial<Record<TunableKey, number>>) => void;
  onClose: () => void;
}

/** Mean of a layer over built tiles (or all land tiles when nothing is built). */
function meanBuilt(L: SnapshotLayers, a: Uint8Array): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < T; i++) {
    if (!L.level[i]) continue;
    sum += a[i];
    n++;
  }
  return n ? sum / n : 0;
}

/** Localhost / ?debug=1 tuning panel: layer means, time and cash controls, TUNING overrides. */
export function DebugPanel({ hud, layers: L, version, onFastForward, onGrant, onTuning, onClose }: DebugPanelProps) {
  const [overrides, setOverrides] = useState<Partial<Record<TunableKey, number>>>({});
  const means = useMemo(() => {
    void version;
    if (!L) return null;
    return {
      desirability: meanBuilt(L, L.desirability),
      landValue: meanBuilt(L, L.landValue),
      pollution: meanBuilt(L, L.pollution),
      crime: meanBuilt(L, L.crime),
      traffic: meanBuilt(L, L.traffic),
      fireCover: meanBuilt(L, L.fireCover),
      policeCover: meanBuilt(L, L.policeCover),
      healthCover: meanBuilt(L, L.healthCover),
      eduCover: meanBuilt(L, L.eduCover),
      commute: meanBuilt(L, L.commute),
    };
  }, [L, version]);
  const t = hud?.totals;
  return (
    <div className="city-panel city-debug" role="dialog" aria-label="Tuning panel">
      <div className="city-panel-head">
        <span>Tuning (debug)</span>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Close tuning panel">
          <CityIcon name="close" size={14} />
        </button>
      </div>
      <div className="city-debug-actions">
        <button type="button" className="city-btn city-btn-sm" onClick={() => onFastForward(24)}>
          +1 month
        </button>
        <button type="button" className="city-btn city-btn-sm" onClick={() => onFastForward(24 * 12)}>
          +1 year
        </button>
        <button type="button" className="city-btn city-btn-sm" onClick={() => onGrant(100_000)}>
          +$100k
        </button>
      </div>
      {t && means && (
        <table className="city-kv city-debug-kv">
          <tbody>
            <tr>
              <th>pop / jobs / filled</th>
              <td>
                {t.population} / {t.jobs} / {t.jobsFilled}
              </td>
            </tr>
            <tr>
              <th>buildings / abandoned</th>
              <td>
                {t.buildings} / {t.abandoned}
              </td>
            </tr>
            <tr>
              <th>edu / health / wealth</th>
              <td>
                {t.cityEdu.toFixed(0)} / {t.cityHealth.toFixed(0)} / {t.avgWealth.toFixed(2)}
              </td>
            </tr>
            <tr>
              <th>power / water</th>
              <td>
                {Math.round(t.powerDemand)}/{Math.round(t.powerSupply)} · {Math.round(t.waterDemand)}/{Math.round(t.waterSupply)}
              </td>
            </tr>
            {Object.entries(means).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v.toFixed(0)}</td>
              </tr>
            ))}
            <tr>
              <th>demand</th>
              <td>{hud!.demand.map(d => Math.round(d)).join(' ')}</td>
            </tr>
          </tbody>
        </table>
      )}
      <div className="city-debug-tuning">
        {TUNABLE_KEYS.map(k => (
          <label key={k}>
            <span>{k}</span>
            <input
              type="number"
              step="any"
              value={overrides[k] ?? (TUNING[k] as number)}
              onChange={e => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                const next = { ...overrides, [k]: v };
                setOverrides(next);
                onTuning({ [k]: v });
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
