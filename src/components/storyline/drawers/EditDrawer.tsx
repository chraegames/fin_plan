import { useEffect, type ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';

interface EditDrawerProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  sub?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function EditDrawer({
  open,
  onClose,
  eyebrow = 'Editing inputs',
  title,
  sub,
  children,
  footer,
}: EditDrawerProps) {
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'oklch(0.20 0.018 60 / 0.30)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'fadein 200ms ease-out',
        }}
      />
      <aside
        style={{
          position: 'relative',
          height: '100%',
          width: 620,
          maxWidth: '100vw',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-pop)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slidein 280ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <header
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--ink-muted)',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {eyebrow}
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
              }}
            >
              {title}
            </h3>
            {sub && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--ink-3)',
              border: '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {children}
        </div>

        <footer
          style={{
            padding: '14px 28px',
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--ink-3)',
            }}
          >
            <Icon name="info" size={12} />
            Updates apply immediately. Use scenarios to A/B compare.
          </div>
          {footer ?? (
            <Button variant="primary" size="md" onClick={onClose} leading={<Icon name="check" />}>
              Done
            </Button>
          )}
        </footer>
      </aside>
      <style>{`
        @keyframes slidein {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
