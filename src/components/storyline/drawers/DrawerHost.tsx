import type { DrawerKind } from '../../../App';
import type { PlanInput, WithdrawalSchedule } from '../../../models/types';
import { earlyWithdrawalCutoff } from '../../../engine/constants';
import { EditDrawer } from './EditDrawer';
import { BalancesEditor } from './BalancesEditor';
import { IncomeEditor } from './IncomeEditor';
import { ExpenseEditor } from './ExpenseEditor';
import { WithdrawalEditor } from './WithdrawalEditor';
import { ReturnsEditor } from './ReturnsEditor';

interface DrawerHostProps {
  input: PlanInput;
  drawer: DrawerKind;
  setDrawer: (kind: DrawerKind) => void;
  onInputChange: (next: PlanInput) => void;
  onAutoBalance: (targetCash: number) => void;
}

/**
 * Renders the five input drawers (Balances / Income / Expenses /
 * Withdrawals / Returns) for both PartialPlan and PlanForecast. Drawer
 * state lives on App so it survives the partial→forecast screen
 * transition; this component is just the rendering layer.
 *
 * BalancesEditor auto-detects splitter mode from the input (if everything
 * is still in startingCash, the editor shows a "split this $X across
 * accounts" UI with a live remaining indicator).
 */
export function DrawerHost({
  input,
  drawer,
  setDrawer,
  onInputChange,
  onAutoBalance,
}: DrawerHostProps) {
  const penaltyCutoff = earlyWithdrawalCutoff(input.birthYear);
  const total =
    input.startingCash + input.brokerageBalance + input.rothBalance + input.iraBalance;
  const isLump =
    total > 0 &&
    input.startingCash === total &&
    input.brokerageBalance === 0 &&
    input.rothBalance === 0 &&
    input.iraBalance === 0;

  const close = () => setDrawer(null);
  const handleUpdate = (updates: Partial<PlanInput>) => onInputChange({ ...input, ...updates });
  const handleUpdateWithdrawals = (withdrawals: WithdrawalSchedule[]) =>
    onInputChange({ ...input, withdrawals });

  return (
    <>
      <EditDrawer
        open={drawer === 'balances'}
        onClose={close}
        title={isLump ? 'Split starting savings' : 'Starting balances'}
        sub={
          isLump
            ? 'Distribute your total across the four account types'
            : 'Split your starting wealth across cash, brokerage, Roth, and IRA'
        }
      >
        <BalancesEditor
          input={input}
          onChange={handleUpdate}
          splitterMode={isLump}
          splitterTotal={isLump ? total : undefined}
        />
      </EditDrawer>

      <EditDrawer
        open={drawer === 'income'}
        onClose={close}
        title="Income"
        sub={`${input.incomes.length} source${input.incomes.length === 1 ? '' : 's'}`}
      >
        <IncomeEditor
          items={input.incomes}
          onChange={incomes => handleUpdate({ incomes })}
          startYear={input.startYear}
          endYear={input.endYear}
        />
      </EditDrawer>

      <EditDrawer
        open={drawer === 'expenses'}
        onClose={close}
        title="Expenses"
        sub={`${input.expenses.length} line item${input.expenses.length === 1 ? '' : 's'}`}
      >
        <ExpenseEditor
          items={input.expenses}
          onChange={expenses => handleUpdate({ expenses })}
          startYear={input.startYear}
          endYear={input.endYear}
        />
      </EditDrawer>

      <EditDrawer
        open={drawer === 'withdrawals'}
        onClose={close}
        title="Withdrawal strategy"
        sub="Schedules + auto-balance optimizer"
      >
        <WithdrawalEditor
          items={input.withdrawals}
          onChange={handleUpdateWithdrawals}
          targetCash={input.targetCash}
          onTargetCashChange={v => handleUpdate({ targetCash: v })}
          onAutoBalance={onAutoBalance}
          penaltyCutoff={penaltyCutoff}
          startYear={input.startYear}
          endYear={input.endYear}
        />
      </EditDrawer>

      <EditDrawer
        open={drawer === 'returns'}
        onClose={close}
        title="Returns & inflation"
        sub="Return rate, inflation, projection horizon"
      >
        <ReturnsEditor input={input} onChange={handleUpdate} />
      </EditDrawer>
    </>
  );
}
