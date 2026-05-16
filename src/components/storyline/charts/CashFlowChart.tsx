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

export function CashFlowChart({ results, height = 360 }: CashFlowChartProps) {
  const data = useMemo(
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

  // ComposedChart accepts Bar + Line, but to keep it simple use BarChart + line via overlay.
  // Use ComposedChart so we can mix.
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
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              color: 'var(--ink)',
              boxShadow: 'var(--shadow-card)',
            }}
            labelStyle={{ color: 'var(--ink-2)', fontWeight: 500 }}
            formatter={(v, name) => [formatDollars(Math.abs(Number(v) || 0)), name]}
          />
          <Bar dataKey="income" stackId="in" fill="var(--positive)" fillOpacity={0.55} name="Income" />
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
