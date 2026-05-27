import { useEffect, useId, useRef } from 'react';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'oklch(0.18 0.012 260 / 0.50)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        padding: 24,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: 'var(--shadow-pop)',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '28px 32px 22px',
            background:
              'linear-gradient(180deg, var(--accent-tint) 0%, var(--bg) 100%)',
            borderBottom: '1px solid var(--border-soft)',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 8,
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={14} />
          </button>
          <h2
            id={titleId}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            About FIRE Planner
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--ink-3)',
              marginTop: 6,
            }}
          >
            Educational long-horizon retirement projection · v0.4
          </p>
        </header>

        <div style={{ padding: '22px 32px 8px' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            A long-horizon retirement projection that models income, expenses, investment growth,
            withdrawals, and tax across a configurable horizon — all in your browser.
          </p>
        </div>

        <div
          style={{
            padding: '14px 32px 22px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
        >
          <AboutBlock title="Your data" accent="var(--positive)">
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
              Everything stays in this browser. No account, no server, no tracking. Use Export to
              download a JSON backup; clearing browser data will erase your work.
            </p>
          </AboutBlock>
          <AboutBlock title="What it models" accent="var(--accent)">
            <ul style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, paddingLeft: 16, listStyle: 'disc' }}>
              <li>US federal income tax — illustrative 2026 Married Filing Jointly brackets only, not a substitute for tax-prep software or a CPA</li>
              <li>Brokerage, Roth IRA, and Traditional IRA accounts</li>
              <li>10% early-withdrawal penalty before the year you turn 60</li>
              <li>Brokerage cost basis (gains taxed, return-of-capital is not)</li>
              <li>LP optimizer for tax-efficient withdrawal schedules</li>
            </ul>
          </AboutBlock>
          <AboutBlock title="What it skips" accent="var(--negative)">
            <ul style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, paddingLeft: 16, listStyle: 'disc' }}>
              <li>Filing statuses other than MFJ (Single, HoH, MFS)</li>
              <li>State or local income tax</li>
              <li>Social Security, pensions, RMDs, NIIT, Medicare IRMAA</li>
              <li>Roth 5-year rule or Roth conversions</li>
              <li>Inflation on income (only on expenses with the flag enabled)</li>
              <li>Sequence-of-returns or market variability</li>
            </ul>
          </AboutBlock>
          <AboutBlock title="Disclaimer" accent="var(--caution)">
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 12.5,
                color: 'var(--ink-3)',
                lineHeight: 1.55,
              }}
            >
              This is an educational tool. It is not financial, tax, or legal advice. For real
              decisions, consult a qualified professional.
            </p>
          </AboutBlock>
        </div>

        <footer
          style={{
            padding: '14px 32px',
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 12,
            color: 'var(--ink-3)',
          }}
        >
          <span>FIRE Planner · open source</span>
          <Button variant="primary" size="md" onClick={onClose} leading={<Icon name="check" />}>
            Got it
          </Button>
        </footer>
      </div>
    </div>
  );
}

function AboutBlock({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: accent }} />
        <h3
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
