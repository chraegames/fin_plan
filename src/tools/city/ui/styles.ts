// Namespaced styles for the City tool, injected once by App.

export const CITY_STYLES = `
.city-root { display: flex; flex-direction: column; height: calc(100dvh - 56px); min-height: 480px; position: relative; background: var(--bg); }
.city-viewport { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.city-viewport canvas { display: block; width: 100%; height: 100%; outline: none; cursor: crosshair; }
.city-viewport.city-pan canvas { cursor: grab; }
.city-loading { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); background: var(--bg); }
.city-panel { background: color-mix(in srgb, var(--surface) 90%, transparent); backdrop-filter: blur(8px); border: 1px solid var(--border-strong); border-radius: 6px; box-shadow: var(--shadow-pop); }
.city-hud { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; pointer-events: none; z-index: 5; }
.city-hud > * { pointer-events: auto; }
.city-topbar { display: flex; align-items: center; gap: 12px; padding: 6px 12px; font-family: var(--font-mono); font-size: 12px; color: var(--ink-2); flex-wrap: wrap; flex: 1; min-width: 0; }
.city-stat { display: flex; flex-direction: column; gap: 1px; min-width: 56px; }
.city-stat span:first-child { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-index); }
.city-stat span:last-child { font-size: 13px; color: var(--ink); white-space: nowrap; }
.city-stat small { font-size: 10px; }
.city-neg { color: var(--negative); }
.city-pos { color: var(--positive); }
.city-demands { display: flex; flex-direction: column; gap: 2px; min-width: 90px; }
.city-demand { display: flex; align-items: center; gap: 6px; font-size: 10px; }
.city-demand-label { width: 10px; color: var(--ink-index); }
.city-demand-track { position: relative; flex: 1; height: 6px; background: var(--surface-3); border-radius: 3px; overflow: hidden; }
.city-demand-track::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: var(--border-strong); }
.city-demand-fill { position: absolute; top: 0; bottom: 0; background: var(--positive); }
.city-demand-neg { background: var(--negative); }
.city-speed { display: flex; gap: 2px; }
.city-speed-btn, .city-btn, .city-density-btn { font-family: var(--font-mono); font-size: 11px; height: 26px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--ink); cursor: pointer; box-shadow: inset 0 1px 0 var(--key-highlight); }
.city-speed-btn:hover, .city-btn:hover, .city-density-btn:hover { background: var(--surface-3); }
.city-speed-active, .city-density-active { background: var(--accent) !important; color: var(--accent-contrast) !important; border-color: var(--accent) !important; }
.city-btn-sm { height: 22px; padding: 0 6px; font-size: 10.5px; }
.city-btn:disabled { opacity: 0.5; cursor: default; }
.city-overlay-select { display: flex; align-items: center; gap: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-index); }
.city-overlay-select select { font-family: var(--font-mono); font-size: 11px; height: 26px; border-radius: 4px; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--ink); padding: 0 6px; }
.city-toolbar { position: absolute; left: 10px; top: 64px; bottom: 10px; z-index: 5; width: 168px; box-sizing: border-box; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 10px; }
.city-toolgroup-title { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-index); margin-bottom: 4px; }
.city-toolgroup-items { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 4px; }
.city-tool { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 5px 2px; min-width: 0; border-radius: 4px; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--ink); cursor: pointer; box-shadow: inset 0 1px 0 var(--key-highlight); font-family: var(--font-mono); }
.city-tool:hover { background: var(--surface-3); }
.city-tool-active { background: var(--accent); color: var(--accent-contrast); border-color: var(--accent); }
.city-tool-short { font-size: 14px; line-height: 1.1; }
.city-tool-label { font-size: 9.5px; color: inherit; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.city-density { display: flex; gap: 3px; margin-top: 4px; }
.city-density-btn { flex: 1; padding: 0 2px; font-size: 10px; }
.city-toolbar-compact { top: auto; bottom: 10px; left: 10px; right: 10px; width: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 6px; gap: 8px; max-height: 64px; }
.city-toolbar-compact .city-toolgroup { display: flex; gap: 6px; align-items: center; }
.city-toolbar-compact .city-toolgroup-items { display: flex; gap: 4px; }
.city-toolbar-compact .city-tool { width: 40px; height: 40px; justify-content: center; }
.city-toolbar-compact .city-density { margin: 0; }
.city-hint { position: absolute; right: 10px; bottom: 10px; z-index: 5; font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); background: color-mix(in srgb, var(--surface) 80%, transparent); padding: 4px 8px; border-radius: 4px; pointer-events: none; max-width: 60%; }
.city-advisor { position: absolute; right: 10px; top: 64px; z-index: 5; display: flex; flex-direction: column; gap: 6px; width: min(300px, 40vw); }
.city-advice { padding: 8px 10px; font-family: var(--font-sans); font-size: 12px; line-height: 1.4; color: var(--ink-2); border-left: 3px solid var(--info); }
.city-advice-warn { border-left-color: var(--caution); }
.city-advice-bad { border-left-color: var(--negative); }
.city-inspector { position: absolute; right: 10px; bottom: 10px; z-index: 6; width: 260px; padding: 8px 10px; font-family: var(--font-mono); font-size: 11.5px; }
.city-inspector-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; color: var(--ink); font-size: 12px; }
.city-inspector table { width: 100%; border-collapse: collapse; }
.city-inspector th { text-align: left; font-weight: 400; color: var(--ink-3); padding: 1px 0; width: 46%; }
.city-inspector td { text-align: right; color: var(--ink); }
.city-budget { position: absolute; left: 50%; top: 64px; transform: translateX(-50%); z-index: 7; width: min(640px, calc(100% - 20px)); max-height: calc(100% - 80px); overflow: auto; padding: 10px 14px; font-family: var(--font-mono); font-size: 11.5px; }
.city-budget-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.city-budget h4 { margin: 8px 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-index); font-weight: 500; }
.city-slider { display: grid; grid-template-columns: 78px 1fr 40px; align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
.city-slider b { text-align: right; font-weight: 500; color: var(--ink); }
.city-ledger { width: 100%; border-collapse: collapse; }
.city-ledger th { text-align: left; font-weight: 400; color: var(--ink-3); padding: 1px 0; }
.city-ledger td { text-align: right; color: var(--ink); }
.city-ledger-net th, .city-ledger-net td { border-top: 1px solid var(--border); padding-top: 3px; font-weight: 500; }
.city-loan { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
.city-loan-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px; color: var(--ink-3); }
.city-toast { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 8; padding: 8px 14px; font-family: var(--font-mono); font-size: 12px; color: var(--ink); }
.city-paint { display: flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-2); }
@media (max-width: 720px) {
  .city-budget-cols { grid-template-columns: 1fr; }
  .city-advisor { top: auto; bottom: 84px; left: 10px; right: 10px; width: auto; }
  .city-inspector { bottom: 84px; left: 10px; right: 10px; width: auto; }
  .city-hint { display: none; }
  .city-topbar { gap: 8px; padding: 5px 8px; }
}
`;
