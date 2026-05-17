import { Button } from '../../primitives/Button';
import { Icon } from '../../primitives/Icon';

interface WithdrawalNudgeProps {
  onSetUp: () => void;
}

export function WithdrawalNudge({ onSetUp }: WithdrawalNudgeProps) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 18px',
        background: 'var(--caution-soft)',
        borderRadius: 12,
        borderLeft: '3px solid var(--caution)',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--bg)',
          color: 'var(--caution)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Icon name="warning" size={15} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--ink)',
            marginBottom: 4,
          }}
        >
          No withdrawal strategy set
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          This scenario isn't drawing any money from your accounts, so balances grow indefinitely
          and the forecast won't show when your savings are spent. Set up a strategy to model how
          much you withdraw each year.
        </p>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={onSetUp}
        leading={<Icon name="dollar" size={12} />}
      >
        Set up withdrawals
      </Button>
    </div>
  );
}
