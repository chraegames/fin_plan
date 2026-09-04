import type { GameState } from '../game';
import type { LedgerPreview } from '../ledger';
import { t, type Lang } from '../strings';

export function Ledger({ state, lang, preview, onGo, onCancel }: { state: GameState; lang: Lang; preview: LedgerPreview; onGo: () => void; onCancel: () => void }) {
  const h0 = state.run.hero;
  const h1 = preview.after.run.hero;
  const delta = (a: number, b: number) => (b === a ? '' : b > a ? ` (+${b - a})` : ` (${b - a})`);
  return (
    <div className="mt-ledger-pop" role="dialog" aria-label={t(lang, 'ledger')}>
      {preview.lines.map((l, i) => (
        <div key={i} className={l.kind === 'neg' ? 'mt-neg' : l.kind === 'pos' ? 'mt-pos' : 'mt-note'}>
          {l.text}
        </div>
      ))}
      {preview.lines.length === 0 && <div className="mt-note">{t(lang, 'walkSteps', { n: preview.path.length })}</div>}
      <div className="mt-sum">
        {t(lang, 'hp')} {h1.hp}{delta(h0.hp, h1.hp)} · {t(lang, 'atk')} {h1.atk}{delta(h0.atk, h1.atk)} · {t(lang, 'def')} {h1.def}{delta(h0.def, h1.def)}
      </div>
      <div className="mt-btnrow" style={{ marginTop: 8 }}>
        <button type="button" className="mt-tool mt-primary" onClick={onGo}>{preview.complete ? t(lang, 'go') : t(lang, 'goPartial')}<kbd>⏎</kbd></button>
        <button type="button" className="mt-tool" onClick={onCancel}>{t(lang, 'cancel')}<kbd>Esc</kbd></button>
      </div>
    </div>
  );
}
