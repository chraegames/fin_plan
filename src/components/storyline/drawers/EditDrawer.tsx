import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

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
  const isMobile = useIsMobile();
  const dialogRef = useRef<HTMLElement>(null);
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: isMobile ? 'stretch' : 'flex-end',
        alignItems: isMobile ? 'flex-end' : 'stretch',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'oklch(0.18 0.012 260 / 0.30)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'fadein 200ms ease-out',
        }}
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: 'relative',
          height: isMobile ? '85vh' : '100%',
          maxHeight: isMobile ? '85vh' : undefined,
          width: isMobile ? '100%' : 620,
          maxWidth: '100vw',
          background: 'var(--bg)',
          borderLeft: isMobile ? 'none' : '1px solid var(--border)',
          borderTop: isMobile ? '1px solid var(--border)' : 'none',
          borderTopLeftRadius: isMobile ? 14 : 0,
          borderTopRightRadius: isMobile ? 14 : 0,
          boxShadow: 'var(--shadow-pop)',
          display: 'flex',
          flexDirection: 'column',
          animation: isMobile ? 'slideup 280ms ease-out' : 'slidein 280ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {isMobile && (
          <div
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 99,
              background: 'var(--border-strong)',
              margin: '8px auto 0',
              flexShrink: 0,
            }}
          />
        )}
        <header
          style={{
            padding: isMobile ? '14px 20px' : '22px 28px',
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
              id={titleId}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: isMobile ? 22 : 28,
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
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '16px 20px' : '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {children}
        </div>

        <footer
          style={{
            padding: isMobile ? '12px 20px' : '14px 28px',
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {!isMobile && (
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
          )}
          {footer ?? (
            <Button
              variant="primary"
              size="md"
              onClick={onClose}
              leading={<Icon name="check" />}
              style={isMobile ? { marginLeft: 'auto' } : undefined}
            >
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
        @keyframes slideup {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
