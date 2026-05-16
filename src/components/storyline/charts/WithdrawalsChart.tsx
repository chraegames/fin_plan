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

const SERIES = [
  { key: 'brokerage', label: 'Brokerage', color: 'var(--chart-brokerage)' },
  { key: 'ira', label: 'Traditional IRA', color: 'var(--chart-ira)' },
  { key: 'roth', label: 'Roth IRA', color: 'var(--chart-roth)' },
] as const;

interface Datum {
  year: number;
  brokerage: number;
  ira: number;
  roth: number;
}

interface TooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: Array<{ payload?: Datum }>;
}

function CustomTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload || !payload[0]?.payload) return null;
  const d = payload[0].payload;
  const total = d.brokerage + d.ira + d.roth;
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-card)',
        padding: 12,
        minWidth: 220,
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
      {SERIES.map(s => {
        const v = d[s.key];
        return (
          <div
            key={s.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 0',
              fontSize: 12,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ flex: 1, color: 'var(--ink-2)' }}>{s.label}</span>
            <span
              className="num-mono"
              style={{
                color: v > 0 ? 'var(--ink)' : 'var(--ink-muted)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {formatDollars(v)}
            </span>
          </div>
        );
      })}
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
        <span style={{ width: 10 }} />
        <span style={{ flex: 1, color: 'var(--ink)' }}>Total</span>
        <span
          className="num-mono"
          style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)' }}
        >
          {formatDollars(total)}
        </span>
      </div>
    </div>
  );
}

export function WithdrawalsChart({ results, height = 360 }: WithdrawalsChartProps) {
  const data: Datum[] = useMemo(
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
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<CustomTooltip />} />
          <Bar dataKey="brokerage" stackId="wd" fill="var(--chart-brokerage)" name="Brokerage" />
          <Bar dataKey="ira" stackId="wd" fill="var(--chart-ira)" name="Traditional IRA" />
          <Bar dataKey="roth" stackId="wd" fill="var(--chart-roth)" name="Roth IRA" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
