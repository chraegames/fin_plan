import { SectionHead } from '../../layout/SectionHead';
import { StepCard } from '../cards/StepCard';

export interface NextStep {
  num: number;
  title: string;
  sub: string;
  done?: boolean;
  cta?: string;
  primary?: boolean;
  onClick?: () => void;
}

interface NextStepsProps {
  steps: NextStep[];
}

export function NextSteps({ steps }: NextStepsProps) {
  const remaining = steps.filter(s => !s.done).length;
  return (
    <section>
      <SectionHead
        overline="What's next"
        title={
          remaining > 0
            ? `${remaining} more step${remaining === 1 ? '' : 's'} to a complete plan`
            : 'Your plan is ready'
        }
        sub="The optimizer needs your spending to draw a meaningful forecast. Each step takes a minute or two."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {steps.map(s => (
          <StepCard
            key={s.num}
            num={s.num}
            title={s.title}
            sub={s.sub}
            done={s.done}
            cta={s.cta}
            primary={s.primary}
            onClick={s.onClick}
          />
        ))}
      </div>
    </section>
  );
}
