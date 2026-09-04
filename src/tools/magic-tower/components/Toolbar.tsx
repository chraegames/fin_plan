import type { GameState } from '../game';
import { t, type Lang } from '../strings';

export type ToolId = 'manual' | 'fly' | 'breach' | 'save' | 'load' | 'undo' | 'help' | 'lang' | 'holyWater' | 'bomb' | 'pickaxe' | 'towers';

interface Props {
  state: GameState;
  lang: Lang;
  on: (what: ToolId) => void;
}

function ToolButton({ id, label, k, disabled, primary, on }: { id: ToolId; label: string; k?: string; disabled?: boolean; primary?: boolean; on: (what: ToolId) => void }) {
  return (
    <button type="button" className={`mt-tool${primary ? ' mt-primary' : ''}`} disabled={disabled} onClick={() => on(id)} title={k ? `${label} (${k})` : label}>
      {label}
      {k && <kbd>{k}</kbd>}
    </button>
  );
}

export function Toolbar({ state, lang, on }: Props) {
  const h = state.run.hero;
  return (
    <div className="mt-toolbar" role="toolbar" aria-label="Actions">
      <ToolButton on={on} id="manual" label={t(lang, 'manual')} k="M" />
      <ToolButton on={on} id="breach" label={t(lang, 'breachTitle')} k="B" disabled={h.stones <= 0} />
      <ToolButton on={on} id="fly" label={t(lang, 'fly')} k="F" disabled={!h.teleporter} />
      {h.holyWater > 0 && <ToolButton on={on} id="holyWater" label={t(lang, 'holyWater')} />}
      {h.bombs > 0 && <ToolButton on={on} id="bomb" label={t(lang, 'bomb')} />}
      {h.pickaxes > 0 && <ToolButton on={on} id="pickaxe" label={t(lang, 'pickaxe')} />}
      <ToolButton on={on} id="undo" label={t(lang, 'undo')} k="Z" disabled={state.run.history.length === 0} />
      <ToolButton on={on} id="save" label={t(lang, 'save')} k="S" />
      <ToolButton on={on} id="load" label={t(lang, 'load')} k="L" />
      <span className="mt-spacer" />
      <ToolButton on={on} id="help" label={t(lang, 'help')} k="?" />
      <ToolButton on={on} id="lang" label={t(lang, 'lang')} />
      <ToolButton on={on} id="towers" label={t(lang, 'towers')} />
    </div>
  );
}
