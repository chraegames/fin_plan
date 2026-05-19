import { useCallback, useMemo, useState } from 'react';
import { buildDefaultInput, defaultActuals, generateId } from './engine/defaults';
import { runSimulation } from './engine/simulation';
import { autoBalance } from './engine/autoBalance';
import { buildPresetInput, type PresetKey } from './engine/presets';
import type {
  PlanInput,
  ActualsData,
  WithdrawalSchedule,
  Scenario,
  Profile,
  ProfilesState,
} from './models/types';
import {
  PROFILES_KEY,
  cleanActuals,
  freshStart,
  loadProfiles,
  migratePlans,
  safeSetItem,
} from './utils/persistence';
import { AppBar } from './components/layout/AppBar';
import { ScenarioTabs } from './components/layout/ScenarioTabs';
import { Welcome } from './components/storyline/Welcome';
import { PartialPlan } from './components/storyline/PartialPlan';
import { PlanForecast } from './components/storyline/PlanForecast';
import { HistoryPage } from './components/storyline/HistoryPage';
import { AboutModal } from './components/storyline/AboutModal';
import { ExportModal } from './components/storyline/ExportModal';
import { ImportModal } from './components/storyline/ImportModal';
import { useTheme } from './hooks/useTheme';
import { track } from './utils/analytics';

type Route = 'plan' | 'history';
export type DrawerKind =
  | null
  | 'balances'
  | 'income'
  | 'expenses'
  | 'withdrawals'
  | 'returns';

export default function App() {
  const [profilesState, setProfilesStateRaw] = useState<ProfilesState>(loadProfiles);
  const [route, setRoute] = useState<Route>('plan');
  const [drawer, setDrawerState] = useState<DrawerKind>(null);
  const setDrawer = useCallback((kind: DrawerKind) => {
    if (kind !== null) track('drawer_opened', { kind });
    setDrawerState(kind);
  }, []);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveErrorDismissed, setSaveErrorDismissed] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // Persist on every update from the event-handler path rather than in an
  // effect — keeps the localStorage write paired with the state change and
  // avoids setState-in-effect cascades.
  const setProfilesState = useCallback(
    (updater: ProfilesState | ((prev: ProfilesState) => ProfilesState)) => {
      setProfilesStateRaw(prev => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: ProfilesState) => ProfilesState)(prev)
            : updater;
        const ok = safeSetItem(PROFILES_KEY, JSON.stringify(next));
        if (!ok) setSaveError(true);
        return next;
      });
    },
    [],
  );

  const activeProfile =
    profilesState.profiles.find(p => p.id === profilesState.activeProfileId) ??
    profilesState.profiles[0];
  const activePlan =
    activeProfile.plans.find(p => p.id === activeProfile.activePlanId) ??
    activeProfile.plans[0];
  const input = activePlan.input;
  const actuals = activePlan.actuals ?? defaultActuals;
  const results = useMemo(() => runSimulation(input, actuals), [input, actuals]);

  const screen: 'welcome' | 'partial' | 'forecast' = useMemo(() => {
    if (!activePlan.touched) return 'welcome';
    if (input.expenses.length === 0) return 'partial';
    return 'forecast';
  }, [activePlan.touched, input.expenses.length]);

  const updateActiveProfile = useCallback(
    (updater: (p: Profile) => Profile) =>
      setProfilesState(prev => ({
        ...prev,
        profiles: prev.profiles.map(p =>
          p.id === prev.activeProfileId ? updater(p) : p,
        ),
      })),
    [setProfilesState],
  );

  const handleInputChange = useCallback(
    (newInput: PlanInput) => {
      updateActiveProfile(profile => ({
        ...profile,
        plans: profile.plans.map(p => {
          if (p.id !== profile.activePlanId) return p;
          const cleaned = cleanActuals(newInput, p.actuals ?? defaultActuals);
          return { ...p, input: newInput, actuals: cleaned, touched: true };
        }),
      }));
    },
    [updateActiveProfile],
  );

  const handleActualsChange = useCallback(
    (newActuals: ActualsData) =>
      updateActiveProfile(profile => ({
        ...profile,
        plans: profile.plans.map(p =>
          p.id === profile.activePlanId ? { ...p, actuals: newActuals, touched: true } : p,
        ),
      })),
    [updateActiveProfile],
  );

  // --- Plan CRUD ---

  const switchPlan = useCallback(
    (planId: string) =>
      updateActiveProfile(profile => ({ ...profile, activePlanId: planId })),
    [updateActiveProfile],
  );

  const createPlan = useCallback(
    (name: string) => {
      track('plan_created');
      const newId = generateId();
      updateActiveProfile(profile => {
        const active =
          profile.plans.find(p => p.id === profile.activePlanId) ?? profile.plans[0];
        return {
          ...profile,
          plans: [
            ...profile.plans,
            {
              id: newId,
              name,
              input: structuredClone(active.input),
              actuals: structuredClone(active.actuals ?? defaultActuals),
              // Explicit creation always counts as touched, so the user
              // doesn't get bounced back to the Welcome screen when they
              // make a new scenario from the popover.
              touched: true,
            },
          ],
          activePlanId: newId,
        };
      });
    },
    [updateActiveProfile],
  );

  const renamePlan = useCallback(
    (planId: string, name: string) =>
      updateActiveProfile(profile => ({
        ...profile,
        plans: profile.plans.map(p => (p.id === planId ? { ...p, name } : p)),
      })),
    [updateActiveProfile],
  );

  const deletePlan = useCallback(
    (planId: string) => {
      updateActiveProfile(profile => {
        const remaining = profile.plans.filter(p => p.id !== planId);
        if (remaining.length === 0) {
          const id = generateId();
          const plans: Scenario[] = [
            {
              id,
              name: 'Default',
              input: buildDefaultInput(),
              actuals: { ...defaultActuals },
              touched: false,
            },
          ];
          return { ...profile, plans, activePlanId: id };
        }
        const newActive =
          profile.activePlanId === planId ? remaining[0].id : profile.activePlanId;
        return { ...profile, plans: remaining, activePlanId: newActive };
      });
    },
    [updateActiveProfile],
  );

  // --- Profile CRUD ---

  const switchProfile = useCallback(
    (profileId: string) =>
      setProfilesState(prev => ({ ...prev, activeProfileId: profileId })),
    [setProfilesState],
  );

  const createProfile = useCallback(() => {
    track('profile_created');
    const profileId = generateId();
    const planId = generateId();
    const plans: Scenario[] = [
      {
        id: planId,
        name: 'Default',
        input: buildDefaultInput(),
        actuals: { ...defaultActuals },
        touched: false,
      },
    ];
    setProfilesState(prev => ({
      profiles: [
        ...prev.profiles,
        {
          id: profileId,
          name: `Profile ${prev.profiles.length + 1}`,
          plans,
          activePlanId: planId,
        },
      ],
      activeProfileId: profileId,
    }));
  }, [setProfilesState]);

  const renameProfile = useCallback(
    (profileId: string, name: string) =>
      setProfilesState(prev => ({
        ...prev,
        profiles: prev.profiles.map(p => (p.id === profileId ? { ...p, name } : p)),
      })),
    [setProfilesState],
  );

  const deleteProfile = useCallback((profileId: string) => {
    setProfilesState(prev => {
      const remaining = prev.profiles.filter(p => p.id !== profileId);
      if (remaining.length === 0) return freshStart();
      const newActive =
        prev.activeProfileId === profileId ? remaining[0].id : prev.activeProfileId;
      return { profiles: remaining, activeProfileId: newActive };
    });
  }, [setProfilesState]);

  const handleAutoBalance = useCallback(
    (targetCash: number) => {
      track('auto_balance_run');
      updateActiveProfile(profile => {
        const active =
          profile.plans.find(p => p.id === profile.activePlanId) ?? profile.plans[0];
        const inputWithoutWithdrawals = {
          ...active.input,
          withdrawals: [] as WithdrawalSchedule[],
        };
        const schedules = autoBalance(inputWithoutWithdrawals, targetCash, active.actuals);
        return {
          ...profile,
          plans: profile.plans.map(p =>
            p.id === profile.activePlanId
              ? {
                  ...p,
                  input: { ...p.input, withdrawals: schedules, targetCash },
                  touched: true,
                }
              : p,
          ),
        };
      });
    },
    [updateActiveProfile],
  );

  const handleLoadPreset = useCallback(
    (preset: PresetKey) => {
      track('preset_loaded', { preset });
      const name =
        preset === 'coast' ? 'Coast FIRE' :
        preset === 'mid' ? 'Mid-career' : 'Approaching retirement';
      updateActiveProfile(profile => ({
        ...profile,
        plans: profile.plans.map(p => {
          if (p.id !== profile.activePlanId) return p;
          // Replace the active plan in-place — keeps the existing id so
          // anything keying off it (active selection, popovers) stays
          // consistent. migratePlans backfills the default withdrawal
          // schedules that the preset omits.
          const seeded: Scenario = {
            id: p.id,
            name,
            input: buildPresetInput(preset),
            actuals: { ...defaultActuals },
            touched: true,
          };
          migratePlans([seeded]);
          return seeded;
        }),
      }));
    },
    [updateActiveProfile],
  );

  const handleBuild = useCallback(
    ({ birthYear, endYear, total }: { birthYear: number; endYear: number; total: number }) => {
      track('plan_built');
      updateActiveProfile(profile => ({
        ...profile,
        plans: profile.plans.map(p => {
          if (p.id !== profile.activePlanId) return p;
          // Put the lump sum into starting cash; the splitter step will divide.
          const updated: PlanInput = {
            ...p.input,
            birthYear,
            endYear,
            startingCash: total,
            brokerageBalance: 0,
            brokerageBasis: 0,
            rothBalance: 0,
            iraBalance: 0,
            // Clear default expenses/incomes so the user adds their own.
            expenses: [],
            incomes: [],
          };
          return { ...p, input: updated, touched: true };
        }),
      }));
    },
    [updateActiveProfile],
  );

  const handleSkipToAdvanced = useCallback(() => {
    track('skip_to_advanced');
    updateActiveProfile(profile => ({
      ...profile,
      plans: profile.plans.map(p =>
        p.id === profile.activePlanId ? { ...p, touched: true } : p,
      ),
    }));
  }, [updateActiveProfile]);

  // Export / Import
  const downloadExport = useCallback(() => {
    track('export_downloaded');
    const blob = new Blob([JSON.stringify(profilesState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `fire-planner-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [profilesState]);

  const applyImport = useCallback((decoded: ProfilesState) => {
    track('import_applied');
    for (const profile of decoded.profiles) {
      migratePlans(profile.plans);
    }
    setProfilesState(decoded);
  }, [setProfilesState]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppBar
        profilesState={profilesState}
        activeProfile={activeProfile}
        theme={theme}
        route={route}
        onToggleTheme={toggleTheme}
        onExport={() => setExportOpen(true)}
        onImport={() => setImportOpen(true)}
        onAbout={() => setAboutOpen(true)}
        onGoHistory={() => {
          track('history_opened');
          setRoute('history');
        }}
        onGoPlan={() => setRoute('plan')}
        onSwitchProfile={switchProfile}
        onCreateProfile={createProfile}
        onRenameProfile={renameProfile}
        onDeleteProfile={deleteProfile}
      />
      {saveError && !saveErrorDismissed && (
        <div
          role="status"
          style={{
            background: 'var(--negative-tint)',
            borderBottom: '1px solid var(--negative-soft)',
            color: 'var(--ink-2)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
          }}
        >
          <span style={{ flex: 1 }}>
            Changes won't be saved to this browser — your storage is full or
            disabled. Export your plan to keep it.
          </span>
          <button
            type="button"
            onClick={() => setSaveErrorDismissed(true)}
            aria-label="Dismiss save warning"
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}
      <ScenarioTabs
        profile={activeProfile}
        activeScenario={activePlan}
        onSwitch={switchPlan}
        onCreate={createPlan}
        onRename={renamePlan}
        onDelete={deletePlan}
      />
      {route === 'history' ? (
        <HistoryPage
          input={input}
          actuals={actuals}
          results={results}
          onActualsChange={handleActualsChange}
          onAbout={() => setAboutOpen(true)}
        />
      ) : screen === 'welcome' ? (
        <Welcome
          onLoadPreset={handleLoadPreset}
          onBuild={handleBuild}
          onSkip={handleSkipToAdvanced}
          onImport={() => setImportOpen(true)}
        />
      ) : screen === 'partial' ? (
        <PartialPlan
          input={input}
          results={results}
          drawer={drawer}
          setDrawer={setDrawer}
          onInputChange={handleInputChange}
          onAutoBalance={handleAutoBalance}
          onAbout={() => setAboutOpen(true)}
        />
      ) : (
        <PlanForecast
          input={input}
          actuals={actuals}
          results={results}
          drawer={drawer}
          setDrawer={setDrawer}
          onInputChange={handleInputChange}
          onAutoBalance={handleAutoBalance}
          onAbout={() => setAboutOpen(true)}
          onGoHistory={() => {
          track('history_opened');
          setRoute('history');
        }}
        />
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ExportModal
        open={exportOpen}
        profilesState={profilesState}
        onClose={() => setExportOpen(false)}
        onDownload={downloadExport}
      />
      {importOpen && (
        <ImportModal
          profilesState={profilesState}
          onClose={() => setImportOpen(false)}
          onApply={applyImport}
          onDownloadBackup={downloadExport}
        />
      )}
    </div>
  );
}
