import { Button } from '../../../components/primitives/Button';
import type { GameState } from '../game';
import type { LedgerPreview } from '../ledger';

export function Ledger({ state, preview, onGo, onCancel }: { state: GameState; preview: LedgerPreview; onGo: () => void; onCancel: () => void }) {
  const h0 = state.run.hero;
  const h1 = preview.after.run.hero;
  const delta = (a: number, b: number) => (b === a ? '' : b > a ? ` (+${b - a})` : ` (${b - a})`);
  return (
    <div className="mt-ledger">
      {preview.lines.map((l, i) => (
        <div key={i} className={l.kind === 'neg' ? 'mt-neg' : l.kind === 'pos' ? 'mt-pos' : undefined}>
          {l.text}
        </div>
      ))}
      {preview.lines.length === 0 && <div style={{ color: 'var(--ink-3)' }}>Walk {preview.path.length} steps.</div>}
      <div style={{ marginTop: 6, borderTop: '1px solid var(--border-soft)', paddingTop: 6 }}>
        HP {h1.hp}{delta(h0.hp, h1.hp)} · ATK {h1.atk}{delta(h0.atk, h1.atk)} · DEF {h1.def}{delta(h0.def, h1.def)}
      </div>
      <div className="mt-btnrow">
        <Button size="sm" variant="primary" onClick={onGo} disabled={!preview.complete && preview.path.length === 0}>
          {preview.complete ? 'Go' : 'Go as far as possible'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
