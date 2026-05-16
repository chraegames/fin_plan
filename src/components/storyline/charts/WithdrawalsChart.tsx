import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult } from '../../../models/types';
import { formatDollars, formatDollarsCompact } from '../../../utils/format';

interface WithdrawalsChartProps {
  results: SimulationResult;
  height?: number;
}

export function WithdrawalsChart({ results, height = 360 }: WithdrawalsChartProps) {
  const data = useMemo(
    () =>
      results.map(r => ({
        year: r.year,
        brokerage: r.withdrawalsBrokerage,
        ira: r.withdrawalsIra,
        roth: r.withdrawalsRoth,
      })),
    [results],
  );

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 12 }}>
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
            formatter={(v, name) => [formatDollars(Number(v) || 0), name]}
          />
          <Bar dataKey="brokerage" stackId="wd" fill="var(--chart-brokerage)" name="Brokerage" />
          <Bar dataKey="ira" stackId="wd" fill="var(--chart-ira)" name="Traditional IRA" />
          <Bar dataKey="roth" stackId="wd" fill="var(--chart-roth)" name="Roth" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
