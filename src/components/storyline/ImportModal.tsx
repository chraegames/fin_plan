import { useEffect, useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import { Icon, type IconName } from '../primitives/Icon';
import type { ProfilesState } from '../../models/types';

interface ImportModalProps {
  open: boolean;
  profilesState: ProfilesState;
  onClose: () => void;
  onApply: (decoded: ProfilesState) => void;
  onDownloadBackup: () => void;
}

interface ParsedFile {
  fileName: string;
  decoded: ProfilesState;
}

export function ImportModal({
  open,
  profilesState,
  onClose,
  onApply,
  onDownloadBackup,
}: ImportModalProps) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setParsed(null);
      setError('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const currentProfileCount = profilesState.profiles.length;
  const currentScenarioCount = profilesState.profiles.reduce(
    (sum, p) => sum + p.plans.length,
    0,
  );
  const currentProfileNames = profilesState.profiles.map(p => p.name).join(', ');

  const handlePickFile = () => {
    setError('');
    fileRef.current?.click();
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onerror = () => setError('Could not read the file.');
    reader.onload = () => {
      try {
        const decoded = JSON.parse(reader.result as string) as ProfilesState;
        if (!Array.isArray(decoded.profiles) || !decoded.activeProfileId) {
          setError('That file does not look like an export. Choose a fire-planner-*.json file.');
          return;
        }
        setParsed({ fileName: file.name, decoded });
      } catch {
        setError('That file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleBackup = () => {
    onDownloadBackup();
  };

  const handleOverwrite = () => {
    if (!parsed) return;
    onApply(parsed.decoded);
    onClose();
  };

  const showConfirm = parsed !== null;

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
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-pop)',
          overflow: 'hidden',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChosen}
          style={{ display: 'none' }}
        />

        {!showConfirm ? (
          <ExplainStep
            currentProfileCount={currentProfileCount}
            currentScenarioCount={currentScenarioCount}
            currentProfileNames={currentProfileNames}
            error={error}
            onClose={onClose}
            onBackup={handleBackup}
            onPickFile={handlePickFile}
          />
        ) : (
          <ConfirmStep
            parsed={parsed!}
            currentProfileCount={currentProfileCount}
            currentScenarioCount={currentScenarioCount}
            onClose={onClose}
            onBack={() => setParsed(null)}
            onOverwrite={handleOverwrite}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Step 1: Explain + pick file
// ────────────────────────────────────────────────────────────────────────

interface ExplainStepProps {
  currentProfileCount: number;
  currentScenarioCount: number;
  currentProfileNames: string;
  error: string;
  onClose: () => void;
  onBackup: () => void;
  onPickFile: () => void;
}

function ExplainStep({
  currentProfileCount,
  currentScenarioCount,
  currentProfileNames,
  error,
  onClose,
  onBackup,
  onPickFile,
}: ExplainStepProps) {
  return (
    <>
      <ModalHeader
        icon="upload"
        iconBg="var(--accent-soft)"
        iconColor="var(--accent-ink)"
        title="Import data"
        subtitle="Replaces everything in the app with a snapshot file"
        onClose={onClose}
      />

      <div style={{ padding: '20px 24px' }}>
        <CalloutBlock tone="caution">
          Importing will <strong>replace everything</strong> currently in the app — every profile,
          every scenario, every input. There is no merge. You will not be able to undo this.
        </CalloutBlock>

        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '16px 0 8px' }}>
          You currently have:
        </p>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 16,
          }}
        >
          <SummaryRow
            accent="var(--accent)"
            label={`${currentProfileCount} ${
              currentProfileCount === 1 ? 'profile' : 'profiles'
            }`}
            detail={currentProfileNames}
          />
          <SummaryRow
            accent="var(--accent-2)"
            label={`${currentScenarioCount} total ${
              currentScenarioCount === 1 ? 'scenario' : 'scenarios'
            }`}
            detail="across all profiles"
          />
        </ul>

        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Consider downloading a backup of your current data first — you can re-import it later if
          something goes wrong.
        </p>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              background: 'var(--negative-soft)',
              color: 'var(--negative)',
              borderRadius: 8,
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <footer
        style={{
          padding: '14px 24px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Button
          variant="ghost"
          size="md"
          onClick={onBackup}
          leading={<Icon name="download" size={12} />}
        >
          Download backup
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onPickFile}
            leading={<Icon name="upload" size={12} />}
          >
            Choose file
          </Button>
        </div>
      </footer>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Step 2: Confirm overwrite
// ────────────────────────────────────────────────────────────────────────

interface ConfirmStepProps {
  parsed: ParsedFile;
  currentProfileCount: number;
  currentScenarioCount: number;
  onClose: () => void;
  onBack: () => void;
  onOverwrite: () => void;
}

function ConfirmStep({
  parsed,
  currentProfileCount,
  currentScenarioCount,
  onClose,
  onBack,
  onOverwrite,
}: ConfirmStepProps) {
  const fileProfiles = parsed.decoded.profiles;
  const fileProfileCount = fileProfiles.length;
  const fileScenarioCount = fileProfiles.reduce((sum, p) => sum + p.plans.length, 0);
  const fileProfileNames = fileProfiles.map(p => p.name).join(', ');

  return (
    <>
      <ModalHeader
        icon="warning"
        iconBg="var(--negative-soft)"
        iconColor="var(--negative)"
        title="Replace all data?"
        subtitle="This cannot be undone"
        onClose={onClose}
      />

      <div style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 8px' }}>
          From file{' '}
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: 'var(--surface-2)',
              padding: '2px 6px',
              borderRadius: 5,
              color: 'var(--ink-2)',
            }}
          >
            {parsed.fileName}
          </code>
          :
        </p>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <SummaryRow
            accent="var(--positive)"
            label={`${fileProfileCount} ${fileProfileCount === 1 ? 'profile' : 'profiles'}`}
            detail={fileProfileNames || '—'}
          />
          <SummaryRow
            accent="var(--positive)"
            label={`${fileScenarioCount} total ${
              fileScenarioCount === 1 ? 'scenario' : 'scenarios'
            }`}
            detail="will load into the app"
          />
        </ul>

        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 8px' }}>
          This will <strong style={{ color: 'var(--negative)' }}>permanently replace</strong> your
          current data:
        </p>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <SummaryRow
            accent="var(--negative)"
            label={`${currentProfileCount} ${
              currentProfileCount === 1 ? 'profile' : 'profiles'
            }`}
            detail={`${currentScenarioCount} ${
              currentScenarioCount === 1 ? 'scenario' : 'scenarios'
            } — will be deleted`}
          />
        </ul>
      </div>

      <footer
        style={{
          padding: '14px 24px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Button variant="ghost" size="md" onClick={onBack} leading={<Icon name="arrowUp" size={12} />}>
          Back
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <DangerButton onClick={onOverwrite}>Overwrite all data</DangerButton>
        </div>
      </footer>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Shared bits
// ────────────────────────────────────────────────────────────────────────

interface ModalHeaderProps {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onClose: () => void;
}

function ModalHeader({ icon, iconBg, iconColor, title, subtitle, onClose }: ModalHeaderProps) {
  return (
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
          background: iconBg,
          color: iconColor,
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
      {detail && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {detail}</span>}
    </li>
  );
}

function CalloutBlock({ tone, children }: { tone: 'caution'; children: React.ReactNode }) {
  const bg = tone === 'caution' ? 'var(--caution-soft)' : 'var(--surface-2)';
  const color = tone === 'caution' ? 'var(--caution)' : 'var(--ink-2)';
  return (
    <div
      style={{
        padding: '12px 14px',
        background: bg,
        color,
        borderRadius: 10,
        fontSize: 13,
        lineHeight: 1.5,
        display: 'flex',
        gap: 10,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1 }}>
        <Icon name="warning" size={14} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function DangerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 34,
        padding: '0 14px',
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 8,
        background: hovered ? 'oklch(0.50 0.18 25)' : 'var(--negative)',
        color: 'oklch(0.995 0.005 80)',
        border: '1px solid var(--negative)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        boxShadow:
          '0 1px 0 oklch(1 0 0 / 0.2) inset, 0 1px 2px oklch(0.20 0.04 260 / 0.18)',
      }}
    >
      <Icon name="warning" size={12} />
      {children}
    </button>
  );
}
