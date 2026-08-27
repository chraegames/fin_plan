import { useEffect } from 'react';
import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { track } from '../../utils/analytics';
import { IntroHeader, IntroSections } from './IntroContent';
import { INTRO_STYLES } from './introStyles';

interface IntroProps {
  onDismiss: () => void;
}

// First-visit screen: the same hero + "What this is" panels as the prerendered
// home page, plus the "Get started" CTA. The AppBar (minimal mode) sits above.
export function Intro({ onDismiss }: IntroProps) {
  useEffect(() => {
    track('intro_shown');
  }, []);

  return (
    <div className="fire-intro">
      <style>{INTRO_STYLES}</style>
      <IntroHeader
        cta={
          <Button variant="primary" size="lg" onClick={onDismiss} trailing={<Icon name="arrow" />}>
            Get started
          </Button>
        }
      />
      <IntroSections />
    </div>
  );
}
