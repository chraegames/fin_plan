import { useState, useMemo, useEffect, useCallback } from 'react';
import { defaultInput, defaultActuals, generateId } from './engine/defaults';
import { runSimulation } from './engine/simulation';
import { autoBalance } from './engine/autoBalance';
import { START_YEAR, END_YEAR } from './engine/constants';
import type { PlanInput, ActualsData, YearResult, WithdrawalSchedule, ScenarioPlan, Profile, ProfilesState } from './models/types';
import InputPanel from './components/InputPanel';
import ResultsPanel from './components/ResultsPanel';
import CashFlowModal from './components/CashFlowModal';
import ActualsPanel from './components/ActualsPanel';

const PROFILES_KEY = 'financial-planner-profiles';
const OLD_SCENARIOS_KEY = 'financial-planner-scenarios';
// Legacy keys for migration
const OLD_INPUT_KEY = 'financial-planner-input';
const OLD_PLANS_KEY = 'financial-planner-plans';

interface OldScenariosState {
  plans: ScenarioPlan[];
  activePlanId: string;
}

function migratePlans(plans: ScenarioPlan[]): ScenarioPlan[] {
  for (const plan of plans) {
    if (plan.input.inflationRate == null) plan.input.inflationRate = 0.03;
    if (plan.input.targetCash == null) plan.input.targetCash = 200000;
    if (plan.input.returnRate == null) {
      const old = plan.input as any;
      plan.input.returnRate = old.brokerageReturnRate ?? old.retirementReturnRate ?? 0.07;
      delete old.brokerageReturnRate;
      delete old.retirementReturnRate;
    }
    if (!plan.actuals) plan.actuals = { incomes: {}, expenses: {}, withdrawals: {} };
  }
  return plans;
}

function cleanActuals(input: PlanInput, actuals: ActualsData): ActualsData {
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
        // Monthly expense keys are year*100+month, so derive the year
        const year = key > 9999 ? Math.floor(key / 100) : key;
        if (item.periods.some(p => year >= p.startYear && year <= p.endYear)) {
          cleaned[key] = val;
        }
      }
      if (Object.keys(cleaned).length > 0) result[id] = cleaned;
    }
    return result;
  };
  return {
    incomes: clean(input.incomes, actuals.incomes),
    expenses: clean(input.expenses, actuals.expenses),
    withdrawals: clean(input.withdrawals, actuals.withdrawals),
  };
}

function loadProfiles(): ProfilesState {
  // Try new format first
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
  } catch {}

  // Migrate from scenarios format
  try {
    const oldScenarios = localStorage.getItem(OLD_SCENARIOS_KEY);
    if (oldScenarios) {
      const parsed = JSON.parse(oldScenarios) as OldScenariosState;
      if (parsed.plans.length > 0) {
        migratePlans(parsed.plans);
        const profileId = generateId();
        localStorage.removeItem(OLD_SCENARIOS_KEY);
        return {
          profiles: [{
            id: profileId,
            name: 'Default',
            plans: parsed.plans,
            activePlanId: parsed.activePlanId,
          }],
          activeProfileId: profileId,
        };
      }
    }
  } catch {}

  // Migrate from legacy format
  try {
    const oldInput = localStorage.getItem(OLD_INPUT_KEY);
    const oldPlans = localStorage.getItem(OLD_PLANS_KEY);

    if (oldInput) {
      const input = JSON.parse(oldInput) as PlanInput;
      const plans: ScenarioPlan[] = [];

      if (oldPlans) {
        const parsed = JSON.parse(oldPlans) as { plans: { id: string; name: string; schedules: WithdrawalSchedule[] }[]; activePlanId: string | null };
        for (const p of parsed.plans) {
          plans.push({
            id: p.id,
            name: p.name,
            input: { ...input, withdrawals: p.schedules },
          });
        }
      }

      if (plans.length === 0) {
        const id = generateId();
        plans.push({ id, name: 'Default', input });
      }

      localStorage.removeItem(OLD_INPUT_KEY);
      localStorage.removeItem(OLD_PLANS_KEY);

      const profileId = generateId();
      return {
        profiles: [{
          id: profileId,
          name: 'Default',
          plans,
          activePlanId: plans[0].id,
        }],
        activeProfileId: profileId,
      };
    }
  } catch {}

  // Fresh start
  const planId = generateId();
  const profileId = generateId();
  return {
    profiles: [{
      id: profileId,
      name: 'Default',
      plans: [{ id: planId, name: 'Default', input: defaultInput, actuals: { ...defaultActuals } }],
      activePlanId: planId,
    }],
    activeProfileId: profileId,
  };
}

export default function App() {
  const [profilesState, setProfilesState] = useState<ProfilesState>(loadProfiles);
  const [modalYear, setModalYear] = useState<YearResult | null>(null);
  const [renamingProfile, setRenamingProfile] = useState(false);
  const [profileRenameValue, setProfileRenameValue] = useState('');
  const [activeTab, setActiveTab] = useState<'projections' | 'actuals'>('projections');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState('');

  // Persist
  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesState));
  }, [profilesState]);

  const activeProfile = profilesState.profiles.find(p => p.id === profilesState.activeProfileId) ?? profilesState.profiles[0];
  const activePlan = activeProfile.plans.find(p => p.id === activeProfile.activePlanId) ?? activeProfile.plans[0];
  const input = activePlan.input;
  const actuals = activePlan.actuals ?? defaultActuals;
  const results = useMemo(() => runSimulation(input, actuals), [input, actuals]);

  // Helper to update the active profile
  const updateActiveProfile = useCallback((updater: (profile: Profile) => Profile) => {
    setProfilesState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p =>
        p.id === prev.activeProfileId ? updater(p) : p
      ),
    }));
  }, []);

  // --- Profile CRUD ---

  const switchProfile = useCallback((profileId: string) => {
    setProfilesState(prev => ({ ...prev, activeProfileId: profileId }));
  }, []);

  const createProfile = useCallback(() => {
    const profileId = generateId();
    const planId = generateId();
    setProfilesState(prev => ({
      profiles: [...prev.profiles, {
        id: profileId,
        name: `Profile ${prev.profiles.length + 1}`,
        plans: [{ id: planId, name: 'Default', input: JSON.parse(JSON.stringify(defaultInput)), actuals: { ...defaultActuals } }],
        activePlanId: planId,
      }],
      activeProfileId: profileId,
    }));
  }, []);

  const renameProfile = useCallback((profileId: string, name: string) => {
    setProfilesState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => p.id === profileId ? { ...p, name } : p),
    }));
  }, []);

  const deleteProfile = useCallback((profileId: string) => {
    setProfilesState(prev => {
      const remaining = prev.profiles.filter(p => p.id !== profileId);
      if (remaining.length === 0) {
        const newProfileId = generateId();
        const newPlanId = generateId();
        return {
          profiles: [{
            id: newProfileId,
            name: 'Default',
            plans: [{ id: newPlanId, name: 'Default', input: defaultInput, actuals: { ...defaultActuals } }],
            activePlanId: newPlanId,
          }],
          activeProfileId: newProfileId,
        };
      }
      const newActive = prev.activeProfileId === profileId ? remaining[0].id : prev.activeProfileId;
      return { profiles: remaining, activeProfileId: newActive };
    });
  }, []);

  // --- Plan CRUD (within active profile) ---

  const handleInputChange = useCallback((newInput: PlanInput) => {
    updateActiveProfile(profile => ({
      ...profile,
      plans: profile.plans.map(p => {
        if (p.id !== profile.activePlanId) return p;
        const cleaned = cleanActuals(newInput, p.actuals ?? defaultActuals);
        return { ...p, input: newInput, actuals: cleaned };
      }),
    }));
  }, [updateActiveProfile]);

  const switchPlan = useCallback((planId: string) => {
    updateActiveProfile(profile => ({ ...profile, activePlanId: planId }));
  }, [updateActiveProfile]);

  const createPlan = useCallback((name: string) => {
    const newId = generateId();
    updateActiveProfile(profile => {
      const active = profile.plans.find(p => p.id === profile.activePlanId) ?? profile.plans[0];
      const clonedInput = JSON.parse(JSON.stringify(active.input)) as PlanInput;
      return {
        ...profile,
        plans: [...profile.plans, { id: newId, name, input: clonedInput, actuals: JSON.parse(JSON.stringify(active.actuals ?? defaultActuals)) }],
        activePlanId: newId,
      };
    });
  }, [updateActiveProfile]);

  const renamePlan = useCallback((planId: string, name: string) => {
    updateActiveProfile(profile => ({
      ...profile,
      plans: profile.plans.map(p => p.id === planId ? { ...p, name } : p),
    }));
  }, [updateActiveProfile]);

  const deletePlan = useCallback((planId: string) => {
    updateActiveProfile(profile => {
      const remaining = profile.plans.filter(p => p.id !== planId);
      if (remaining.length === 0) {
        const id = generateId();
        return { ...profile, plans: [{ id, name: 'Default', input: defaultInput, actuals: { ...defaultActuals } }], activePlanId: id };
      }
      const newActive = profile.activePlanId === planId ? remaining[0].id : profile.activePlanId;
      return { ...profile, plans: remaining, activePlanId: newActive };
    });
  }, [updateActiveProfile]);

  const handleUpdateWithdrawals = useCallback((withdrawals: WithdrawalSchedule[]) => {
    updateActiveProfile(profile => ({
      ...profile,
      plans: profile.plans.map(p =>
        p.id === profile.activePlanId ? { ...p, input: { ...p.input, withdrawals } } : p
      ),
    }));
  }, [updateActiveProfile]);

  const handleAutoBalance = useCallback((targetCash: number) => {
    updateActiveProfile(profile => {
      const active = profile.plans.find(p => p.id === profile.activePlanId) ?? profile.plans[0];
      const inputWithoutWithdrawals = { ...active.input, withdrawals: [] as WithdrawalSchedule[] };
      const schedules = autoBalance(inputWithoutWithdrawals, targetCash);
      return {
        ...profile,
        plans: profile.plans.map(p =>
          p.id === profile.activePlanId ? { ...p, input: { ...p.input, withdrawals: schedules } } : p
        ),
      };
    });
  }, [updateActiveProfile]);

  const handleActualsChange = useCallback((newActuals: ActualsData) => {
    updateActiveProfile(profile => ({
      ...profile,
      plans: profile.plans.map(p =>
        p.id === profile.activePlanId ? { ...p, actuals: newActuals } : p
      ),
    }));
  }, [updateActiveProfile]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-[120rem] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold text-gray-100 tracking-tight">Financial Planner</h1>
            <span className="text-xs text-gray-500">{START_YEAR} - {END_YEAR}</span>
          </div>

          {/* Profile Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Profile:</span>
            {renamingProfile ? (
              <input
                className="bg-gray-800 text-gray-100 text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none w-36"
                value={profileRenameValue}
                onChange={e => setProfileRenameValue(e.target.value)}
                onBlur={() => {
                  if (profileRenameValue.trim()) {
                    renameProfile(activeProfile.id, profileRenameValue.trim());
                  }
                  setRenamingProfile(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (profileRenameValue.trim()) {
                      renameProfile(activeProfile.id, profileRenameValue.trim());
                    }
                    setRenamingProfile(false);
                  } else if (e.key === 'Escape') {
                    setRenamingProfile(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <select
                className="bg-gray-800 text-gray-100 text-sm rounded px-2 py-1 border border-gray-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                value={profilesState.activeProfileId}
                onChange={e => switchProfile(e.target.value)}
              >
                {profilesState.profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={createProfile}
              className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              New
            </button>
            <button
              onClick={() => {
                setProfileRenameValue(activeProfile.name);
                setRenamingProfile(true);
              }}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              Rename
            </button>
            {profilesState.profiles.length > 1 && (
              <button
                onClick={() => deleteProfile(activeProfile.id)}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white transition-colors"
              >
                Delete
              </button>
            )}
            <div className="border-l border-gray-700 h-4 mx-1" />
            <button
              onClick={() => setExportModalOpen(true)}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              Export
            </button>
            <button
              onClick={() => { setImportValue(''); setImportError(''); setImportModalOpen(true); }}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-[120rem] mx-auto px-4 flex gap-0">
          <button
            onClick={() => setActiveTab('projections')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'projections'
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Projections
          </button>
          <button
            onClick={() => setActiveTab('actuals')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'actuals'
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Actuals
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'projections' ? (
        <main className="max-w-[120rem] mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-6">
            {/* Input Panel */}
            <div className="w-full lg:w-[28rem] lg:shrink-0 lg:grow-0">
              <InputPanel
                input={input}
                onChange={handleInputChange}
                plans={activeProfile.plans}
                activePlanId={activeProfile.activePlanId}
                onSwitchPlan={switchPlan}
                onCreatePlan={createPlan}
                onRenamePlan={renamePlan}
                onDeletePlan={deletePlan}
                onAutoBalance={handleAutoBalance}
              />
            </div>

            {/* Results Panel */}
            <div className="flex-1 min-w-0">
              <ResultsPanel
                results={results}
                onCashFlowClick={setModalYear}
              />
            </div>
          </div>
        </main>
      ) : (
        <ActualsPanel
          input={input}
          actuals={actuals}
          onActualsChange={handleActualsChange}
        />
      )}

      {/* Cash Flow Modal */}
      {modalYear && (
        <CashFlowModal
          yearResult={modalYear}
          withdrawals={input.withdrawals}
          onClose={() => setModalYear(null)}
          onUpdateWithdrawals={handleUpdateWithdrawals}
        />
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setExportModalOpen(false)}>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">Export Data</h2>
            <p className="text-sm text-gray-400 mb-3">Copy this string and paste it into the Import dialog on another machine.</p>
            <textarea
              className="w-full h-40 bg-gray-900 text-gray-300 text-xs font-mono rounded border border-gray-600 p-3 focus:outline-none focus:border-blue-500 resize-none"
              readOnly
              value={btoa(encodeURIComponent(JSON.stringify(profilesState)))}
              onFocus={e => e.target.select()}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(btoa(encodeURIComponent(JSON.stringify(profilesState))));
                }}
                className="text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Copy
              </button>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-sm px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setImportModalOpen(false)}>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">Import Data</h2>
            <p className="text-sm text-gray-400 mb-3">Paste an exported string below. This will replace all your current data.</p>
            <textarea
              className="w-full h-40 bg-gray-900 text-gray-300 text-xs font-mono rounded border border-gray-600 p-3 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Paste exported string here..."
              value={importValue}
              onChange={e => { setImportValue(e.target.value); setImportError(''); }}
            />
            {importError && (
              <p className="text-sm text-red-400 mt-2">{importError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  try {
                    const decoded = JSON.parse(decodeURIComponent(atob(importValue.trim()))) as ProfilesState;
                    if (!Array.isArray(decoded.profiles) || !decoded.activeProfileId) {
                      setImportError('Invalid data format.');
                      return;
                    }
                    setProfilesState(decoded);
                    setImportModalOpen(false);
                  } catch {
                    setImportError('Failed to decode. Make sure you pasted the full exported string.');
                  }
                }}
                className="text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Import
              </button>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-sm px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
