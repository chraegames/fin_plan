const ITEMS = [
  { key: 'cash', label: 'Cash' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'ira', label: 'Trad IRA' },
  { key: 'roth', label: 'Roth IRA' },
];

export function ChartLegend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        marginTop: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {ITEMS.map(it => (
        <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 14,
              height: 10,
              borderRadius: 3,
              background: `var(--chart-${it.key})`,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{it.label}</span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 14, height: 2, background: 'var(--chart-line)' }} />
        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Net worth</span>
      </div>
    </div>
  );
}
