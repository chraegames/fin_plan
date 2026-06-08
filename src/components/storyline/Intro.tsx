import { useEffect, useState } from 'react';
import { Page } from '../layout/Page';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { track } from '../../utils/analytics';
import { IntroHeader, IntroSections, IntroDisclaimer } from './IntroContent';

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
      <IntroHeader />

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
              borderTop: '1px solid var(--border-soft)',
            }}
          >
            <div style={{ height: 8 }} />
            <IntroSections />
          </div>
        )}
      </section>

      <IntroDisclaimer />
    </Page>
  );
}
