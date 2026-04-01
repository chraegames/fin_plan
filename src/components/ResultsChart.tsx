import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { SimulationResult } from '../models/types';

interface Props {
  results: SimulationResult;
}

import { formatDollarsCompact, formatDollars } from '../utils/format';

export default function ResultsChart({ results }: Props) {
  const data = results.map(r => ({
    year: r.year,
    Cash: Math.round(r.endingCash),
    Brokerage: Math.round(r.brokerageBalance),
    Retirement: Math.round(r.retirementBalance),
    'Brokerage Wd': Math.round(r.withdrawalsBrokerage),
    'Retirement Wd': Math.round(r.withdrawalsRetirement),
  }));

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      {/* Net Worth stacked area */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Net Worth</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} ticks={data.filter(d => d.year % 5 === 0).map(d => d.year)} />
          <YAxis tickFormatter={formatDollarsCompact} tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} />
          <Tooltip formatter={((value: unknown) => typeof value === 'number' ? formatDollars(value) : String(value ?? '')) as never} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#e5e7eb' }} />
          <Legend wrapperStyle={{ color: '#d1d5db' }} />
          <Area type="monotone" dataKey="Retirement" stackId="1" stroke="#22d3ee" fill="#0e7490" fillOpacity={0.7} />
          <Area type="monotone" dataKey="Brokerage" stackId="1" stroke="#4ade80" fill="#16a34a" fillOpacity={0.7} />
          <Area type="monotone" dataKey="Cash" stackId="1" stroke="#c084fc" fill="#a855f7" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Withdrawals bar chart */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-3">Annual Withdrawals</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} ticks={data.filter(d => d.year % 5 === 0).map(d => d.year)} />
          <YAxis tickFormatter={formatDollarsCompact} tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} />
          <Tooltip formatter={((value: unknown) => typeof value === 'number' ? formatDollars(value) : String(value ?? '')) as never} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#e5e7eb' }} />
          <Legend wrapperStyle={{ color: '#d1d5db' }} />
          <Bar dataKey="Brokerage Wd" stackId="wd" fill="#f59e0b" />
          <Bar dataKey="Retirement Wd" stackId="wd" fill="#ef4444" fillOpacity={0.7} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
