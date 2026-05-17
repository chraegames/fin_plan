import { useEffect, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Icon, type IconName } from '../primitives/Icon';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Body content. Use ReactNode so callers can <strong> a name etc. */
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  /** Defaults to a warning icon. */
  icon?: IconName;
}

export function ConfirmDialog({
  open,
  title,
  subtitle = 'This cannot be undone',
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
  icon = 'warning',
}: ConfirmDialogProps) {
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
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-pop)',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '22px 24px 18px',
            borderBottom: '1px solid var(--border-soft)',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--negative-soft)',
              color: 'var(--negative)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name={icon} size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id="confirm-dialog-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 28,
              height: 28,
              borderRadius: 7,
              color: 'var(--ink-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={12} />
          </button>
        </header>

        <div
          style={{
            padding: '20px 24px',
            fontSize: 13.5,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
          }}
        >
          {message}
        </div>

        <footer
          style={{
            padding: '14px 24px',
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <Button variant="ghost" size="md" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            leading={<Icon name="warning" size={12} />}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  );
}
