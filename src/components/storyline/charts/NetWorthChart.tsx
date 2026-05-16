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

// Display order in the tooltip (top → bottom). Matches the legend.
const SERIES = [
  { key: 'cash', label: 'Cash', color: 'var(--chart-cash)' },
  { key: 'brokerage', label: 'Brokerage', color: 'var(--chart-brokerage)' },
  { key: 'ira', label: 'Traditional IRA', color: 'var(--chart-ira)' },
  { key: 'roth', label: 'Roth IRA', color: 'var(--chart-roth)' },
] as const;

interface ChartDatum {
  year: number;
  cash: number;
  brokerage: number;
  ira: number;
  roth: number;
  netWorth: number;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: Array<{ payload?: ChartDatum }>;
  showAreas: boolean;
}

function CustomTooltip({ active, label, payload, showAreas }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

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
      {showAreas &&
        SERIES.map(s => {
          const val = datum[s.key];
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
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: 'var(--ink-2)' }}>{s.label}</span>
              <span
                className="num-mono"
                style={{
                  color: val > 0 ? 'var(--ink)' : 'var(--ink-muted)',
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {formatDollars(val)}
              </span>
            </div>
          );
        })}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: showAreas ? '8px 0 0' : '3px 0',
          marginTop: showAreas ? 6 : 0,
          borderTop: showAreas ? '1px dashed var(--border)' : 'none',
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 10,
            height: 2,
            background: 'var(--chart-line)',
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, color: 'var(--ink)' }}>Net worth</span>
        <span
          className="num-mono"
          style={{
            color: datum.netWorth < 0 ? 'var(--negative)' : 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatDollars(datum.netWorth)}
        </span>
      </div>
    </div>
  );
}

export function NetWorthChart({
  results,
  markers = [],
  height = 360,
  lineOnly = false,
}: NetWorthChartProps) {
  const data: ChartDatum[] = useMemo(
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
            content={<CustomTooltip showAreas={!lineOnly} />}
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
                name="Roth IRA"
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
