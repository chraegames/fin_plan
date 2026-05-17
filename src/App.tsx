import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from './utils/persistence';
import { AppBar } from './components/layout/AppBar';
import { ScenarioTabs } from './components/layout/ScenarioTabs';
import { Welcome } from './components/storyline/Welcome';
import { PartialPlan } from './components/storyline/PartialPlan';
import { PlanForecast } from './components/storyline/PlanForecast';
import { HistoryPage } from './components/storyline/HistoryPage';
import { AboutModal } from './components/storyline/AboutModal';
import { useTheme } from './hooks/useTheme';

type Route = 'plan' | 'history';
export type DrawerKind =
  | null
  | 'balances'
  | 'income'
  | 'expenses'
  | 'withdrawals'
  | 'returns';

export default function App() {
  const [profilesState, setProfilesState] = useState<ProfilesState>(loadProfiles);
  const [route, setRoute] = useState<Route>('plan');
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesState));
  }, [profilesState]);

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
    [],
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
    [],
  );

  const createProfile = useCallback(() => {
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
  }, []);

  const renameProfile = useCallback(
    (profileId: string, name: string) =>
      setProfilesState(prev => ({
        ...prev,
        profiles: prev.profiles.map(p => (p.id === profileId ? { ...p, name } : p)),
      })),
    [],
  );

  const deleteProfile = useCallback((profileId: string) => {
    setProfilesState(prev => {
      const remaining = prev.profiles.filter(p => p.id !== profileId);
      if (remaining.length === 0) return freshStart();
      const newActive =
        prev.activeProfileId === profileId ? remaining[0].id : prev.activeProfileId;
      return { profiles: remaining, activeProfileId: newActive };
    });
  }, []);

  const handleAutoBalance = useCallback(
    (targetCash: number) => {
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
    updateActiveProfile(profile => ({
      ...profile,
      plans: profile.plans.map(p =>
        p.id === profile.activePlanId ? { ...p, touched: true } : p,
      ),
    }));
  }, [updateActiveProfile]);

  // Export / Import
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(profilesState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fire-planner-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [profilesState]);

  const handleImport = useCallback(() => {
    setImportError('');
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setImportError('Could not read the file.');
    reader.onload = () => {
      try {
        const decoded = JSON.parse(reader.result as string) as ProfilesState;
        if (!Array.isArray(decoded.profiles) || !decoded.activeProfileId) {
          setImportError(
            'That file does not look like an export. Choose a fire-planner-*.json file.',
          );
          return;
        }
        if (
          !confirm(
            `Replace all current data with ${decoded.profiles.length} profile(s) from "${file.name}"? Your existing data will be discarded.`,
          )
        ) {
          return;
        }
        for (const profile of decoded.profiles) {
          migratePlans(profile.plans);
        }
        setProfilesState(decoded);
      } catch {
        setImportError('That file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppBar
        profilesState={profilesState}
        activeProfile={activeProfile}
        theme={theme}
        route={route}
        onToggleTheme={toggleTheme}
        onExport={handleExport}
        onImport={handleImport}
        onAbout={() => setAboutOpen(true)}
        onGoHistory={() => setRoute('history')}
        onGoPlan={() => setRoute('plan')}
        onSwitchProfile={switchProfile}
        onCreateProfile={createProfile}
        onRenameProfile={renameProfile}
        onDeleteProfile={deleteProfile}
      />
      <ScenarioTabs
        profile={activeProfile}
        activeScenario={activePlan}
        onSwitch={switchPlan}
        onCreate={createPlan}
        onRename={renamePlan}
        onDelete={deletePlan}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />
      {importError && (
        <div
          style={{
            padding: '10px 32px',
            background: 'var(--negative-soft)',
            color: 'var(--negative)',
            fontSize: 13,
          }}
        >
          {importError}
        </div>
      )}

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
          onImport={handleImport}
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
        />
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
