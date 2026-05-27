import { useMemo } from 'react';
import type { DrawerKind } from '../../App';
import type { PlanInput, SimulationResult } from '../../models/types';
import { earlyWithdrawalCutoff } from '../../engine/constants';
import { formatDollarsCompact } from '../../utils/format';
import { Page } from '../layout/Page';
import { SectionHead } from '../layout/SectionHead';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { KPIChip } from './cards/KPIChip';
import { PendingChip } from './cards/PendingChip';
import { EmptyCard } from './cards/EmptyCard';
import { SummaryCard } from './cards/SummaryCard';
import { NetWorthChart } from './charts/NetWorthChart';
import { NextSteps, type NextStep } from './sections/NextSteps';
import { Footer } from './sections/Footer';
import { InputGroup } from './sections/InputGroup';
import { DrawerHost } from './drawers/DrawerHost';

interface PartialPlanProps {
  input: PlanInput;
  results: SimulationResult;
  drawer: DrawerKind;
  setDrawer: (kind: DrawerKind) => void;
  onInputChange: (next: PlanInput) => void;
  onAutoBalance: (targetCash: number) => void;
  onAbout: () => void;
}

export function PartialPlan({
  input,
  results,
  drawer,
  setDrawer,
  onInputChange,
  onAutoBalance,
  onAbout,
}: PartialPlanProps) {
  const total =
    input.startingCash + input.brokerageBalance + input.rothBalance + input.iraBalance;
  const isLump =
    input.startingCash === total &&
    input.brokerageBalance === 0 &&
    input.rothBalance === 0 &&
    input.iraBalance === 0;
  const needsSplit = isLump && total > 0;
  const hasExpenses = input.expenses.length > 0;
  const hasIncome = input.incomes.length > 0;
  const hasWithdrawals = input.withdrawals.some(w => w.periods.some(p => p.amount > 0));

  const penaltyCutoff = earlyWithdrawalCutoff(input.birthYear);

  const steps: NextStep[] = useMemo(
    () => [
      { num: 1, title: 'Tell us about you', sub: 'birth year, plan horizon', done: true },
      {
        num: 2,
        title: 'Total savings',
        sub: `${formatDollarsCompact(total)} entered`,
        done: total > 0,
      },
      {
        num: 3,
        title: 'Split savings by account',
        sub: 'cash, brokerage, IRA, Roth — affects tax',
        done: !needsSplit,
        cta: needsSplit ? 'Open splitter' : undefined,
        onClick: () => setDrawer('balances'),
      },
      {
        num: 4,
        title: 'Add your expenses',
        sub: 'living cost, mortgage, etc. · 2 min',
        done: hasExpenses,
        cta: hasExpenses ? undefined : 'Add expenses',
        primary: !hasExpenses,
        onClick: () => setDrawer('expenses'),
      },
      {
        num: 5,
        title: 'Add income (optional)',
        sub: 'salary, gifts, pensions',
        done: hasIncome,
        cta: 'Add income',
        onClick: () => setDrawer('income'),
      },
      {
        num: 6,
        title: 'Choose withdrawal strategy',
        sub: 'set a target cash buffer, then auto-balance',
        done: hasWithdrawals,
        cta: hasWithdrawals ? undefined : 'Set up withdrawals',
        onClick: () => setDrawer('withdrawals'),
      },
    ],
    [total, needsSplit, hasExpenses, hasIncome, hasWithdrawals, setDrawer],
  );

  const stepsDone = steps.filter(s => s.done).length;

  return (
    <Page maxWidth={1280}>
      {/* Hero */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-muted)',
              fontWeight: 600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            Plan summary · brand-new draft
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {stepsDone} of {steps.length} sections complete
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {steps.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 22,
                    height: 6,
                    borderRadius: 99,
                    background: i < stepsDone ? 'var(--accent)' : 'var(--border)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 44,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            maxWidth: 920,
            marginBottom: 12,
          }}
        >
          Setup in progress
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 720, marginBottom: 24 }}>
          {hasExpenses
            ? 'Add a withdrawal strategy to draw money out of your accounts each year.'
            : 'Add expenses to enable the forecast.'}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <KPIChip label="Total savings" value={formatDollarsCompact(total)} sub="entered" />
          <KPIChip
            label="Horizon"
            value={`${input.endYear - input.startYear + 1} yrs`}
            sub={`${input.startYear} → ${input.endYear}`}
          />
          <KPIChip label="Penalty-free" value={String(penaltyCutoff)} sub="age 60" tone="positive" />
          {!hasExpenses && <PendingChip label="Final NW" sub="needs expenses" />}
          {!hasWithdrawals && <PendingChip label="Lifetime tax" sub="needs withdrawals" />}
          <PendingChip label="Cash gap" sub="needs strategy" />
        </div>

        {/* Chart card with overlay prompt */}
        <article
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
          }}
        >
          <div style={{ opacity: 0.55, filter: 'saturate(0.7)' }}>
            <NetWorthChart results={results} height={320} />
          </div>
          {!hasExpenses && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 22,
                boxShadow: 'var(--shadow-pop)',
                maxWidth: 420,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--accent-ink)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="sparkle" size={12} /> Add expenses to enable the forecast
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Without expenses the simulation has nothing to spend, so balances just compound.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setDrawer('expenses')}
                  leading={<Icon name="plus" />}
                >
                  Add monthly expenses
                </Button>
              </div>
            </div>
          )}
        </article>
      </section>

      <NextSteps steps={steps} />

      <section>
        <SectionHead
          overline="Inputs"
          title="Your plan, so far"
          sub="Click any card to refine. Empty cards are ready when you are."
        />
        <InputGroup label="Basics">
          {needsSplit ? (
            <SummaryCard
              eyebrow="Starting balances"
              title={formatDollarsCompact(total)}
              sub="lump sum · split needed"
              rows={[
                { label: 'Total entered', value: formatDollarsCompact(total), color: 'var(--accent)' },
              ]}
              onEdit={() => setDrawer('balances')}
            >
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--caution-soft)',
                  borderRadius: 9,
                  fontSize: 11.5,
                  color: 'var(--caution)',
                  lineHeight: 1.45,
                }}
              >
                We need to know <b>how it's split</b> across cash, brokerage, IRA and Roth — tax
                behaviour changes for each.
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setDrawer('balances')}
                leading={<Icon name="edit" />}
                style={{ width: '100%' }}
              >
                Split by account
              </Button>
            </SummaryCard>
          ) : (
            <SummaryCard
              eyebrow="Starting balances"
              title={formatDollarsCompact(total)}
              sub="across 4 accounts"
              rows={[
                { label: 'Cash', value: formatDollarsCompact(input.startingCash), color: 'var(--chart-cash)' },
                {
                  label: 'Brokerage',
                  value: formatDollarsCompact(input.brokerageBalance),
                  color: 'var(--chart-brokerage)',
                },
                { label: 'Roth IRA', value: formatDollarsCompact(input.rothBalance), color: 'var(--chart-roth)' },
                { label: 'Trad IRA', value: formatDollarsCompact(input.iraBalance), color: 'var(--chart-ira)' },
              ]}
              onEdit={() => setDrawer('balances')}
            />
          )}

          <SummaryCard
            eyebrow="Returns & inflation"
            title={`${(input.returnRate * 100).toFixed(1)}% / ${(input.inflationRate * 100).toFixed(1)}%`}
            sub="defaults — adjust later"
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
                meta: `age 60 in ${penaltyCutoff}`,
                color: 'var(--ink-3)',
              },
            ]}
            onEdit={() => setDrawer('returns')}
          />
        </InputGroup>

        <InputGroup label="Cash flow">
          {hasIncome ? (
            <SummaryCard
              eyebrow="Income"
              title={`${input.incomes.length} source${input.incomes.length === 1 ? '' : 's'}`}
              rows={input.incomes.map(inc => ({
                label: inc.name,
                value: inc.type === 'taxable' ? 'taxable' : 'non-taxable',
                color: inc.type === 'non-taxable' ? 'var(--positive)' : 'var(--chart-roth)',
              }))}
              onEdit={() => setDrawer('income')}
            />
          ) : (
            <EmptyCard
              eyebrow="Income"
              title="Add a source"
              description="Salary, pension, Social Security, one-off windfalls — anything that adds cash."
              examples={['$200K/yr salary', 'Pension after 65', 'Gift / inheritance']}
              icon="trend-up"
              onAdd={() => setDrawer('income')}
            />
          )}

          {hasExpenses ? (
            <SummaryCard
              eyebrow="Expenses"
              title={`${input.expenses.length} item${input.expenses.length === 1 ? '' : 's'}`}
              rows={input.expenses.slice(0, 4).map(e => ({
                label: e.name,
                value: formatDollarsCompact(e.periods[0]?.amount ?? 0),
                meta: e.frequency === 'monthly' ? '/mo' : '/yr',
                color: 'var(--negative)',
              }))}
              onEdit={() => setDrawer('expenses')}
            />
          ) : (
            <EmptyCard
              eyebrow="Expenses"
              title="What do you spend?"
              description="Living costs, mortgage, healthcare, travel. Monthly + annual, with or without inflation."
              examples={['$10K/mo living', 'Mortgage thru 2040', '$30K/yr travel']}
              icon="trend-down"
              highlight
              onAdd={() => setDrawer('expenses')}
            />
          )}
        </InputGroup>

        <InputGroup label="Schedules & actuals">
          <EmptyCard
            eyebrow="Withdrawal strategy"
            title="Not configured"
            description="After adding expenses, set a target cash buffer and the LP optimizer will generate a withdrawal schedule across your brokerage, Roth, and IRA accounts."
            examples={['Target cash buffer', 'LP-optimized', 'Penalty-aware']}
            icon="sparkle"
            locked={!hasExpenses}
            ctaLabel="Set up withdrawals"
            onAdd={() => setDrawer('withdrawals')}
          />
        </InputGroup>
      </section>

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
