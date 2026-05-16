interface PendingChipProps {
  label: string;
  sub: string;
}

export function PendingChip({ label, sub }: PendingChipProps) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'transparent',
        border: '1px dashed var(--border-strong)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
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
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 400,
            color: 'var(--ink-muted)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          —
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{sub}</span>
      </div>
    </div>
  );
}
