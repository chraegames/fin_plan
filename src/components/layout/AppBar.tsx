import { useState, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { Popover, PopoverItem, PopoverDivider, PopoverLabel } from '../primitives/Popover';
import { TextInput } from '../primitives/Input';
import { Logo } from './Logo';
import type { Profile, ProfilesState, Scenario } from '../../models/types';

interface AppBarProps {
  profilesState: ProfilesState;
  activeProfile: Profile;
  activeScenario: Scenario;
  theme: 'light' | 'dark';
  route: 'plan' | 'history';
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: () => void;
  onAbout: () => void;
  onGoHistory: () => void;
  onGoPlan: () => void;
  onSwitchPlan: (planId: string) => void;
  onCreatePlan: (name: string) => void;
  onRenamePlan: (planId: string, name: string) => void;
  onDeletePlan: (planId: string) => void;
  onSwitchProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onRenameProfile: (profileId: string, name: string) => void;
  onDeleteProfile: (profileId: string) => void;
  rightSlot?: ReactNode;
}

export function AppBar({
  profilesState,
  activeProfile,
  activeScenario,
  theme,
  route,
  onToggleTheme,
  onExport,
  onImport,
  onAbout,
  onGoHistory,
  onGoPlan,
  onSwitchPlan,
  onCreatePlan,
  onRenamePlan,
  onDeletePlan,
  onSwitchProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
  rightSlot,
}: AppBarProps) {
  const profileInitial = activeProfile.name.trim().charAt(0).toUpperCase() || '·';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 56,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border-soft)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          onClick={onGoPlan}
          style={{ display: 'flex', alignItems: 'center', gap: 9 }}
          title="Home"
        >
          <Logo />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 17,
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
            }}
          >
            FIRE Planner
          </span>
        </button>

        {/* Scenario chip with switch / new / rename / delete */}
        <ScenarioChip
          profile={activeProfile}
          activeScenario={activeScenario}
          onSwitch={onSwitchPlan}
          onCreate={onCreatePlan}
          onRename={onRenamePlan}
          onDelete={onDeletePlan}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {rightSlot}
        {route === 'history' ? (
          <Button
            variant="ghost"
            size="md"
            onClick={onGoPlan}
            leading={<Icon name="arrowUp" size={12} />}
          >
            Back to plan
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="md"
            onClick={onGoHistory}
            leading={<Icon name="calendar" />}
          >
            History
          </Button>
        )}
        <Button variant="ghost" size="md" onClick={onExport} leading={<Icon name="download" />}>
          Export
        </Button>
        <Button variant="ghost" size="md" onClick={onImport} leading={<Icon name="upload" />}>
          Import
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={onToggleTheme}
          leading={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          aria-label="Toggle theme"
        />
        <Button variant="ghost" size="md" onClick={onAbout} leading={<Icon name="info" />}>
          About
        </Button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px' }} />
        <ProfileChip
          profilesState={profilesState}
          activeProfile={activeProfile}
          initial={profileInitial}
          onSwitch={onSwitchProfile}
          onCreate={onCreateProfile}
          onRename={onRenameProfile}
          onDelete={onDeleteProfile}
        />
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Scenario chip
// ────────────────────────────────────────────────────────────────────────

interface ScenarioChipProps {
  profile: Profile;
  activeScenario: Scenario;
  onSwitch: (planId: string) => void;
  onCreate: (name: string) => void;
  onRename: (planId: string, name: string) => void;
  onDelete: (planId: string) => void;
}

function ScenarioChip({
  profile,
  activeScenario,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: ScenarioChipProps) {
  const [mode, setMode] = useState<'menu' | 'rename' | 'create'>('menu');
  const [draft, setDraft] = useState('');
  const canDelete = profile.plans.length > 1;

  return (
    <Popover
      width={260}
      align="left"
      trigger={({ toggle }) => (
        <button
          onClick={() => {
            setMode('menu');
            toggle();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 30,
            padding: '0 10px 0 12px',
            gap: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Scenario</span>
          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
            {activeScenario.name}
          </span>
          <Icon name="chevron" size={11} />
        </button>
      )}
    >
      {({ close }) => {
        if (mode === 'rename') {
          return (
            <RenameForm
              initial={activeScenario.name}
              label="Rename scenario"
              onCancel={() => setMode('menu')}
              onSubmit={name => {
                onRename(activeScenario.id, name);
                setMode('menu');
                close();
              }}
            />
          );
        }
        if (mode === 'create') {
          return (
            <RenameForm
              initial={draft || 'New scenario'}
              label="Create scenario"
              onCancel={() => setMode('menu')}
              onSubmit={name => {
                onCreate(name);
                setMode('menu');
                setDraft('');
                close();
              }}
            />
          );
        }
        return (
          <>
            <PopoverLabel>Switch to</PopoverLabel>
            {profile.plans.map(p => (
              <PopoverItem
                key={p.id}
                active={p.id === activeScenario.id}
                onClick={() => {
                  onSwitch(p.id);
                  close();
                }}
                trailing={p.id === activeScenario.id ? <Icon name="check" size={12} /> : null}
              >
                {p.name}
              </PopoverItem>
            ))}
            <PopoverDivider />
            <PopoverItem
              leading={<Icon name="edit" size={12} />}
              onClick={() => setMode('rename')}
            >
              Rename
            </PopoverItem>
            <PopoverItem
              leading={<Icon name="plus" size={12} />}
              onClick={() => setMode('create')}
            >
              New scenario
            </PopoverItem>
            {canDelete && (
              <PopoverItem
                leading={<Icon name="close" size={12} />}
                tone="danger"
                onClick={() => {
                  if (confirm(`Delete scenario "${activeScenario.name}"?`)) {
                    onDelete(activeScenario.id);
                    close();
                  }
                }}
              >
                Delete this scenario
              </PopoverItem>
            )}
          </>
        );
      }}
    </Popover>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Profile chip
// ────────────────────────────────────────────────────────────────────────

interface ProfileChipProps {
  profilesState: ProfilesState;
  activeProfile: Profile;
  initial: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function ProfileChip({
  profilesState,
  activeProfile,
  initial,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: ProfileChipProps) {
  const [mode, setMode] = useState<'menu' | 'rename'>('menu');
  const canDelete = profilesState.profiles.length > 1;
  return (
    <Popover
      width={260}
      align="right"
      trigger={({ toggle }) => (
        <button
          onClick={() => {
            setMode('menu');
            toggle();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px 0 8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            height: 32,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 99,
              background: 'var(--accent)',
              color: 'oklch(0.995 0.005 80)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
            {activeProfile.name}
          </span>
          <Icon name="chevron" size={11} />
        </button>
      )}
    >
      {({ close }) => {
        if (mode === 'rename') {
          return (
            <RenameForm
              initial={activeProfile.name}
              label="Rename profile"
              onCancel={() => setMode('menu')}
              onSubmit={name => {
                onRename(activeProfile.id, name);
                setMode('menu');
                close();
              }}
            />
          );
        }
        return (
          <>
            <PopoverLabel>Switch profile</PopoverLabel>
            {profilesState.profiles.map(p => (
              <PopoverItem
                key={p.id}
                active={p.id === activeProfile.id}
                onClick={() => {
                  onSwitch(p.id);
                  close();
                }}
                trailing={p.id === activeProfile.id ? <Icon name="check" size={12} /> : null}
              >
                {p.name}
              </PopoverItem>
            ))}
            <PopoverDivider />
            <PopoverItem
              leading={<Icon name="edit" size={12} />}
              onClick={() => setMode('rename')}
            >
              Rename
            </PopoverItem>
            <PopoverItem
              leading={<Icon name="plus" size={12} />}
              onClick={() => {
                onCreate();
                close();
              }}
            >
              New profile
            </PopoverItem>
            {canDelete && (
              <PopoverItem
                leading={<Icon name="close" size={12} />}
                tone="danger"
                onClick={() => {
                  if (confirm(`Delete profile "${activeProfile.name}" and all its scenarios?`)) {
                    onDelete(activeProfile.id);
                    close();
                  }
                }}
              >
                Delete this profile
              </PopoverItem>
            )}
          </>
        );
      }}
    </Popover>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Shared rename / create form
// ────────────────────────────────────────────────────────────────────────

interface RenameFormProps {
  initial: string;
  label: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

function RenameForm({ initial, label, onCancel, onSubmit }: RenameFormProps) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
      <PopoverLabel>{label}</PopoverLabel>
      <TextInput
        value={value}
        onChange={setValue}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) onSubmit(value.trim());
          else if (e.key === 'Escape') onCancel();
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!value.trim()}
          onClick={() => onSubmit(value.trim())}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
