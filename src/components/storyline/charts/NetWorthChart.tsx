import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Label,
} from 'recharts';
import type { SimulationResult } from '../../../models/types';
import { formatDollars, formatDollarsCompact } from '../../../utils/format';

export interface ChartMarker {
  year: number;
  label: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

interface NetWorthChartProps {
  results: SimulationResult;
  markers?: ChartMarker[];
  height?: number;
  /** When true, render only the net-worth line (no stacked areas). */
  lineOnly?: boolean;
}

const toneColor: Record<NonNullable<ChartMarker['tone']>, string> = {
  neutral: 'var(--chart-marker)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
};

export function NetWorthChart({
  results,
  markers = [],
  height = 360,
  lineOnly = false,
}: NetWorthChartProps) {
  const data = useMemo(
    () =>
      results.map(r => ({
        year: r.year,
        cash: Math.max(0, r.endingCash),
        brokerage: Math.max(0, r.brokerageBalance),
        ira: Math.max(0, r.iraBalance),
        roth: Math.max(0, r.rothBalance),
        netWorth: r.totalNetWorth,
      })),
    [results],
  );

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-muted)',
        }}
      >
        No data
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 12 }}>
          <defs>
            <linearGradient id="nw-line-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.10} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
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
          {!lineOnly && (
            <>
              <Area
                type="monotone"
                dataKey="cash"
                stackId="bal"
                stroke="var(--chart-bg)"
                strokeWidth={0.5}
                fill="var(--chart-cash)"
                fillOpacity={0.92}
                name="Cash"
              />
              <Area
                type="monotone"
                dataKey="brokerage"
                stackId="bal"
                stroke="var(--chart-bg)"
                strokeWidth={0.5}
                fill="var(--chart-brokerage)"
                fillOpacity={0.92}
                name="Brokerage"
              />
              <Area
                type="monotone"
                dataKey="ira"
                stackId="bal"
                stroke="var(--chart-bg)"
                strokeWidth={0.5}
                fill="var(--chart-ira)"
                fillOpacity={0.92}
                name="Traditional IRA"
              />
              <Area
                type="monotone"
                dataKey="roth"
                stackId="bal"
                stroke="var(--chart-bg)"
                strokeWidth={0.5}
                fill="var(--chart-roth)"
                fillOpacity={0.92}
                name="Roth"
              />
            </>
          )}
          {lineOnly && (
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="none"
              fill="url(#nw-line-fill)"
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="var(--chart-line)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Net worth"
          />
          {markers.map(m => (
            <ReferenceLine
              key={`${m.year}-${m.label}`}
              x={m.year}
              stroke={toneColor[m.tone ?? 'neutral']}
              strokeDasharray="3 3"
            >
              <Label
                value={m.label}
                position="top"
                fill={toneColor[m.tone ?? 'neutral']}
                fontSize={10}
                fontFamily="var(--font-sans)"
              />
            </ReferenceLine>
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
