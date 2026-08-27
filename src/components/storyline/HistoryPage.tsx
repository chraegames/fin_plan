import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PlanInput,
  ActualsData,
  AccountType,
  SimulationResult,
} from '../../models/types';
import { resolveAmount } from '../../engine/resolve';
import { formatDollars, formatDollarsCompact } from '../../utils/format';
import { Page } from '../layout/Page';
import { Footer } from './sections/Footer';
import { useIsMobile } from '../../hooks/useIsMobile';

interface HistoryPageProps {
  input: PlanInput;
  actuals: ActualsData;
  results: SimulationResult;
  onActualsChange: (actuals: ActualsData) => void;
  onAbout: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCOUNT_ROWS: Array<[AccountType, string, string]> = [
  ['brokerage', 'Brokerage', 'var(--chart-brokerage)'],
  ['roth', 'Roth', 'var(--chart-roth)'],
  ['ira', 'Traditional IRA', 'var(--chart-ira)'],
];

export function HistoryPage({ input, actuals, results, onActualsChange, onAbout }: HistoryPageProps) {
  const simStart = input.startYear;
  const maxHistoryYear = Math.min(CURRENT_YEAR, input.endYear);
  const [activeYear, setActiveYear] = useState(Math.max(simStart, maxHistoryYear));
  const isMobile = useIsMobile();
  const yearStripRef = useRef<HTMLElement>(null);
  const activeYearBtnRef = useRef<HTMLButtonElement>(null);

  // On mobile, the year nav is a horizontal strip — scroll the active year
  // into view whenever it changes so it stays visible after tap navigation.
  useEffect(() => {
    if (!isMobile) return;
    activeYearBtnRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeYear, isMobile]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = simStart; y <= maxHistoryYear; y++) arr.push(y);
    return arr;
  }, [simStart, maxHistoryYear]);

  if (years.length === 0) {
    return (
      <Page maxWidth={1280}>
        <div
          style={{
            padding: 28,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            color: 'var(--ink-3)',
            textAlign: 'center',
          }}
        >
          History tracking begins in {simStart}.
        </div>
        <Footer onAbout={onAbout} />
      </Page>
    );
  }

  const updateActual = (
    category: 'incomes' | 'expenses',
    itemId: string,
    yearKey: number,
    value: number | undefined,
  ) => {
    const catData = { ...actuals[category] };
    if (value != null) {
      catData[itemId] = { ...catData[itemId], [yearKey]: value };
    } else if (catData[itemId]) {
      const yd = { ...catData[itemId] };
      delete yd[yearKey];
      if (Object.keys(yd).length === 0) delete catData[itemId];
      else catData[itemId] = yd;
    }
    onActualsChange({ ...actuals, [category]: catData });
  };

  const updateWithdrawal = (acct: AccountType, year: number, value: number | undefined) => {
    const wd = { ...actuals.withdrawals };
    if (value != null) wd[acct] = { ...wd[acct], [year]: value };
    else if (wd[acct]) {
      const yd = { ...wd[acct] };
      delete yd[year];
      if (Object.keys(yd).length === 0) delete wd[acct];
      else wd[acct] = yd;
    }
    onActualsChange({ ...actuals, withdrawals: wd });
  };

  const updateEndingBalance = (acct: AccountType, year: number, value: number | undefined) => {
    const eb = { ...(actuals.endingBalances ?? {}) };
    if (value != null) eb[acct] = { ...eb[acct], [year]: value };
    else if (eb[acct]) {
      const yd = { ...eb[acct] };
      delete yd[year];
      if (Object.keys(yd).length === 0) delete eb[acct];
      else eb[acct] = yd;
    }
    onActualsChange({ ...actuals, endingBalances: eb });
  };

  const updateEndingCash = (year: number, value: number | undefined) => {
    const cash = { ...(actuals.endingCash ?? {}) };
    if (value != null) cash[year] = value;
    else delete cash[year];
    onActualsChange({ ...actuals, endingCash: cash });
  };

  const monthlyKey = (year: number, m: number) => year * 100 + m;
  const getMonthly = (itemId: string, year: number, m: number) =>
    actuals.expenses[itemId]?.[monthlyKey(year, m)];
  const monthlyTotal = (itemId: string, year: number): number | undefined => {
    let any = false;
    let total = 0;
    for (let m = 0; m < 12; m++) {
      const v = getMonthly(itemId, year, m);
      if (v != null) {
        any = true;
        total += v;
      }
    }
    return any ? total : undefined;
  };
  const updateMonthly = (itemId: string, year: number, m: number, v: number | undefined) =>
    updateActual('expenses', itemId, monthlyKey(year, m), v);

  const yearResult = results.find(r => r.year === activeYear);
  const projectedCashEnd = yearResult?.endingCash ?? 0;
  const projectedAcct = (acct: AccountType) =>
    acct === 'brokerage'
      ? yearResult?.brokerageBalance ?? 0
      : acct === 'roth'
        ? yearResult?.rothBalance ?? 0
        : yearResult?.iraBalance ?? 0;
  const projectedWithdrawal = (acct: AccountType): number =>
    input.withdrawals
      .filter(w => w.accountType === acct)
      .reduce((s, w) => s + resolveAmount(w.periods, activeYear), 0);

  const incomesForYear = input.incomes.filter(inc =>
    inc.periods.some(p => activeYear >= p.startYear && activeYear <= p.endYear),
  );
  const expensesForYear = input.expenses.filter(exp =>
    exp.periods.some(p => activeYear >= p.startYear && activeYear <= p.endYear),
  );

  return (
    <Page maxWidth={1280}>
      <header>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-muted)',
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          History
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 44,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: 'var(--ink)',
          }}
        >
          How was <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{activeYear}</em>?
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--ink-3)',
            lineHeight: 1.55,
            marginTop: 8,
            maxWidth: 720,
          }}
        >
          Record what actually happened to refine the projection going forward. Empty cells fall
          back to projected values; highlighted cells are entered overrides.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
          gap: isMobile ? 16 : 24,
        }}
      >
        {/* Year navigator — vertical sidebar on desktop, horizontal scrolling
            strip on mobile. Sticky offset clears AppBar (56) + ScenarioTabs
            (40) on mobile; just the AppBar on desktop. */}
        <nav
          ref={yearStripRef}
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: 6,
            alignSelf: 'flex-start',
            position: 'sticky',
            top: isMobile ? 96 : 80,
            zIndex: 5,
            ...(isMobile
              ? {
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  padding: '8px 0',
                  background: 'var(--bg)',
                  margin: '0 -16px',
                  paddingLeft: 16,
                  paddingRight: 16,
                  scrollbarWidth: 'none',
                }
              : {}),
          }}
        >
          {years.map(y => {
            const active = y === activeYear;
            // "In progress" lights up when the user has entered *any* actual
            // for that year — across all three categories (income, expense,
            // withdrawal) plus year-end balances and cash. Expenses can be
            // either annual (key === y) or monthly (key === y*100+m, so the
            // year is floor(key/100)).
            const hasData =
              actuals.endingCash?.[y] != null ||
              ACCOUNT_ROWS.some(([a]) => actuals.endingBalances?.[a]?.[y] != null) ||
              ACCOUNT_ROWS.some(([a]) => actuals.withdrawals[a]?.[y] != null) ||
              Object.values(actuals.incomes).some(map => map[y] != null) ||
              Object.values(actuals.expenses).some(map =>
                Object.keys(map).some(k => {
                  const n = Number(k);
                  return n === y || Math.floor(n / 100) === y;
                }),
              );
            return (
              <button
                key={y}
                ref={active ? activeYearBtnRef : undefined}
                onClick={() => setActiveYear(y)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-tint)' : 'var(--surface)',
                  color: 'var(--ink)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--shadow-card)' : 'none',
                  flexShrink: 0,
                  ...(isMobile ? { minWidth: 116 } : {}),
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 17,
                      fontWeight: 500,
                      color: 'var(--ink)',
                    }}
                  >
                    {y}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>
                    {hasData ? 'In progress' : 'No entries'}
                  </div>
                </div>
                {active && (
                  <span
                    style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* Year-end balances */}
          <section
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-card)',
              padding: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-muted)',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Year-end balances
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    fontWeight: 500,
                    letterSpacing: '-0.015em',
                    color: 'var(--ink)',
                    marginTop: 4,
                  }}
                >
                  {activeYear}
                </h3>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                Replaces {activeYear + 1}'s starting values
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: 14,
              }}
            >
              <BalanceCell
                color="var(--chart-cash)"
                label="Cash"
                actual={actuals.endingCash?.[activeYear]}
                projected={projectedCashEnd}
                onChange={v => updateEndingCash(activeYear, v)}
              />
              {ACCOUNT_ROWS.map(([acct, label, color]) => (
                <BalanceCell
                  key={acct}
                  color={color}
                  label={label}
                  actual={actuals.endingBalances?.[acct]?.[activeYear]}
                  projected={projectedAcct(acct)}
                  onChange={v => updateEndingBalance(acct, activeYear, v)}
                />
              ))}
            </div>
          </section>

          {/* Monthly grid */}
          <section
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-card)',
              padding: 18,
              overflowX: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-muted)',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Monthly actuals
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20,
                    fontWeight: 500,
                    letterSpacing: '-0.015em',
                    color: 'var(--ink)',
                    marginTop: 4,
                  }}
                >
                  Income · Expenses · Withdrawals
                </h3>
              </div>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <thead>
                <tr style={{ color: 'var(--ink-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Item</th>
                  {MONTH_LABELS.map(m => (
                    <th key={m} style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 500 }}>{m}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {incomesForYear.length > 0 && (
                  <GroupHeader label="Income" color="var(--positive)" />
                )}
                {incomesForYear.map(inc => (
                  <tr key={inc.id}>
                    <NameCell name={inc.name} sub={inc.type} />
                    <td colSpan={12} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>·</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                      <CellInput
                        actual={actuals.incomes[inc.id]?.[activeYear]}
                        projected={resolveAmount(inc.periods, activeYear)}
                        onChange={v => updateActual('incomes', inc.id, activeYear, v)}
                      />
                    </td>
                  </tr>
                ))}

                {expensesForYear.length > 0 && (
                  <GroupHeader label="Expenses" color="var(--negative)" />
                )}
                {expensesForYear.map(exp => {
                  const projected = resolveAmount(exp.periods, activeYear);
                  if (exp.frequency === 'monthly') {
                    const total = monthlyTotal(exp.id, activeYear);
                    return (
                      <tr key={exp.id}>
                        <NameCell name={exp.name} sub="monthly" />
                        {MONTH_LABELS.map((_, mi) => (
                          <td key={mi} style={{ padding: '4px 2px' }}>
                            <CellInput
                              compact
                              actual={getMonthly(exp.id, activeYear, mi)}
                              projected={projected}
                              onChange={v => updateMonthly(exp.id, activeYear, mi, v)}
                            />
                          </td>
                        ))}
                        <td
                          style={{
                            padding: '4px 8px',
                            textAlign: 'right',
                            color: total != null ? 'var(--ink)' : 'var(--ink-muted)',
                          }}
                        >
                          {formatDollarsCompact(total ?? projected * 12)}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={exp.id}>
                      <NameCell name={exp.name} sub="annual" />
                      <td colSpan={12} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>·</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <CellInput
                          actual={actuals.expenses[exp.id]?.[activeYear]}
                          projected={projected}
                          onChange={v => updateActual('expenses', exp.id, activeYear, v)}
                        />
                      </td>
                    </tr>
                  );
                })}

                <GroupHeader label="Withdrawals" color="var(--caution)" />
                {ACCOUNT_ROWS.map(([acct, label]) => (
                  <tr key={acct}>
                    <NameCell name={label} sub="annual" />
                    <td colSpan={12} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>·</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                      <CellInput
                        actual={actuals.withdrawals[acct]?.[activeYear]}
                        projected={projectedWithdrawal(acct)}
                        onChange={v => updateWithdrawal(acct, activeYear, v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <Footer onAbout={onAbout} />
    </Page>
  );
}

function GroupHeader({ label, color }: { label: string; color: string }) {
  return (
    <tr>
      <td
        colSpan={14}
        style={{
          padding: '12px 8px 4px',
          fontFamily: 'var(--font-sans)',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color,
        }}
      >
        {label}
      </td>
    </tr>
  );
}

function NameCell({ name, sub }: { name: string; sub: string }) {
  return (
    <td style={{ padding: '4px 8px', fontFamily: 'var(--font-sans)' }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{name}</span>
      <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginLeft: 6 }}>{sub}</span>
    </td>
  );
}

function CellInput({
  actual,
  projected,
  onChange,
  compact,
}: {
  actual: number | undefined;
  projected: number;
  onChange: (v: number | undefined) => void;
  compact?: boolean;
}) {
  const [raw, setRaw] = useState(actual != null ? String(Math.round(actual)) : '');
  const [last, setLast] = useState(actual);
  if (actual !== last) {
    setLast(actual);
    setRaw(actual != null ? String(Math.round(actual)) : '');
  }
  const entered = actual != null;
  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      placeholder={projected ? Math.round(projected).toLocaleString('en-US') : '—'}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9.-]/g, '');
        setRaw(v);
        if (v === '') onChange(undefined);
        else {
          const n = Number(v);
          if (Number.isFinite(n)) onChange(n);
        }
      }}
      onFocus={e => e.target.select()}
      style={{
        width: compact ? 56 : 100,
        height: 26,
        padding: '0 6px',
        textAlign: 'right',
        background: entered ? 'var(--accent-tint)' : 'var(--bg-soft)',
        border: `${entered ? '1.5px' : '1px'} solid ${entered ? 'var(--accent)' : 'var(--border-soft)'}`,
        boxShadow: entered ? '0 0 0 3px var(--accent-tint)' : 'none',
        borderRadius: 6,
        color: entered ? 'var(--ink)' : 'var(--ink-muted)',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 11.5,
      }}
    />
  );
}

function BalanceCell({
  color,
  label,
  actual,
  projected,
  onChange,
}: {
  color: string;
  label: string;
  actual: number | undefined;
  projected: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      </div>
      <CellInput actual={actual} projected={projected} onChange={onChange} />
      <span style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
        projected {formatDollars(projected)}
      </span>
    </div>
  );
}

