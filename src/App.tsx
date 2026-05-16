import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildDefaultInput, defaultActuals, generateId } from './engine/defaults';
import { runSimulation } from './engine/simulation';
import { autoBalance } from './engine/autoBalance';
import { earlyWithdrawalCutoff } from './engine/constants';
import { buildPresetInput, type PresetKey } from './engine/presets';
import type {
  PlanInput,
  ActualsData,
  WithdrawalSchedule,
  Scenario,
  Profile,
  ProfilesState,
} from './models/types';
import { AppBar } from './components/layout/AppBar';
import { Welcome } from './components/storyline/Welcome';
import { PartialPlan } from './components/storyline/PartialPlan';
import { PlanForecast } from './components/storyline/PlanForecast';
import { HistoryPage } from './components/storyline/HistoryPage';
import { AboutModal } from './components/storyline/AboutModal';
import { useTheme } from './hooks/useTheme';

const PROFILES_KEY = 'financial-planner-profiles';
const OLD_SCENARIOS_KEY = 'financial-planner-scenarios';
const OLD_INPUT_KEY = 'financial-planner-input';
const OLD_PLANS_KEY = 'financial-planner-plans';

interface OldScenariosState {
  plans: Scenario[];
  activePlanId: string;
}

interface LegacyPlanInput {
  brokerageReturnRate?: number;
  retirementReturnRate?: number;
  retirementBalance?: number;
  rothBalance?: number;
  iraBalance?: number;
}

function migratePlans(plans: Scenario[]): Scenario[] {
  for (const plan of plans) {
    if (plan.input.inflationRate == null) plan.input.inflationRate = 0.03;
    if (plan.input.targetCash == null) plan.input.targetCash = 200000;
    if (plan.input.startYear == null) plan.input.startYear = 2026;
    if (plan.input.endYear == null) plan.input.endYear = 2065;
    if (plan.input.birthYear == null) plan.input.birthYear = 1985;
    if (plan.input.brokerageBasis == null)
      plan.input.brokerageBasis = plan.input.brokerageBalance ?? 0;
    if (plan.input.returnRate == null) {
      const old = plan.input as PlanInput & LegacyPlanInput;
      plan.input.returnRate = old.brokerageReturnRate ?? old.retirementReturnRate ?? 0.07;
      delete old.brokerageReturnRate;
      delete old.retirementReturnRate;
    }
    if (!plan.actuals)
      plan.actuals = {
        incomes: {},
        expenses: {},
        withdrawals: { brokerage: {}, roth: {}, ira: {} },
        endingBalances: { brokerage: {}, roth: {}, ira: {} },
        endingCash: {},
      };
    if (!plan.actuals.endingBalances)
      plan.actuals.endingBalances = { brokerage: {}, roth: {}, ira: {} };
    if (!plan.actuals.endingCash) plan.actuals.endingCash = {};
    for (const exp of plan.input.expenses) {
      if (exp.applyInflation == null) exp.applyInflation = true;
    }
    const inp = plan.input as PlanInput & LegacyPlanInput;
    if (inp.retirementBalance != null && inp.rothBalance == null) {
      inp.rothBalance = Math.round(inp.retirementBalance / 2);
      inp.iraBalance = inp.retirementBalance - inp.rothBalance;
      delete inp.retirementBalance;
    }
    for (const wd of plan.input.withdrawals) {
      if ((wd.accountType as string) === 'retirement') {
        (wd as WithdrawalSchedule).accountType = 'ira';
      }
    }
    const accountTypes: Array<'brokerage' | 'roth' | 'ira'> = ['brokerage', 'roth', 'ira'];
    const defaultWithdrawalStart = Math.max(
      plan.input.startYear,
      earlyWithdrawalCutoff(plan.input.birthYear),
    );
    for (const accountType of accountTypes) {
      if (!plan.input.withdrawals.some(w => w.accountType === accountType)) {
        plan.input.withdrawals.push({
          id: generateId(),
          accountType,
          periods: [
            {
              startYear: defaultWithdrawalStart,
              endYear: plan.input.endYear,
              amount: 0,
            },
          ],
        });
      }
    }
    const wdActuals = plan.actuals.withdrawals;
    const accountTypeKeySet = new Set(['brokerage', 'roth', 'ira']);
    const oldKeys = Object.keys(wdActuals).filter(k => !accountTypeKeySet.has(k));
    if (oldKeys.length > 0) {
      const migrated: Record<string, Record<number, number>> = {
        brokerage: { ...wdActuals.brokerage },
        roth: { ...wdActuals.roth },
        ira: { ...wdActuals.ira },
      };
      for (const oldKey of oldKeys) {
        const schedule = plan.input.withdrawals.find(w => w.id === oldKey);
        if (!schedule) continue;
        const target = migrated[schedule.accountType];
        for (const [yearStr, val] of Object.entries(
          wdActuals[oldKey as keyof typeof wdActuals] ?? {},
        )) {
          const year = Number(yearStr);
          target[year] = (target[year] ?? 0) + val;
        }
      }
      plan.actuals.withdrawals = migrated as typeof plan.actuals.withdrawals;
    }
    // Pre-existing plans are assumed touched (skip Welcome).
    if (plan.touched == null) plan.touched = true;
  }
  return plans;
}

function cleanActuals(input: PlanInput, actuals: ActualsData): ActualsData {
  const START = input.startYear;
  const clean = (
    items: { id: string; periods: { startYear: number; endYear: number }[] }[],
    data: Record<string, Record<number, number>>,
  ): Record<string, Record<number, number>> => {
    const result: Record<string, Record<number, number>> = {};
    const itemIds = new Set(items.map(i => i.id));
    for (const [id, yearMap] of Object.entries(data)) {
      if (!itemIds.has(id)) continue;
      const item = items.find(i => i.id === id)!;
      const cleaned: Record<number, number> = {};
      for (const [keyStr, val] of Object.entries(yearMap)) {
        const key = Number(keyStr);
        const year = key > 9999 ? Math.floor(key / 100) : key;
        if (item.periods.some(p => year >= p.startYear && year <= p.endYear)) {
          cleaned[key] = val;
        }
      }
      if (Object.keys(cleaned).length > 0) result[id] = cleaned;
    }
    return result;
  };
  const currentYear = new Date().getFullYear();
  const cleanedWithdrawals: typeof actuals.withdrawals = {};
  for (const acctType of ['brokerage', 'roth', 'ira'] as const) {
    const yearMap = actuals.withdrawals[acctType];
    if (!yearMap) continue;
    const cleaned: Record<number, number> = {};
    for (const [yearStr, val] of Object.entries(yearMap)) {
      const year = Number(yearStr);
      if (year >= START && year <= currentYear) cleaned[year] = val;
    }
    if (Object.keys(cleaned).length > 0) cleanedWithdrawals[acctType] = cleaned;
  }
  const cleanedEndingBalances: NonNullable<ActualsData['endingBalances']> = {};
  for (const acctType of ['brokerage', 'roth', 'ira'] as const) {
    const yearMap = actuals.endingBalances?.[acctType];
    if (!yearMap) continue;
    const cleaned: Record<number, number> = {};
    for (const [yearStr, val] of Object.entries(yearMap)) {
      const year = Number(yearStr);
      if (year >= START && year <= currentYear) cleaned[year] = val;
    }
    if (Object.keys(cleaned).length > 0) cleanedEndingBalances[acctType] = cleaned;
  }
  const cleanedEndingCash: Record<number, number> = {};
  for (const [yearStr, val] of Object.entries(actuals.endingCash ?? {})) {
    const year = Number(yearStr);
    if (year >= START && year <= currentYear) cleanedEndingCash[year] = val;
  }
  return {
    incomes: clean(input.incomes, actuals.incomes),
    expenses: clean(input.expenses, actuals.expenses),
    withdrawals: cleanedWithdrawals,
    endingBalances: cleanedEndingBalances,
    endingCash: cleanedEndingCash,
  };
}

function freshStart(): ProfilesState {
  const planId = generateId();
  const profileId = generateId();
  // Fresh start = untouched plan → user lands on Welcome.
  const plans: Scenario[] = [
    {
      id: planId,
      name: 'Default',
      input: buildDefaultInput(),
      actuals: { ...defaultActuals },
      touched: false,
    },
  ];
  // Skip migratePlans' touched-fill so the flag stays false.
  return {
    profiles: [{ id: profileId, name: 'Default', plans, activePlanId: planId }],
    activeProfileId: profileId,
  };
}

function loadProfiles(): ProfilesState {
  try {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ProfilesState;
      if (parsed.profiles.length > 0) {
        for (const profile of parsed.profiles) {
          migratePlans(profile.plans);
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  try {
    const oldScenarios = localStorage.getItem(OLD_SCENARIOS_KEY);
    if (oldScenarios) {
      const parsed = JSON.parse(oldScenarios) as OldScenariosState;
      if (parsed.plans.length > 0) {
        migratePlans(parsed.plans);
        const profileId = generateId();
        localStorage.removeItem(OLD_SCENARIOS_KEY);
        return {
          profiles: [
            {
              id: profileId,
              name: 'Default',
              plans: parsed.plans,
              activePlanId: parsed.activePlanId,
            },
          ],
          activeProfileId: profileId,
        };
      }
    }
  } catch {
    // ignore
  }

  try {
    const oldInput = localStorage.getItem(OLD_INPUT_KEY);
    const oldPlans = localStorage.getItem(OLD_PLANS_KEY);
    if (oldInput) {
      const input = JSON.parse(oldInput) as PlanInput;
      const plans: Scenario[] = [];
      if (oldPlans) {
        const parsed = JSON.parse(oldPlans) as {
          plans: { id: string; name: string; schedules: WithdrawalSchedule[] }[];
          activePlanId: string | null;
        };
        for (const p of parsed.plans) {
          plans.push({
            id: p.id,
            name: p.name,
            input: { ...input, withdrawals: p.schedules },
            actuals: { ...defaultActuals },
          });
        }
      }
      if (plans.length === 0) {
        const id = generateId();
        plans.push({ id, name: 'Default', input, actuals: { ...defaultActuals } });
      }
      migratePlans(plans);
      localStorage.removeItem(OLD_INPUT_KEY);
      localStorage.removeItem(OLD_PLANS_KEY);
      const profileId = generateId();
      return {
        profiles: [
          { id: profileId, name: 'Default', plans, activePlanId: plans[0].id },
        ],
        activeProfileId: profileId,
      };
    }
  } catch {
    // ignore
  }

  return freshStart();
}

type Route = 'plan' | 'history';

export default function App() {
  const [profilesState, setProfilesState] = useState<ProfilesState>(loadProfiles);
  const [route, setRoute] = useState<Route>('plan');
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
              touched: active.touched ?? true,
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
      const newInput = buildPresetInput(preset);
      const newScenario: Scenario = {
        id: generateId(),
        name:
          preset === 'coast' ? 'Coast FIRE' :
          preset === 'mid' ? 'Mid-career' : 'Approaching retirement',
        input: newInput,
        actuals: { ...defaultActuals },
        touched: true,
      };
      migratePlans([newScenario]);
      newScenario.touched = true;
      updateActiveProfile(profile => ({
        ...profile,
        plans: profile.plans.map(p =>
          p.id === profile.activePlanId
            ? { ...newScenario, id: p.id }
            : p,
        ),
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
        activeScenario={activePlan}
        theme={theme}
        route={route}
        onToggleTheme={toggleTheme}
        onExport={handleExport}
        onImport={handleImport}
        onAbout={() => setAboutOpen(true)}
        onGoHistory={() => setRoute('history')}
        onGoPlan={() => setRoute('plan')}
        onSwitchPlan={switchPlan}
        onCreatePlan={createPlan}
        onRenamePlan={renamePlan}
        onDeletePlan={deletePlan}
        onSwitchProfile={switchProfile}
        onCreateProfile={createProfile}
        onRenameProfile={renameProfile}
        onDeleteProfile={deleteProfile}
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
          onInputChange={handleInputChange}
          onAutoBalance={handleAutoBalance}
          onAbout={() => setAboutOpen(true)}
        />
      ) : (
        <PlanForecast
          input={input}
          actuals={actuals}
          results={results}
          scenarioName={activePlan.name}
          onInputChange={handleInputChange}
          onAutoBalance={handleAutoBalance}
          onAbout={() => setAboutOpen(true)}
        />
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
