import { useState, useMemo, useEffect, useCallback } from 'react';
import { defaultInput, generateId } from './engine/defaults';
import { runSimulation } from './engine/simulation';
import { autoBalance } from './engine/autoBalance';
import { START_YEAR, END_YEAR } from './engine/constants';
import type { PlanInput, YearResult, WithdrawalSchedule, ScenarioPlan } from './models/types';
import InputPanel from './components/InputPanel';
import ResultsPanel from './components/ResultsPanel';
import CashFlowModal from './components/CashFlowModal';

const SCENARIOS_KEY = 'financial-planner-scenarios';
// Old keys for migration
const OLD_INPUT_KEY = 'financial-planner-input';
const OLD_PLANS_KEY = 'financial-planner-plans';

interface ScenariosState {
  plans: ScenarioPlan[];
  activePlanId: string;
}

function loadScenarios(): ScenariosState {
  try {
    const saved = localStorage.getItem(SCENARIOS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ScenariosState;
      if (parsed.plans.length > 0) {
        for (const plan of parsed.plans) {
          if (plan.input.inflationRate == null) plan.input.inflationRate = 0.03;
          if (plan.input.targetCash == null) plan.input.targetCash = 200000;
          if (plan.input.returnRate == null) {
            const old = plan.input as any;
            plan.input.returnRate = old.brokerageReturnRate ?? old.retirementReturnRate ?? 0.07;
            delete old.brokerageReturnRate;
            delete old.retirementReturnRate;
          }
        }
        return parsed;
      }
    }
  } catch {}

  // Migrate from old format
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

      // Clean up old keys
      localStorage.removeItem(OLD_INPUT_KEY);
      localStorage.removeItem(OLD_PLANS_KEY);

      return { plans, activePlanId: plans[0].id };
    }
  } catch {}

  // Fresh start
  const id = generateId();
  return {
    plans: [{ id, name: 'Default', input: defaultInput }],
    activePlanId: id,
  };
}

export default function App() {
  const [scenarios, setScenarios] = useState<ScenariosState>(loadScenarios);
  const [modalYear, setModalYear] = useState<YearResult | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  }, [scenarios]);

  const activePlan = scenarios.plans.find(p => p.id === scenarios.activePlanId) ?? scenarios.plans[0];
  const input = activePlan.input;
  const results = useMemo(() => runSimulation(input), [input]);

  // Update the active plan's input
  const handleInputChange = useCallback((newInput: PlanInput) => {
    setScenarios(prev => ({
      ...prev,
      plans: prev.plans.map(p =>
        p.id === prev.activePlanId ? { ...p, input: newInput } : p
      ),
    }));
  }, []);

  // Switch active plan
  const switchPlan = useCallback((planId: string) => {
    setScenarios(prev => ({ ...prev, activePlanId: planId }));
  }, []);

  // Create new plan (deep clone of active)
  const createPlan = useCallback((name: string) => {
    const newId = generateId();
    setScenarios(prev => {
      const active = prev.plans.find(p => p.id === prev.activePlanId) ?? prev.plans[0];
      const clonedInput = JSON.parse(JSON.stringify(active.input)) as PlanInput;
      return {
        plans: [...prev.plans, { id: newId, name, input: clonedInput }],
        activePlanId: newId,
      };
    });
  }, []);

  // Rename plan
  const renamePlan = useCallback((planId: string, name: string) => {
    setScenarios(prev => ({
      ...prev,
      plans: prev.plans.map(p => p.id === planId ? { ...p, name } : p),
    }));
  }, []);

  // Delete plan
  const deletePlan = useCallback((planId: string) => {
    setScenarios(prev => {
      const remaining = prev.plans.filter(p => p.id !== planId);
      if (remaining.length === 0) {
        const id = generateId();
        return { plans: [{ id, name: 'Default', input: defaultInput }], activePlanId: id };
      }
      const newActive = prev.activePlanId === planId ? remaining[0].id : prev.activePlanId;
      return { plans: remaining, activePlanId: newActive };
    });
  }, []);

  // Update withdrawals (from CashFlowModal)
  const handleUpdateWithdrawals = useCallback((withdrawals: WithdrawalSchedule[]) => {
    setScenarios(prev => ({
      ...prev,
      plans: prev.plans.map(p =>
        p.id === prev.activePlanId ? { ...p, input: { ...p.input, withdrawals } } : p
      ),
    }));
  }, []);

  // Auto-balance: updates current plan's withdrawals in-place
  const handleAutoBalance = useCallback((targetCash: number) => {
    setScenarios(prev => {
      const active = prev.plans.find(p => p.id === prev.activePlanId) ?? prev.plans[0];
      const inputWithoutWithdrawals = { ...active.input, withdrawals: [] as WithdrawalSchedule[] };
      const schedules = autoBalance(inputWithoutWithdrawals, targetCash);
      return {
        ...prev,
        plans: prev.plans.map(p =>
          p.id === prev.activePlanId ? { ...p, input: { ...p.input, withdrawals: schedules } } : p
        ),
      };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-[120rem] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold text-gray-100 tracking-tight">Financial Planner</h1>
            <span className="text-xs text-gray-500">{START_YEAR} - {END_YEAR}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[120rem] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Input Panel */}
          <div className="lg:w-80 lg:min-w-80 lg:shrink-0">
            <InputPanel
              input={input}
              onChange={handleInputChange}
              plans={scenarios.plans}
              activePlanId={scenarios.activePlanId}
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

      {/* Cash Flow Modal */}
      {modalYear && (
        <CashFlowModal
          yearResult={modalYear}
          withdrawals={input.withdrawals}
          onClose={() => setModalYear(null)}
          onUpdateWithdrawals={handleUpdateWithdrawals}
        />
      )}
    </div>
  );
}
