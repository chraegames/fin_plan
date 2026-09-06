import { SERVICE_NAMES, TUNING, ZONE_NAMES } from '../constants';
import type { HudStats, ServiceId, ZoneKind } from '../types';
import { formatMoney } from './format';

interface BudgetPanelProps {
  hud: HudStats | null;
  onTax: (zone: ZoneKind, rate: number) => void;
  onFunding: (service: ServiceId, level: number) => void;
  onLoan: (amount: number) => void;
  onRepay: (id: number) => void;
  onClose: () => void;
}

export function BudgetPanel({ hud, onTax, onFunding, onLoan, onRepay, onClose }: BudgetPanelProps) {
  const last = hud?.ledger[0];
  const expenses = last?.expenses ?? [];
  return (
    <div className="city-panel city-budget" role="dialog" aria-label="Budget">
      <div className="city-inspector-head">
        <span>Budget</span>
        <button type="button" className="city-btn city-btn-sm" onClick={onClose} aria-label="Close budget">
          ✕
        </button>
      </div>
      <div className="city-budget-cols">
        <section>
          <h4>Taxes</h4>
          {([1, 2, 3] as ZoneKind[]).map(z => (
            <label key={z} className="city-slider">
              <span>{ZONE_NAMES[z]}</span>
              <input type="range" min={0} max={20} step={1} value={hud?.taxes[z - 1] ?? TUNING.taxNeutral} onChange={e => onTax(z, Number(e.target.value))} />
              <b>{hud?.taxes[z - 1] ?? TUNING.taxNeutral}%</b>
            </label>
          ))}
          <h4>Funding</h4>
          {SERVICE_NAMES.map((name, k) => (
            <label key={name} className="city-slider">
              <span>{name}</span>
              <input type="range" min={0} max={150} step={5} value={Math.round((hud?.funding[k] ?? 1) * 100)} onChange={e => onFunding(k as ServiceId, Number(e.target.value) / 100)} />
              <b>{Math.round((hud?.funding[k] ?? 1) * 100)}%</b>
            </label>
          ))}
        </section>
        <section>
          <h4>Last month</h4>
          <table className="city-ledger">
            <tbody>
              <tr>
                <th>Residential tax</th>
                <td>{formatMoney(last?.incomeR ?? 0)}</td>
              </tr>
              <tr>
                <th>Commercial tax</th>
                <td>{formatMoney(last?.incomeC ?? 0)}</td>
              </tr>
              <tr>
                <th>Industrial tax</th>
                <td>{formatMoney(last?.incomeI ?? 0)}</td>
              </tr>
              {SERVICE_NAMES.map((name, k) => (
                <tr key={name}>
                  <th>{name}</th>
                  <td>−{formatMoney(expenses[k] ?? 0)}</td>
                </tr>
              ))}
              <tr>
                <th>Loans</th>
                <td>−{formatMoney(last?.loanCost ?? 0)}</td>
              </tr>
              <tr className="city-ledger-net">
                <th>Net</th>
                <td>{formatMoney(last?.net ?? 0)}</td>
              </tr>
            </tbody>
          </table>
          <h4>Loans</h4>
          {(hud?.loans ?? []).map(l => (
            <div key={l.id} className="city-loan">
              <span>
                {formatMoney(l.principal)} · {formatMoney(l.balance)} left · {l.monthsLeft} mo
              </span>
              <button type="button" className="city-btn city-btn-sm" onClick={() => onRepay(l.id)} disabled={!hud || hud.funds < l.balance}>
                Repay
              </button>
            </div>
          ))}
          <div className="city-loan-actions">
            {TUNING.loanSizes.map(a => (
              <button key={a} type="button" className="city-btn city-btn-sm" onClick={() => onLoan(a)} disabled={(hud?.loans.length ?? 0) >= 3}>
                Borrow {formatMoney(a)}
              </button>
            ))}
            <small>10 years at {Math.round(TUNING.loanApr * 100)}%, up to three loans.</small>
          </div>
        </section>
      </div>
    </div>
  );
}
