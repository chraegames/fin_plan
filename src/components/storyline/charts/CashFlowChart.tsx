import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult } from '../../../models/types';
import { formatDollars, formatDollarsCompact } from '../../../utils/format';

interface CashFlowChartProps {
  results: SimulationResult;
  height?: number;
}

interface Datum {
  year: number;
  income: number;
  withdrawals: number;
  expenses: number;
  tax: number;
  net: number;
}

const POSITIVES = [
  { key: 'income', label: 'Income', color: 'var(--positive)' },
  { key: 'withdrawals', label: 'Withdrawals', color: 'var(--chart-brokerage)' },
] as const;

const NEGATIVES = [
  { key: 'expenses', label: 'Expenses', color: 'var(--negative)' },
  { key: 'tax', label: 'Tax', color: 'var(--caution)' },
] as const;

interface TooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: Array<{ payload?: Datum }>;
}

function CustomTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload || !payload[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-card)',
        padding: 12,
        minWidth: 240,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 14,
          color: 'var(--ink)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {POSITIVES.map(s => (
        <Row key={s.key} color={s.color} label={s.label} value={d[s.key]} />
      ))}
      {NEGATIVES.map(s => (
        <Row key={s.key} color={s.color} label={s.label} value={-Math.abs(d[s.key])} negative />
      ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 8,
          marginTop: 6,
          borderTop: '1px dashed var(--border)',
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        <span style={{ width: 10, height: 2, background: 'var(--chart-line)' }} />
        <span style={{ flex: 1, color: 'var(--ink)' }}>Net cash flow</span>
        <span
          className="num-mono"
          style={{
            color: d.net < 0 ? 'var(--negative)' : 'var(--positive)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatDollars(d.net)}
        </span>
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
  negative,
}: {
  color: string;
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '3px 0',
        fontSize: 12,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span style={{ flex: 1, color: 'var(--ink-2)' }}>{label}</span>
      <span
        className="num-mono"
        style={{
          color: Math.abs(value) < 0.5 ? 'var(--ink-muted)' : negative ? 'var(--negative)' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {formatDollars(value)}
      </span>
    </div>
  );
}

export function CashFlowChart({ results, height = 360 }: CashFlowChartProps) {
  const data: Datum[] = useMemo(
    () =>
      results.map(r => ({
        year: r.year,
        income: r.totalIncome,
        withdrawals: r.withdrawalsBrokerage + r.withdrawalsRoth + r.withdrawalsIra,
        expenses: -r.totalExpenses,
        tax: -r.totalTax,
        net: r.netCashFlow,
      })),
    [results],
  );

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--chart-label)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            orientation="right"
            width={68}
            tickFormatter={formatDollarsCompact}
            tick={{ fill: 'var(--chart-label)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<CustomTooltip />} />
          <Bar
            dataKey="income"
            stackId="in"
            fill="var(--positive)"
            fillOpacity={0.55}
            name="Income"
          />
          <Bar
            dataKey="withdrawals"
            stackId="in"
            fill="var(--chart-brokerage)"
            fillOpacity={0.55}
            name="Withdrawals"
          />
          <Bar dataKey="expenses" stackId="out" fill="var(--negative)" fillOpacity={0.55} name="Expenses" />
          <Bar dataKey="tax" stackId="out" fill="var(--caution)" fillOpacity={0.55} name="Tax" />
          <Line
            type="monotone"
            dataKey="net"
            stroke="var(--chart-line)"
            strokeWidth={2}
            dot={false}
            name="Net cash flow"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
