import { Icon, type IconName } from '../../primitives/Icon';

export type InsightTone = 'positive' | 'negative' | 'caution' | 'neutral';

interface InsightCardProps {
  tone: InsightTone;
  icon: IconName;
  title: string;
  detail: string;
  meta: string;
}

const toneBg: Record<InsightTone, string> = {
  positive: 'var(--positive-tint)',
  negative: 'var(--negative-tint)',
  caution: 'var(--caution-soft)',
  neutral: 'var(--accent-tint)',
};

const toneInk: Record<InsightTone, string> = {
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  caution: 'oklch(0.45 0.11 70)',
  neutral: 'var(--accent)',
};

export function InsightCard({ tone, icon, title, detail, meta }: InsightCardProps) {
  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 18,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 200,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: toneBg[tone],
          color: toneInk[tone],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={15} />
      </div>
      <h4
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          color: 'var(--ink)',
        }}
      >
        {title}
      </h4>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{detail}</p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 'auto',
          paddingTop: 6,
          borderTop: '1px dashed var(--border)',
        }}
      >
        <span style={{ fontSize: 11, color: toneInk[tone], fontWeight: 500 }}>{meta}</span>
      </div>
    </article>
  );
}
