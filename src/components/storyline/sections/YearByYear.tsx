import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationResult, YearResult } from '../../../models/types';
import { formatDollars } from '../../../utils/format';
import { SectionHead } from '../../layout/SectionHead';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface YearByYearProps {
  results: SimulationResult;
  birthYear: number;
  penaltyCutoff: number;
  onCashFlowClick?: (r: YearResult) => void;
}

type Filter = 'all' | 'pre60' | 'post60';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All years',
  pre60: 'Pre-60',
  post60: 'Post-60',
};

export function YearByYear({ results, birthYear, penaltyCutoff, onCashFlowClick }: YearByYearProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);

  // On mobile the table can overflow horizontally. Watch scroll position and
  // viewport width to decide whether to render a right-edge gradient hint.
  // Note: the fade only renders when isMobile && showRightFade, so we don't
  // need to reset the flag when leaving mobile — the render condition gates it.
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setShowRightFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    };
    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [isMobile, results.length]);

  const rows = useMemo(() => {
    if (filter === 'pre60') return results.filter(r => r.year < penaltyCutoff);
    if (filter === 'post60') return results.filter(r => r.year >= penaltyCutoff);
    return results;
  }, [results, filter, penaltyCutoff]);

  return (
    <section>
      <SectionHead
        overline="Year-by-year"
        title="The full ledger"
        sub="Every year of the simulation. Negative cash flow narrows your buffer; tax kicks in when withdrawals do."
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'pre60', 'post60'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 7,
                  background: filter === f ? 'var(--bg-soft)' : 'transparent',
                  color: filter === f ? 'var(--ink)' : 'var(--ink-3)',
                  border: `1px solid ${filter === f ? 'var(--border)' : 'transparent'}`,
                }}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        }
      />

      <div style={{ position: 'relative' }}>
        <div
          ref={scrollRef}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-card)',
            maxHeight: 720,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
        <table
          style={{
            width: '100%',
            minWidth: 760,
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 12.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={groupHeaderStyle()} />
              {groupHeader('Money in', 2, 'var(--positive)')}
              {groupHeader('Money out', 2, 'var(--negative)')}
              {groupHeader('Cash flow', 1)}
              {groupHeader('Balances', 5, 'var(--accent)')}
            </tr>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={subHeader({ first: true })}>Year · age</th>
              {colHeader('Income')}
              {colHeader('Withdr.')}
              {colHeader('Expenses')}
              {colHeader('Tax')}
              {colHeader('Net')}
              {colHeader('Cash')}
              {colHeader('Brokerage')}
              {colHeader('Roth')}
              {colHeader('Trad IRA')}
              {colHeader('Net worth')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const age = r.year - birthYear;
              const isPenaltyBoundary = r.year === penaltyCutoff;
              const totalWd = r.withdrawalsBrokerage + r.withdrawalsRoth + r.withdrawalsIra;
              return (
                <tr
                  key={r.year}
                  onClick={() => onCashFlowClick?.(r)}
                  style={{
                    borderTop: isPenaltyBoundary
                      ? '2px solid var(--positive)'
                      : '1px solid var(--border-soft)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                    cursor: onCashFlowClick ? 'pointer' : 'default',
                  }}
                >
                  <td style={td({ first: true })}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 500,
                        color: 'var(--ink)',
                      }}
                    >
                      {r.year}
                    </span>
                    <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--ink-muted)' }}>
                      · {age}
                    </span>
                    {isPenaltyBoundary && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 9,
                          padding: '1px 5px',
                          background: 'var(--positive-soft)',
                          color: 'var(--positive)',
                          borderRadius: 3,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        59½
                      </span>
                    )}
                  </td>
                  <td style={td({ tone: 'positive', dim: r.totalIncome === 0 })}>
                    {fmt(r.totalIncome)}
                  </td>
                  <td style={td({ tone: 'positive', dim: totalWd === 0 })}>{fmt(totalWd)}</td>
                  <td style={td({ tone: 'negative', dim: r.totalExpenses === 0 })}>
                    {fmt(r.totalExpenses)}
                  </td>
                  <td style={td({ tone: 'negative', dim: r.totalTax === 0 })}>{fmt(r.totalTax)}</td>
                  <td
                    style={td({
                      tone: r.netCashFlow >= 0 ? 'positive' : 'negative',
                      bold: true,
                    })}
                  >
                    {fmt(r.netCashFlow, true)}
                  </td>
                  <td style={td({ tone: r.endingCash < 0 ? 'negative' : 'neutral' })}>
                    {fmt(r.endingCash)}
                  </td>
                  <td style={td({})}>{fmt(r.brokerageBalance)}</td>
                  <td style={td({})}>{fmt(r.rothBalance)}</td>
                  <td style={td({})}>{fmt(r.iraBalance)}</td>
                  <td
                    style={td({
                      bold: true,
                      tone: r.totalNetWorth < 0 ? 'negative' : 'neutral',
                    })}
                  >
                    {fmt(r.totalNetWorth)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {isMobile && showRightFade && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: 36,
              pointerEvents: 'none',
              borderTopRightRadius: 14,
              borderBottomRightRadius: 14,
              background: 'linear-gradient(to right, transparent, var(--surface))',
            }}
          />
        )}
      </div>
    </section>
  );
}

function fmt(v: number, signed = false): string {
  if (Math.abs(v) < 0.5) return '·';
  const s = formatDollars(Math.abs(v));
  if (signed && v < 0) return `−${s.replace('-', '')}`;
  if (v < 0) return s;
  return s;
}

function groupHeader(label: string, span: number, color?: string) {
  return (
    <th
      colSpan={span}
      style={{
        background: 'var(--surface)',
        padding: '8px 16px 4px',
        textAlign: 'left',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: color ?? 'var(--ink-muted)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      {label}
    </th>
  );
}

function groupHeaderStyle() {
  return {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border-soft)',
  };
}

function subHeader({ first }: { first?: boolean }) {
  return {
    width: first ? 100 : undefined,
    padding: '6px 16px 10px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--ink-3)',
    fontFamily: 'var(--font-sans)',
  };
}

function colHeader(label: string) {
  return (
    <th
      style={{
        padding: '6px 16px 10px',
        textAlign: 'right',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ink-3)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {label}
    </th>
  );
}

function td({
  first,
  tone,
  bold,
  dim,
}: {
  first?: boolean;
  tone?: 'positive' | 'negative' | 'neutral';
  bold?: boolean;
  dim?: boolean;
}): React.CSSProperties {
  const color =
    dim
      ? 'var(--ink-muted)'
      : tone === 'positive'
        ? 'var(--positive)'
        : tone === 'negative'
          ? 'var(--negative)'
          : 'var(--ink)';
  return {
    padding: '10px 16px',
    textAlign: first ? 'left' : 'right',
    color,
    fontWeight: bold ? 600 : 400,
    whiteSpace: 'nowrap',
  };
}
