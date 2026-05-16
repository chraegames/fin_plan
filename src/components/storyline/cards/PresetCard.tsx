import { Sparkline } from '../charts/Sparkline';

type PresetTone = 'positive' | 'neutral' | 'caution';

interface PresetCardProps {
  name: string;
  meta: string;
  horizon: string;
  insight: string;
  tone: PresetTone;
  values: number[];
  highlight?: boolean;
  onClick?: () => void;
}

const toneColor: Record<PresetTone, string> = {
  positive: 'var(--positive)',
  neutral: 'var(--accent)',
  caution: 'var(--caution)',
};

const toneFill: Record<PresetTone, string> = {
  positive: 'var(--positive-tint)',
  neutral: 'var(--accent-tint)',
  caution: 'var(--caution-soft)',
};

export function PresetCard({
  name,
  meta,
  horizon,
  insight,
  tone,
  values,
  highlight,
  onClick,
}: PresetCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px',
        gap: 14,
        alignItems: 'center',
        padding: '12px 14px',
        background: 'var(--bg-soft)',
        border: `1px solid ${highlight ? toneColor[tone] : 'var(--border)'}`,
        borderRadius: 11,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        color: 'inherit',
        position: 'relative',
        width: '100%',
      }}
    >
      {highlight && (
        <span
          style={{
            position: 'absolute',
            top: -8,
            right: 12,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 99,
            background: toneColor[tone],
            color: 'oklch(0.995 0.005 80)',
          }}
        >
          Closest to your case
        </span>
      )}
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: 'var(--ink)',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{meta}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{horizon}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 99,
              background: toneColor[tone],
            }}
          />
          <span style={{ fontSize: 11.5, color: toneColor[tone], fontWeight: 500 }}>{insight}</span>
        </div>
      </div>
      <div style={{ color: toneColor[tone] }}>
        <Sparkline
          values={values}
          width={120}
          height={50}
          stroke="currentColor"
          fill={toneFill[tone]}
          strokeWidth={1.6}
        />
      </div>
    </button>
  );
}
