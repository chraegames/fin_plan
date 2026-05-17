import { useMemo, useState } from 'react';
import type { DrawerKind } from '../../App';
import type { PlanInput, ActualsData, SimulationResult } from '../../models/types';
import { earlyWithdrawalCutoff } from '../../engine/constants';
import { deflateResults } from '../../utils/deflate';
import { formatDollarsCompact } from '../../utils/format';
import { Page } from '../layout/Page';
import { SectionHead } from '../layout/SectionHead';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { KPIChip } from './cards/KPIChip';
import { SummaryCard, type SummaryRow } from './cards/SummaryCard';
import { WithdrawalNudge } from './cards/WithdrawalNudge';
import { NetWorthChart, type ChartMarker } from './charts/NetWorthChart';
import { WithdrawalsChart } from './charts/WithdrawalsChart';
import { CashFlowChart } from './charts/CashFlowChart';
import { ChartLegend } from './sections/ChartLegend';
import { YearByYear } from './sections/YearByYear';
import { Footer } from './sections/Footer';
import { DrawerHost } from './drawers/DrawerHost';

type Tab = 'networth' | 'withdrawals' | 'cashflow';

interface PlanForecastProps {
  input: PlanInput;
  actuals: ActualsData;
  results: SimulationResult;
  drawer: DrawerKind;
  setDrawer: (kind: DrawerKind) => void;
  onInputChange: (next: PlanInput) => void;
  onAutoBalance: (targetCash: number) => void;
  onAbout: () => void;
}

export function PlanForecast({
  input,
  results,
  drawer,
  setDrawer,
  onInputChange,
  onAutoBalance,
  onAbout,
}: PlanForecastProps) {
  const [tab, setTab] = useState<Tab>('networth');
  const [realDollars, setRealDollars] = useState(false);

  const penaltyCutoff = earlyWithdrawalCutoff(input.birthYear);
  const hasWithdrawals = input.withdrawals.some(w => w.periods.some(p => p.amount > 0));

  const displayResults = useMemo(
    () => (realDollars ? deflateResults(results, input.inflationRate, input.startYear) : results),
    [results, realDollars, input.inflationRate, input.startYear],
  );

  const summary = useMemo(() => {
    if (displayResults.length === 0) return null;
    const last = displayResults[displayResults.length - 1];
    let peakNetWorth = -Infinity;
    let peakYear = last.year;
    let totalTax = 0;
    let totalInflow = 0;
    let minCash = Infinity;
    let minCashYear = last.year;
    let yearsBelowTarget = 0;
    const targetFloor = input.targetCash * 0.95;
    for (const r of displayResults) {
      totalTax += r.totalTax;
      totalInflow +=
        r.totalIncome + r.withdrawalsBrokerage + r.withdrawalsIra + r.withdrawalsRoth;
      if (r.totalNetWorth > peakNetWorth) {
        peakNetWorth = r.totalNetWorth;
        peakYear = r.year;
      }
      if (r.endingCash < minCash) {
        minCash = r.endingCash;
        minCashYear = r.year;
      }
      if (r.endingCash < targetFloor) yearsBelowTarget += 1;
    }
    const depletion = displayResults.find(r => r.totalNetWorth < 1);
    const effectiveTaxRate = totalInflow > 0 ? totalTax / totalInflow : 0;
    return {
      last,
      peakNetWorth,
      peakYear,
      totalTax,
      minCash,
      minCashYear,
      yearsBelowTarget,
      effectiveTaxRate,
      depletion,
    };
  }, [displayResults, input.targetCash]);

  const markers: ChartMarker[] = useMemo(() => {
    const m: ChartMarker[] = [{ year: input.startYear, label: 'Today', tone: 'neutral' }];
    if (penaltyCutoff >= input.startYear && penaltyCutoff <= input.endYear) {
      m.push({ year: penaltyCutoff, label: '59½ · penalty-free', tone: 'positive' });
    }
    const cashGone = displayResults.find(r => r.endingCash < 0);
    if (cashGone && cashGone.year !== summary?.depletion?.year) {
      m.push({ year: cashGone.year, label: 'Cash depleted', tone: 'negative' });
    }
    if (summary?.depletion) {
      m.push({ year: summary.depletion.year, label: 'Plan depletes', tone: 'negative' });
    }
    return m;
  }, [input.startYear, input.endYear, penaltyCutoff, summary, displayResults]);

  if (!summary) {
    return <Page><div style={{ color: 'var(--ink-muted)' }}>No simulation data yet.</div></Page>;
  }

  const {
    last,
    peakNetWorth,
    peakYear,
    minCash,
    minCashYear,
    yearsBelowTarget,
    effectiveTaxRate,
    depletion,
  } = summary;
  const horizonYears = displayResults.length;

  return (
    <Page maxWidth={1280}>
      {!hasWithdrawals && <WithdrawalNudge onSetUp={() => setDrawer('withdrawals')} />}
      <section>
        <div style={{ marginBottom: 24 }}>
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
            Forecast
          </h1>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
            {input.startYear} → {input.endYear} · {horizonYears} {horizonYears === 1 ? 'year' : 'years'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <KPIChip
            label="Peak net worth"
            value={formatDollarsCompact(peakNetWorth)}
            sub={`in ${peakYear}`}
          />
          <KPIChip
            label="Final net worth"
            value={formatDollarsCompact(last.totalNetWorth)}
            sub={depletion ? `depletes ${depletion.year}` : `by ${last.year}`}
            tone={last.totalNetWorth < 0 ? 'negative' : 'neutral'}
          />
          <KPIChip
            label="Min cash"
            value={formatDollarsCompact(minCash)}
            sub={
              yearsBelowTarget === 0
                ? 'always at target'
                : `${yearsBelowTarget} yr${yearsBelowTarget === 1 ? '' : 's'} below target · ${minCashYear}`
            }
            tone={
              minCash < 0
                ? 'negative'
                : yearsBelowTarget > 0
                  ? 'caution'
                  : 'positive'
            }
          />
          <KPIChip
            label="Penalty-free"
            value={String(penaltyCutoff)}
            sub="age 59½"
            tone="positive"
          />
          <KPIChip
            label="Effective tax"
            value={`${(effectiveTaxRate * 100).toFixed(0)}%`}
            sub={`${formatDollarsCompact(summary.totalTax)} over ${horizonYears} yrs`}
          />
        </div>

        <article
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {(
                [
                  { key: 'networth' as Tab, label: 'Net worth' },
                  { key: 'withdrawals' as Tab, label: 'Withdrawals' },
                  { key: 'cashflow' as Tab, label: 'Cash flow' },
                ]
              ).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    borderRadius: 7,
                    background: tab === t.key ? 'var(--bg-soft)' : 'transparent',
                    color: tab === t.key ? 'var(--ink)' : 'var(--ink-3)',
                    border: `1px solid ${tab === t.key ? 'var(--border)' : 'transparent'}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--ink-muted)' }}>Amounts in</span>
                <div
                  role="tablist"
                  aria-label="Dollar basis"
                  style={{
                    display: 'inline-flex',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 2,
                    gap: 2,
                  }}
                >
                  <button
                    role="tab"
                    aria-selected={!realDollars}
                    onClick={() => setRealDollars(false)}
                    style={toggleStyle(!realDollars)}
                    title={`What each future year's bank statement would say. Inflation makes the numbers grow over time${input.inflationRate > 0 ? ` (≈ ${(input.inflationRate * 100).toFixed(1)}%/yr in this plan)` : ''}.`}
                  >
                    Future $
                  </button>
                  <button
                    role="tab"
                    aria-selected={realDollars}
                    onClick={() => setRealDollars(true)}
                    disabled={input.inflationRate === 0}
                    style={{
                      ...toggleStyle(realDollars),
                      opacity: input.inflationRate === 0 ? 0.4 : 1,
                      cursor: input.inflationRate === 0 ? 'not-allowed' : 'pointer',
                    }}
                    title={
                      input.inflationRate === 0
                        ? 'Set inflation > 0% to enable — with no inflation, both views are identical.'
                        : `Future amounts shown in today's purchasing power (divided by ${(input.inflationRate * 100).toFixed(1)}%/yr inflation). Easier to compare years on the same ruler.`
                    }
                  >
                    Today's $
                  </button>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                  fontStyle: 'italic',
                  fontFamily: 'var(--font-display)',
                  whiteSpace: 'nowrap',
                }}
              >
                {realDollars && input.inflationRate > 0
                  ? `future amounts ÷ ${(input.inflationRate * 100).toFixed(1)}%/yr inflation → today's prices`
                  : input.inflationRate > 0
                    ? `each year's actual dollars (grows ${(input.inflationRate * 100).toFixed(1)}%/yr with inflation)`
                    : "each year's actual dollars"}
              </span>
            </div>
          </div>

          {tab === 'networth' && (
            <>
              <NetWorthChart results={displayResults} markers={markers} />
              <ChartLegend />
            </>
          )}
          {tab === 'withdrawals' && <WithdrawalsChart results={displayResults} />}
          {tab === 'cashflow' && <CashFlowChart results={displayResults} />}
        </article>
      </section>

      <section>
        <SectionHead
          overline="Inputs"
          title="Adjust your plan"
          sub="Each card is a live summary of one input group. Click Edit to refine in a drawer."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          <BalancesCard input={input} onEdit={() => setDrawer('balances')} />
          <IncomeCard input={input} results={displayResults} onEdit={() => setDrawer('income')} />
          <ExpensesCard input={input} results={displayResults} onEdit={() => setDrawer('expenses')} />
          <WithdrawalsCard
            input={input}
            onEdit={() => setDrawer('withdrawals')}
            onAutoBalance={() => onAutoBalance(input.targetCash)}
          />
          <ReturnsCard input={input} onEdit={() => setDrawer('returns')} />
        </div>
      </section>

      <YearByYear results={displayResults} birthYear={input.birthYear} penaltyCutoff={penaltyCutoff} />

      <Footer onAbout={onAbout} />

      <DrawerHost
        input={input}
        drawer={drawer}
        setDrawer={setDrawer}
        onInputChange={onInputChange}
        onAutoBalance={onAutoBalance}
      />
    </Page>
  );
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'oklch(0.995 0.005 80)' : 'var(--ink-3)',
    border: 'none',
    boxShadow: active
      ? '0 1px 0 oklch(1 0 0 / 0.2) inset, 0 1px 2px oklch(0.20 0.04 260 / 0.18)'
      : 'none',
    transition: 'background-color 120ms ease, color 120ms ease',
  };
}

function BalancesCard({ input, onEdit }: { input: PlanInput; onEdit: () => void }) {
  const total =
    input.startingCash + input.brokerageBalance + input.rothBalance + input.iraBalance;
  const rows: SummaryRow[] = [
    { label: 'Cash', value: formatDollarsCompact(input.startingCash), color: 'var(--chart-cash)' },
    {
      label: 'Brokerage',
      value: formatDollarsCompact(input.brokerageBalance),
      color: 'var(--chart-brokerage)',
    },
    { label: 'Roth IRA', value: formatDollarsCompact(input.rothBalance), color: 'var(--chart-roth)' },
    { label: 'Trad IRA', value: formatDollarsCompact(input.iraBalance), color: 'var(--chart-ira)' },
  ];
  return (
    <SummaryCard
      eyebrow="Starting balances"
      title={formatDollarsCompact(total)}
      sub="across 4 accounts"
      rows={rows}
      onEdit={onEdit}
    />
  );
}

function IncomeCard({
  input,
  results,
  onEdit,
}: {
  input: PlanInput;
  results: SimulationResult;
  onEdit: () => void;
}) {
  // Use the first year the simulation actually shows income for. Avoids the
  // misleading "average over the whole horizon" math and matches what the
  // chart's first year displays.
  const firstActive = results.find(r => r.totalIncome > 0);
  const headlineAmount = firstActive?.totalIncome ?? 0;
  const headlineYear = firstActive?.year ?? input.startYear;

  const rows: SummaryRow[] = input.incomes.slice(0, 4).map(inc => {
    const p0 = inc.periods[0];
    return {
      label: inc.name,
      value: p0 ? `${formatDollarsCompact(p0.amount)}/yr` : '—',
      meta: p0 ? `${p0.startYear}–${inc.periods[inc.periods.length - 1].endYear} · ${inc.type === 'non-taxable' ? 'non-taxable' : 'taxable'}` : inc.type,
      color: inc.type === 'non-taxable' ? 'var(--positive)' : 'var(--chart-roth)',
    };
  });

  const sourceCount = `${input.incomes.length} source${input.incomes.length === 1 ? '' : 's'}`;
  return (
    <SummaryCard
      eyebrow="Income"
      title={
        input.incomes.length === 0
          ? 'None'
          : headlineAmount > 0
            ? `${formatDollarsCompact(headlineAmount)}/yr`
            : 'Starts later'
      }
      sub={
        input.incomes.length === 0
          ? 'no sources yet'
          : headlineAmount > 0
            ? headlineYear === input.startYear
              ? `${sourceCount} · in ${headlineYear}`
              : `${sourceCount} · starts ${headlineYear}`
            : sourceCount
      }
      rows={rows}
      onEdit={onEdit}
    />
  );
}

function ExpensesCard({
  input,
  results,
  onEdit,
}: {
  input: PlanInput;
  results: SimulationResult;
  onEdit: () => void;
}) {
  // Headline = year-1 total spend (inflation factor = 1 in year 0, so this
  // is "what you spend right now"). Expenses defined for a future year only
  // fall back to that first active year.
  const firstActive = results.find(r => r.totalExpenses > 0);
  const headlineAmount = firstActive?.totalExpenses ?? 0;
  const headlineYear = firstActive?.year ?? input.startYear;

  const rows: SummaryRow[] = input.expenses.slice(0, 5).map(e => {
    const p0 = e.periods[0];
    const annualBase =
      p0 != null ? (e.frequency === 'monthly' ? p0.amount * 12 : p0.amount) : 0;
    return {
      label: e.name,
      value: `${formatDollarsCompact(annualBase)}/yr`,
      meta: `${e.frequency === 'monthly' ? 'mo' : 'yr'}${e.applyInflation ? ' · infl' : ''}`,
      color: 'var(--negative)',
    };
  });

  const itemCount = `${input.expenses.length} line item${input.expenses.length === 1 ? '' : 's'}`;
  return (
    <SummaryCard
      eyebrow="Expenses"
      title={
        input.expenses.length === 0
          ? 'None'
          : headlineAmount > 0
            ? `${formatDollarsCompact(headlineAmount)}/yr`
            : 'Starts later'
      }
      sub={
        input.expenses.length === 0
          ? 'no expenses yet'
          : headlineAmount > 0
            ? headlineYear === input.startYear
              ? `${itemCount} · in ${headlineYear}`
              : `${itemCount} · starts ${headlineYear}`
            : itemCount
      }
      rows={rows}
      onEdit={onEdit}
    />
  );
}

function WithdrawalsCard({
  input,
  onEdit,
  onAutoBalance,
}: {
  input: PlanInput;
  onEdit: () => void;
  onAutoBalance: () => void;
}) {
  const [flashing, setFlashing] = useState(false);
  const anyScheduled = input.withdrawals.some(w => w.periods.some(p => p.amount > 0));
  const isFirstTime = !anyScheduled || input.targetCash === 0;

  const handleClick = () => {
    if (isFirstTime) {
      // First time: route through the drawer so the user can set target cash
      // and read what the optimizer does before committing.
      onEdit();
      return;
    }
    onAutoBalance();
    setFlashing(true);
    setTimeout(() => setFlashing(false), 1600);
  };

  return (
    <SummaryCard
      eyebrow="Withdrawal strategy"
      title={anyScheduled ? 'Configured' : 'Not set up'}
      sub={anyScheduled ? `target cash ${formatDollarsCompact(input.targetCash)}` : 'optimizer ready'}
      highlight
      rows={[
        { label: 'Brokerage', value: 'taxable', color: 'var(--chart-brokerage)' },
        { label: 'Roth', value: 'tax-free', color: 'var(--chart-roth)' },
        { label: 'IRA', value: 'pre-tax', color: 'var(--chart-ira)' },
      ]}
      onEdit={onEdit}
      cta={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button
            variant="primary"
            size="md"
            onClick={handleClick}
            leading={<Icon name={flashing ? 'check' : 'sparkle'} />}
            style={{ width: '100%' }}
            disabled={flashing}
            title={
              isFirstTime
                ? 'Open the editor to set a target cash buffer and run the optimizer.'
                : 'Re-run the LP optimizer to pick a tax-efficient withdrawal schedule.'
            }
          >
            {flashing ? 'Regenerated' : isFirstTime ? 'Set up withdrawals' : 'Re-generate'}
          </Button>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-muted)',
              lineHeight: 1.4,
              textAlign: 'center',
            }}
          >
            {isFirstTime
              ? 'Choose a target cash buffer; the optimizer creates a schedule that keeps it near target.'
              : 'Rewrites the schedule for the current plan — keeps the buffer near target.'}
          </div>
        </div>
      }
    />
  );
}

function ReturnsCard({ input, onEdit }: { input: PlanInput; onEdit: () => void }) {
  const realReturn = ((1 + input.returnRate) / (1 + input.inflationRate) - 1) * 100;
  return (
    <SummaryCard
      eyebrow="Returns & inflation"
      title={`${(input.returnRate * 100).toFixed(1)}% / ${(input.inflationRate * 100).toFixed(1)}%`}
      sub={`real return ${realReturn.toFixed(1)}%`}
      rows={[
        { label: 'Annual return', value: `${(input.returnRate * 100).toFixed(1)}%`, color: 'var(--positive)' },
        { label: 'Inflation', value: `${(input.inflationRate * 100).toFixed(1)}%`, color: 'var(--ink-3)' },
        {
          label: 'Horizon',
          value: `${input.startYear} → ${input.endYear}`,
          meta: `${input.endYear - input.startYear + 1} yrs`,
          color: 'var(--ink-3)',
        },
        {
          label: 'Birth year',
          value: String(input.birthYear),
          meta: `59½ in ${earlyWithdrawalCutoff(input.birthYear)}`,
          color: 'var(--ink-3)',
        },
      ]}
      onEdit={onEdit}
    />
  );
}
