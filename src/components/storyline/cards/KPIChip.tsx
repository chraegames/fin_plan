export type ChipTone = 'neutral' | 'positive' | 'negative' | 'caution';

interface KPIChipProps {
  label: string;
  value: string;
  sub?: string;
  tone?: ChipTone;
}

const toneColor: Record<ChipTone, string> = {
  neutral: 'var(--ink)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  caution: 'var(--caution)',
};

export function KPIChip({ label, value, sub, tone = 'neutral' }: KPIChipProps) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--ink-muted)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 22,
            fontWeight: 500,
            color: toneColor[tone],
            letterSpacing: '-0.01em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{sub}</span>
        )}
      </div>
    </div>
  );
}
