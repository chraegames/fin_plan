import { useEffect, useState } from 'react';
import { Page } from '../layout/Page';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { track } from '../../utils/analytics';

interface IntroProps {
  onDismiss: () => void;
}

export function Intro({ onDismiss }: IntroProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    track('intro_shown');
  }, []);

  return (
    <Page maxWidth={760} gap={32} style={{ paddingTop: 'clamp(48px, 10vw, 96px)' }}>
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
          FIRE Planner
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 'clamp(34px, 7.5vw, 64px)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            margin: 0,
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Plan your retirement,{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>in your browser.</em>
        </h1>
        <p
          style={{
            fontSize: 'clamp(14px, 2.5vw, 17px)',
            color: 'var(--ink-3)',
            lineHeight: 1.55,
            margin: '20px auto 0',
            maxWidth: 560,
          }}
        >
          Free, private, browser-only. No signup, no server — your data never leaves
          this device.
        </p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="primary"
          size="lg"
          onClick={onDismiss}
          trailing={<Icon name="arrow" />}
        >
          Get started
        </Button>
      </div>

      <section
        style={{
          background: 'var(--surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14,
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          transition: 'border-color 140ms ease',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            textAlign: 'left',
          }}
        >
          What this is
          <span
            style={{
              display: 'inline-flex',
              transform: open ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 160ms ease',
              color: 'var(--ink-3)',
            }}
          >
            <Icon name="chevron" size={14} />
          </span>
        </button>
        {open && (
          <div
            style={{
              padding: '4px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              fontSize: 13.5,
              color: 'var(--ink-2)',
              lineHeight: 1.6,
              borderTop: '1px solid var(--border-soft)',
            }}
          >
            <p style={{ margin: '12px 0 0' }}>
              <strong style={{ color: 'var(--ink)' }}>What you can do.</strong>{' '}
              Project income, expenses, investment growth, illustrative federal taxes, and
              withdrawals across a configurable horizon. Compare scenarios side-by-side,
              record actuals year by year as life happens, and let an optimizer pick a
              tax-efficient withdrawal schedule.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--ink)' }}>How it works.</strong>{' '}
              Everything runs in your browser — the simulation, the optimizer, the
              charts. There is no server-side computation. Plans persist in this browser's
              localStorage so they're here when you come back.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--ink)' }}>Your data.</strong>{' '}
              No account, no server, no tracking of personal information. Export and import
              plans as JSON files you control. Clearing your browser data erases everything
              — nothing is kept anywhere else.
            </p>
          </div>
        )}
      </section>

      <p
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--ink-muted)',
          margin: 0,
        }}
      >
        Educational tool — not financial advice.
      </p>
    </Page>
  );
}
