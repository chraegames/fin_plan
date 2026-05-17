import { useState } from 'react';
import { Sparkline } from '../charts/Sparkline';

type PresetTone = 'positive' | 'neutral' | 'caution';

interface PresetCardProps {
  name: string;
  meta: string;
  horizon: string;
  tone: PresetTone;
  values: number[];
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
  tone,
  values,
  onClick,
}: PresetCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px',
        gap: 14,
        alignItems: 'center',
        padding: '12px 14px',
        background: hovered ? 'var(--surface)' : 'var(--bg-soft)',
        border: `1px solid ${hovered ? toneColor[tone] : 'var(--border)'}`,
        borderRadius: 11,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        color: 'inherit',
        position: 'relative',
        width: '100%',
        boxShadow: hovered ? 'var(--shadow-pop)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition:
          'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease',
      }}
    >
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
