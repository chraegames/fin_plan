import { useEffect, useId, useRef } from 'react';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { ProfilesState } from '../../models/types';

interface ExportModalProps {
  open: boolean;
  profilesState: ProfilesState;
  onClose: () => void;
  onDownload: () => void;
}

export function ExportModal({ open, profilesState, onClose, onDownload }: ExportModalProps) {
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

  const profileCount = profilesState.profiles.length;
  const scenarioCount = profilesState.profiles.reduce((sum, p) => sum + p.plans.length, 0);
  const profileNames = profilesState.profiles.map(p => p.name).join(', ');

  const handleDownload = () => {
    onDownload();
    onClose();
  };

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
          maxWidth: 480,
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
              background: 'var(--accent-soft)',
              color: 'var(--accent-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="download" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
              }}
            >
              Export your data
            </h2>
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--ink-3)',
                marginTop: 3,
              }}
            >
              Downloads a JSON snapshot of everything in the app
            </p>
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

        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
            The downloaded file contains:
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <SummaryRow
              accent="var(--accent)"
              label={`${profileCount} ${profileCount === 1 ? 'profile' : 'profiles'}`}
              detail={profileNames}
            />
            <SummaryRow
              accent="var(--accent-2)"
              label={`${scenarioCount} total ${scenarioCount === 1 ? 'scenario' : 'scenarios'}`}
              detail="across all profiles"
            />
            <SummaryRow
              accent="var(--positive)"
              label="All inputs, balances, and history"
              detail="every assumption, every actual"
            />
          </ul>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Use this file to back up your work or move it to another browser. Importing the file
            later will <strong style={{ color: 'var(--ink-2)' }}>replace everything</strong> currently in the app — there is no merge.
          </p>
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
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleDownload}
            leading={<Icon name="download" size={12} />}
          >
            Download
          </Button>
        </footer>
      </div>
    </div>
  );
}

function SummaryRow({
  accent,
  label,
  detail,
}: {
  accent: string;
  label: string;
  detail: string;
}) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        fontSize: 13,
        color: 'var(--ink-2)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: accent,
          flexShrink: 0,
          transform: 'translateY(-1px)',
        }}
      />
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {detail}</span>
    </li>
  );
}
