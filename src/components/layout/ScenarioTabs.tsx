import { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../primitives/Icon';
import { Popover, PopoverItem, PopoverDivider, PopoverLabel } from '../primitives/Popover';
import { NameForm } from './NameForm';
import { ConfirmDialog } from '../storyline/ConfirmDialog';
import type { Profile, Scenario } from '../../models/types';

interface ScenarioTabsProps {
  profile: Profile;
  activeScenario: Scenario;
  onSwitch: (planId: string) => void;
  onCreate: (name: string) => void;
  onRename: (planId: string, name: string) => void;
  onDelete: (planId: string) => void;
}

export function ScenarioTabs({
  profile,
  activeScenario,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: ScenarioTabsProps) {
  const canDelete = profile.plans.length > 1;
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const overflows = el.scrollWidth - el.clientWidth - el.scrollLeft > 4;
      setShowRightFade(overflows);
    };
    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [profile.plans.length]);

  // Keep the active scenario tab visible whenever it changes (new
  // scenario creation, tap on a partially-clipped tab, profile
  // switch). `inline: 'nearest'` is a no-op when the tab is already
  // fully visible, so this is safe to fire on desktop too.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      inline: 'nearest',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [activeScenario.id]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 clamp(12px, 3vw, 32px)',
        height: 40,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border-soft)',
        position: 'sticky',
        top: 56,
        zIndex: 25,
      }}
    >
      <ScenariosLabel profileName={profile.name} />

      <NewScenarioTrigger onCreate={onCreate} />

      <div
        aria-hidden
        style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }}
      />

      <div
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          height: '100%',
        }}
      >
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
          }}
        >
          {profile.plans.map(p => {
            const isActive = p.id === activeScenario.id;
            return (
              <ScenarioTab
                key={p.id}
                ref={isActive ? activeTabRef : undefined}
                scenario={p}
                isActive={isActive}
                canDelete={canDelete}
                onSwitch={() => onSwitch(p.id)}
                onRename={name => onRename(p.id, name)}
                onDelete={() => onDelete(p.id)}
              />
            );
          })}
        </div>
        {showRightFade && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: 32,
              pointerEvents: 'none',
              background: 'linear-gradient(to right, transparent, var(--bg))',
            }}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Individual tab
// ────────────────────────────────────────────────────────────────────────

interface ScenarioTabProps {
  scenario: Scenario;
  isActive: boolean;
  canDelete: boolean;
  onSwitch: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

const ScenarioTab = forwardRef<HTMLDivElement, ScenarioTabProps>(function ScenarioTab(
  { scenario, isActive, canDelete, onSwitch, onRename, onDelete },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const showMenuTrigger = isActive || hovered;

  const tabBg = isActive
    ? 'var(--accent-tint)'
    : hovered
      ? 'var(--surface-2)'
      : 'transparent';
  const tabColor = isActive
    ? 'var(--accent-ink)'
    : hovered
      ? 'var(--ink)'
      : 'var(--ink-3)';

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 28,
        padding: '0 4px 0 12px',
        gap: 2,
        background: tabBg,
        borderRadius: 7,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onSwitch}
        style={{
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          color: tabColor,
          background: 'transparent',
          border: 'none',
          padding: '0 4px 0 0',
          cursor: 'pointer',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {scenario.name}
      </button>
      <ScenarioTabMenu
        scenarioName={scenario.name}
        canDelete={canDelete}
        visible={showMenuTrigger}
        onRename={onRename}
        onDelete={onDelete}
      />
    </div>
  );
});

// ────────────────────────────────────────────────────────────────────────
// Per-tab "⋯" menu
// ────────────────────────────────────────────────────────────────────────

interface ScenarioTabMenuProps {
  scenarioName: string;
  canDelete: boolean;
  visible: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function ScenarioTabMenu({
  scenarioName,
  canDelete,
  visible,
  onRename,
  onDelete,
}: ScenarioTabMenuProps) {
  const [mode, setMode] = useState<'menu' | 'rename'>('menu');
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
    <Popover
      width={200}
      align="left"
      trigger={({ toggle }) => (
        <button
            onClick={() => {
              setMode('menu');
              toggle();
            }}
            aria-label={`Scenario actions for ${scenarioName}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: 5,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              opacity: visible ? 1 : 0,
              transition: 'opacity 120ms',
              fontSize: 14,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            ⋯
          </button>
      )}
    >
      {({ close }) => {
        if (mode === 'rename') {
          return (
            <NameForm
              initial={scenarioName}
              label="Rename scenario"
              onCancel={() => setMode('menu')}
              onSubmit={name => {
                onRename(name);
                setMode('menu');
                close();
              }}
            />
          );
        }
        return (
          <>
            <PopoverItem
              leading={<Icon name="edit" size={12} />}
              onClick={() => setMode('rename')}
            >
              Rename
            </PopoverItem>
            {canDelete && (
              <>
                <PopoverDivider />
                <PopoverItem
                  leading={<Icon name="close" size={12} />}
                  tone="danger"
                  onClick={() => {
                    close();
                    setConfirmOpen(true);
                  }}
                >
                  Delete scenario
                </PopoverItem>
              </>
            )}
          </>
        );
      }}
    </Popover>
    <ConfirmDialog
      open={confirmOpen}
      title="Delete scenario?"
      message={
        <>
          This permanently deletes <strong>"{scenarioName}"</strong> — including its inputs, history,
          and withdrawal schedule.
        </>
      }
      confirmLabel="Delete scenario"
      onClose={() => setConfirmOpen(false)}
      onConfirm={() => {
        onDelete();
        setConfirmOpen(false);
      }}
    />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// "+ New" trigger — sits to the left of the tab scroller, styled as a
// sibling of a tab so it reads as part of the strip's chrome.
// ────────────────────────────────────────────────────────────────────────

interface NewScenarioTriggerProps {
  onCreate: (name: string) => void;
}

function NewScenarioTrigger({ onCreate }: NewScenarioTriggerProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ flexShrink: 0 }}>
      <Popover
        width={240}
        align="left"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 28,
              padding: '0 10px 0 8px',
              borderRadius: 7,
              border: 'none',
              background: hovered ? 'var(--surface-2)' : 'transparent',
              color: hovered ? 'var(--ink)' : 'var(--ink-muted)',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <Icon name="plus" size={11} />
            New
          </button>
        )}
      >
        {({ close }) => (
          <>
            <PopoverLabel>Create scenario</PopoverLabel>
            <NameForm
              initial="New scenario"
              label="Name"
              onCancel={close}
              onSubmit={name => {
                onCreate(name);
                close();
              }}
            />
          </>
        )}
      </Popover>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Leading "Scenarios ⓘ" label with a custom hover tooltip
// ────────────────────────────────────────────────────────────────────────

function ScenariosLabel({ profileName }: { profileName: string }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!hovered || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left });
  }, [hovered]);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          cursor: 'help',
          flexShrink: 0,
        }}
      >
        Scenarios
        <Icon name="info" size={11} />
      </span>
      {hovered && pos &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: 280,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              boxShadow: 'var(--shadow-pop)',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            Each scenario under <strong>{profileName}'s</strong> profile keeps its own inputs and
            history. Switching tabs replaces every number on the page.
          </div>,
          document.body,
        )}
    </>
  );
}
