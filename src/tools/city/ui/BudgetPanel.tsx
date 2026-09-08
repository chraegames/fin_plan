import { SERVICE_NAMES, TUNING, ZONE_NAMES } from '../constants';
import { LOAN_TIER, MILESTONES, POLICY_TIER } from '../sim/milestones';
import { POLICIES } from '../sim/policies';
import type { HudStats, ServiceId, ZoneKind } from '../types';
import { formatMoney } from './format';
import { CityIcon, type CityIconName } from './icons';

interface BudgetPanelProps {
  hud: HudStats | null;
  onTax: (zone: ZoneKind, rate: number) => void;
  onFunding: (service: ServiceId, level: number) => void;
  onPolicy: (bit: number, on: boolean) => void;
  onLoan: (amount: number) => void;
  onRepay: (id: number) => void;
  onClose: () => void;
}

const ZONE_LOOK: { icon: CityIconName; color: string }[] = [
  { icon: 'house', color: '' },
  { icon: 'house', color: 'var(--cp-r)' },
  { icon: 'shop', color: 'var(--cp-c)' },
  { icon: 'factory', color: 'var(--cp-i)' },
];
const SERVICE_LOOK: { icon: CityIconName; color: string }[] = [
  { icon: 'pylon', color: 'var(--cp-power)' },
  { icon: 'pump', color: 'var(--cp-water)' },
  { icon: 'road', color: 'var(--cp-road)' },
  { icon: 'firestation', color: 'var(--cp-danger)' },
  { icon: 'police', color: '#3F5FB0' },
  { icon: 'clinic', color: 'var(--cp-health)' },
  { icon: 'school', color: 'var(--cp-edu)' },
  { icon: 'bin', color: '#8C7A4B' },
  { icon: 'bus', color: '#E0A33B' },
  { icon: 'park', color: 'var(--cp-park)' },
];

const lockNote = (tier: number) => `Unlocks at ${MILESTONES[tier].name} (${MILESTONES[tier].pop.toLocaleString('en-US')} residents)`;

export function BudgetPanel({ hud, onTax, onFunding, onPolicy, onLoan, onRepay, onClose }: BudgetPanelProps) {
  const last = hud?.ledger[0];
  const expenses = last?.expenses ?? [];
  const milestone = hud?.milestone ?? 0;
  const policiesLocked = milestone < POLICY_TIER;
  const loansLocked = milestone < LOAN_TIER;
  const pop = hud?.totals.population ?? 0;
  const income = (last?.incomeR ?? 0) + (last?.incomeC ?? 0) + (last?.incomeI ?? 0);
  return (
    <div className="city-panel city-sheet city-budget" role="dialog" aria-label="Budget">
      <div className="city-panel-head">
        <span>
          <CityIcon name="budget" size={16} style={{ verticalAlign: -3, marginRight: 8 }} />
          Budget
        </span>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Close budget">
          <CityIcon name="close" size={14} />
        </button>
      </div>
      <div className="city-budget-cols">
        <section>
          <h4>Tax rates</h4>
          <p className="city-sheet-note">9% is neutral. Higher rates earn more but push demand down; lower rates attract growth.</p>
          {([1, 2, 3] as ZoneKind[]).map(z => (
            <label key={z} className="city-slider">
              <span className="city-tile" style={{ background: ZONE_LOOK[z].color }}>
                <CityIcon name={ZONE_LOOK[z].icon} size={14} />
              </span>
              <span>{ZONE_NAMES[z]}</span>
              <input type="range" min={0} max={20} step={1} value={hud?.taxes[z - 1] ?? TUNING.taxNeutral} onChange={e => onTax(z, Number(e.target.value))} />
              <b>{hud?.taxes[z - 1] ?? TUNING.taxNeutral}%</b>
            </label>
          ))}
          <h4>Service funding</h4>
          <p className="city-sheet-note">Funding scales each service's reach and output. Below 100% saves money at a cost in coverage.</p>
          {SERVICE_NAMES.map((name, k) => (
            <label key={name} className="city-slider">
              <span className="city-tile" style={{ background: SERVICE_LOOK[k].color }}>
                <CityIcon name={SERVICE_LOOK[k].icon} size={14} />
              </span>
              <span>{name}</span>
              <input type="range" min={0} max={150} step={5} value={Math.round((hud?.funding[k] ?? 1) * 100)} onChange={e => onFunding(k as ServiceId, Number(e.target.value) / 100)} />
              <b>{Math.round((hud?.funding[k] ?? 1) * 100)}%</b>
            </label>
          ))}
          <h4>
            Policies {policiesLocked && <CityIcon name="lock" size={11} style={{ verticalAlign: -1 }} />}
          </h4>
          {policiesLocked ? (
            <p className="city-sheet-note">{lockNote(POLICY_TIER)}. Ordinances trade a monthly cost for a city-wide effect.</p>
          ) : (
            <div className="city-policies">
              {POLICIES.map(p => {
                const on = !!(hud && hud.policies & p.bit);
                const cost = p.fixed + p.perPop * pop;
                return (
                  <label key={p.key} className={`city-policy${on ? ' city-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={e => onPolicy(p.bit, e.target.checked)} />
                    <span className="city-policy-text">
                      <b>
                        {p.name}
                        <em>{cost > 0 ? `${formatMoney(cost)}/mo` : 'costs revenue'}</em>
                      </b>
                      <small>{p.desc}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>
        <section>
          <h4>Last month</h4>
          <table className="city-ledger">
            <tbody>
              <tr>
                <th>Residential tax</th>
                <td className="city-pos">{formatMoney(last?.incomeR ?? 0)}</td>
              </tr>
              <tr>
                <th>Commercial tax</th>
                <td className="city-pos">{formatMoney(last?.incomeC ?? 0)}</td>
              </tr>
              <tr>
                <th>Industrial tax</th>
                <td className="city-pos">{formatMoney(last?.incomeI ?? 0)}</td>
              </tr>
              {SERVICE_NAMES.map((name, k) => (
                <tr key={name}>
                  <th>{name}</th>
                  <td>−{formatMoney(expenses[k] ?? 0)}</td>
                </tr>
              ))}
              <tr>
                <th>Policies</th>
                <td>−{formatMoney(last?.policyCost ?? 0)}</td>
              </tr>
              <tr>
                <th>Loans</th>
                <td>−{formatMoney(last?.loanCost ?? 0)}</td>
              </tr>
              <tr className="city-ledger-net">
                <th>Net</th>
                <td className={(last?.net ?? 0) < 0 ? 'city-neg' : 'city-pos'}>{formatMoney(last?.net ?? 0)}</td>
              </tr>
            </tbody>
          </table>
          {income > 0 && last && last.net < 0 && <p className="city-sheet-note">Spending exceeds income. Raise a tax a point or two, or trim the funding of a service the city does not use much yet.</p>}
          <h4>
            Loans {loansLocked && <CityIcon name="lock" size={11} style={{ verticalAlign: -1 }} />}
          </h4>
          {(hud?.loans ?? []).map(l => (
            <div key={l.id} className="city-loan">
              <span>
                {formatMoney(l.principal)} · {formatMoney(l.balance)} left · {l.monthsLeft} months
              </span>
              <button type="button" className="city-btn city-btn-sm" onClick={() => onRepay(l.id)} disabled={!hud || hud.funds < l.balance}>
                Repay
              </button>
            </div>
          ))}
          {loansLocked ? (
            <p className="city-sheet-note">{lockNote(LOAN_TIER)}.</p>
          ) : (
            <div className="city-loan-actions">
              {TUNING.loanSizes.map(a => (
                <button key={a} type="button" className="city-btn city-btn-sm" onClick={() => onLoan(a)} disabled={(hud?.loans.length ?? 0) >= 3}>
                  <CityIcon name="coins" size={14} /> Borrow {formatMoney(a)}
                </button>
              ))}
              <span>10 years at {Math.round(TUNING.loanApr * 100)}%, up to three loans.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
