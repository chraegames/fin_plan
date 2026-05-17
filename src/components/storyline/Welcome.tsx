import { useState } from 'react';
import { Page } from '../layout/Page';
import { Button } from '../primitives/Button';
import { Icon, type IconName } from '../primitives/Icon';
import { MoneyInput, YearInput } from '../primitives/Input';
import { PresetCard } from './cards/PresetCard';
import { PRESET_META, type PresetKey } from '../../engine/presets';

interface WelcomeProps {
  onLoadPreset: (preset: PresetKey) => void;
  onBuild: (data: { birthYear: number; endYear: number; total: number }) => void;
  onSkip: () => void;
  onImport: () => void;
}

const CURRENT_YEAR = 2026;
const DEFAULT_BIRTH_YEAR = 1980;
const DEFAULT_END_YEAR = 2065;

export function Welcome({ onLoadPreset, onBuild, onSkip, onImport }: WelcomeProps) {
  const [birthYear, setBirthYear] = useState(DEFAULT_BIRTH_YEAR);
  const [endYear, setEndYear] = useState(DEFAULT_END_YEAR);
  const [total, setTotal] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const totalMissing = total <= 0;
  const showTotalError = showErrors && totalMissing;

  const handleBuild = () => {
    if (totalMissing) {
      setShowErrors(true);
      return;
    }
    onBuild({ birthYear, endYear, total });
  };

  const handleTotalChange = (next: number) => {
    setTotal(next);
    if (next > 0 && showErrors) setShowErrors(false);
  };

  return (
    <Page maxWidth={1080} gap={48}>
      {/* Headline band */}
      <header style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--accent-ink)',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          FIRE Planner · v0.4
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 64,
            letterSpacing: '-0.03em',
            lineHeight: 1.04,
            color: 'var(--ink)',
            margin: '0 auto',
            maxWidth: 900,
          }}
        >
          Plan your retirement,{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>in five minutes.</em>
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--ink-3)',
            lineHeight: 1.55,
            margin: '18px auto 0',
            maxWidth: 660,
          }}
        >
          Project when your savings run out under your own income, expenses, and withdrawal
          schedule. Free, educational, and entirely private to your browser.
        </p>
      </header>

      {/* Two-path band */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Try an example */}
        <article
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <header>
            <div
              style={{
                fontSize: 11,
                color: 'var(--ink-muted)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Quick start
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
                marginTop: 6,
              }}
            >
              Try an example
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>
              Three sample lives at different stages. Load one to see the app's shape, then tweak.
            </p>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PRESET_META.map(p => (
              <PresetCard
                key={p.key}
                name={p.name}
                meta={p.meta}
                horizon={p.horizon}
                tone={p.tone}
                values={p.values}
                onClick={() => onLoadPreset(p.key)}
              />
            ))}
          </div>
        </article>

        {/* Start from scratch */}
        <article
          style={{
            background: 'var(--accent-tint)',
            border: '1px solid var(--accent)',
            borderRadius: 16,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <header>
            <div
              style={{
                fontSize: 11,
                color: 'var(--accent-ink)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Your own plan
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
                marginTop: 6,
              }}
            >
              Start from scratch
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>
              Three questions to set the stage. You'll add expenses, income, and withdrawals next.
            </p>
          </header>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ScratchField step={1} prompt="What year were you born?" hint="Used for the 59½ early-withdrawal rule.">
              <YearInput value={birthYear} onChange={setBirthYear} min={1900} max={CURRENT_YEAR} width={160} />
            </ScratchField>
            <ScratchField step={2} prompt="Plan through which year?" hint="Default is age 85.">
              <YearInput value={endYear} onChange={setEndYear} min={CURRENT_YEAR + 1} max={2200} width={160} />
            </ScratchField>
            <ScratchField
              step={3}
              prompt="Total savings across all accounts"
              hint="We'll split it across cash, brokerage, and retirement next."
              required
              errorMessage={showTotalError ? 'Enter your total savings to continue.' : undefined}
            >
              <MoneyInput
                value={total}
                onChange={handleTotalChange}
                width={200}
                placeholder="e.g. 1,500,000"
                error={showTotalError}
              />
            </ScratchField>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 'auto',
              paddingTop: 4,
            }}
          >
            <button
              onClick={onSkip}
              style={{
                fontSize: 12.5,
                color: 'var(--ink-3)',
                textDecoration: 'underline dotted',
                textUnderlineOffset: 4,
              }}
            >
              Skip to advanced setup
            </button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleBuild}
              trailing={<Icon name="arrow" />}
            >
              Build my plan
            </Button>
          </div>
        </article>
      </section>

      {/* Value-prop strip */}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr auto 1fr',
          gap: 22,
          alignItems: 'center',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <ValueProp icon="spark" title="Key years marked" sub="Today, 59½, cash-depleted, plan-depleted" />
        <ValueProp icon="sparkle" title="LP-optimized withdrawals" sub="Tax-efficient schedule across accounts" />
        <ValueProp icon="calendar" title="Year-by-year ledger" sub="Full simulation transparency" />
        <span style={{ width: 1, height: 36, background: 'var(--border)' }} />
        <ValueProp icon="bank" title="Private to your browser" sub="No account, no tracking" />
      </section>

      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-muted)' }}>
        Educational tool — not financial advice.{' '}
        <button onClick={onImport} style={{ color: 'var(--ink-2)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Or import a plan
        </button>
      </div>
    </Page>
  );
}

function ScratchField({
  step,
  prompt,
  hint,
  required,
  errorMessage,
  children,
}: {
  step: number;
  prompt: string;
  hint?: string;
  required?: boolean;
  errorMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 99,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--ink-3)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11.5,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          marginTop: 6,
        }}
      >
        {step}
      </span>
      <div style={{ flex: 1 }}>
        <label
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ink-2)',
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {prompt}
          {required && (
            <span
              aria-label="required"
              style={{ color: 'var(--negative)', marginLeft: 4, fontWeight: 600 }}
            >
              *
            </span>
          )}
        </label>
        {children}
        {errorMessage ? (
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--negative)',
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </div>
        ) : (
          hint && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--ink-muted)',
                marginTop: 6,
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
              }}
            >
              {hint}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ValueProp({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--accent-tint)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={16} />
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{sub}</div>
      </div>
    </div>
  );
}
