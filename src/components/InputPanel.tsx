import { useState } from 'react';
import type { PlanInput, ScenarioPlan } from '../models/types';
import IncomeSection from './IncomeSection';
import ExpenseSection from './ExpenseSection';
import InvestmentSection from './InvestmentSection';
import WithdrawalSection from './WithdrawalSection';

interface Props {
  input: PlanInput;
  onChange: (input: PlanInput) => void;
  plans: ScenarioPlan[];
  activePlanId: string;
  onSwitchPlan: (planId: string) => void;
  onCreatePlan: (name: string) => void;
  onRenamePlan: (planId: string, name: string) => void;
  onDeletePlan: (planId: string) => void;
  onAutoBalance: (targetCash: number) => void;
}

export default function InputPanel({
  input, onChange, plans, activePlanId,
  onSwitchPlan, onCreatePlan, onRenamePlan, onDeletePlan, onAutoBalance,
}: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activePlan = plans.find(p => p.id === activePlanId);

  const handleNewPlan = () => {
    const count = plans.length + 1;
    onCreatePlan(`Plan ${count}`);
  };

  const startRename = (plan: ScenarioPlan) => {
    setRenaming(plan.id);
    setRenameValue(plan.name);
  };

  const commitRename = () => {
    if (renaming && renameValue.trim()) {
      onRenamePlan(renaming, renameValue.trim());
    }
    setRenaming(null);
  };

  return (
    <div className="space-y-4">
      {/* Plan Selector */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Scenario</h3>
        {renaming ? (
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitRename()}
            onBlur={commitRename}
            autoFocus
            className="w-full border border-gray-600 rounded px-2 py-1.5 text-sm mb-2 bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        ) : (
          <select
            value={activePlanId}
            onChange={e => onSwitchPlan(e.target.value)}
            className="w-full border border-gray-600 rounded px-2 py-1.5 text-sm mb-2 bg-gray-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={handleNewPlan}
            className="bg-blue-900/30 text-blue-400 hover:bg-blue-800/40 px-2 py-1 rounded whitespace-nowrap"
          >
            + New
          </button>
          {activePlan && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startRename(activePlan)}
                className="bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300 px-2 py-1 rounded"
              >
                Rename
              </button>
              {plans.length > 1 && (
                <button
                  onClick={() => onDeletePlan(activePlan.id)}
                  className="bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 px-2 py-1 rounded"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <InvestmentSection
        input={input}
        onChange={updates => onChange({ ...input, ...updates })}
      />
      <IncomeSection
        items={input.incomes}
        onChange={incomes => onChange({ ...input, incomes })}
      />
      <WithdrawalSection
        items={input.withdrawals}
        onChange={withdrawals => onChange({ ...input, withdrawals })}
        targetCash={input.targetCash}
        onTargetCashChange={targetCash => onChange({ ...input, targetCash })}
        onAutoBalance={onAutoBalance}
      />
      <ExpenseSection
        items={input.expenses}
        onChange={expenses => onChange({ ...input, expenses })}
      />
    </div>
  );
}
