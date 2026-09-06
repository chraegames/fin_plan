// Namespaced styles for the City HUD. The HUD has its own fixed "toy town"
// palette (cream paper, cocoa outlines, chunky sticker shadows) in both site
// themes, so it reads as a game frame rather than a form.

export const CITY_STYLES = `
.city-root { --cp-paper: #FFF7E8; --cp-paper-2: #F8EBD3; --cp-ink: #3A2A22; --cp-ink-2: #6B5245; --cp-muted: #A08573; --cp-line: #3A2A22;
  --cp-r: #5CB85F; --cp-c: #4F86E0; --cp-i: #E6B23B; --cp-road: #5B5F6B; --cp-water: #4C9BD6; --cp-power: #F2C230; --cp-danger: #E2543F; --cp-good: #3FA66B; --cp-coin: #F0B429; --cp-purple: #8E6BD6; --cp-health: #E76C82; --cp-edu: #C98A3B; --cp-park: #3F9C4D; --cp-sky: #7EC8F5;
  --cp-shadow: 0 4px 0 var(--cp-line); --cp-radius: 12px;
  display: flex; flex-direction: column; height: calc(100dvh - 56px); min-height: 480px; position: relative; background: var(--bg);
  font-family: var(--font-display); color: var(--cp-ink); }
.city-viewport { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.city-viewport canvas { display: block; width: 100%; height: 100%; outline: none; cursor: crosshair; }
.city-viewport.city-pan canvas { cursor: grab; }
.city-loading { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); background: var(--bg); }

/* sticker panels + chunky buttons */
.city-panel { background: var(--cp-paper); border: 2px solid var(--cp-line); border-radius: var(--cp-radius); box-shadow: var(--cp-shadow); color: var(--cp-ink); }
.city-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 10px; border: 2px solid var(--cp-line); background: var(--cp-paper-2); color: var(--cp-ink); font: 700 13px/1 var(--font-display); cursor: pointer; box-shadow: 0 3px 0 var(--cp-line); transition: transform 80ms, box-shadow 80ms, background 120ms; user-select: none; }
.city-btn:hover { background: #fff; }
.city-btn:active, .city-btn.city-pressed { transform: translateY(2px); box-shadow: 0 1px 0 var(--cp-line); }
.city-btn:disabled { opacity: 0.45; cursor: default; transform: none; }
.city-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; border-radius: 8px; box-shadow: 0 2px 0 var(--cp-line); }
.city-btn-icon { width: 36px; padding: 0; }
.city-btn-primary { background: var(--cp-good); color: #fff; }
.city-btn-primary:hover { background: #48b877; }
.city-btn-danger { background: var(--cp-danger); color: #fff; }
.city-tile { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; border: 2px solid var(--cp-line); color: #fff; flex: none; }

/* HUD top bar */
.city-hud { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: flex-start; gap: 8px; padding: 10px 10px 0; pointer-events: none; z-index: 5; }
.city-hud > * { pointer-events: auto; }
.city-topbar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; flex: 1; min-width: 0; flex-wrap: wrap; }
.city-stat { display: flex; align-items: center; gap: 8px; padding-right: 6px; }
.city-stat-text { display: flex; flex-direction: column; line-height: 1.05; }
.city-stat-label { font: 700 9.5px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); margin-bottom: 3px; }
.city-stat-value { font: 700 15px/1 var(--font-display); color: var(--cp-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
.city-stat-value small { font-size: 11px; font-weight: 700; margin-left: 4px; }
.city-neg { color: var(--cp-danger); }
.city-pos { color: var(--cp-good); }
.city-demands { display: flex; align-items: flex-end; gap: 5px; height: 40px; padding: 0 6px; border-left: 2px dashed #E3D2B8; border-right: 2px dashed #E3D2B8; }
.city-demand { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 18px; height: 100%; }
.city-demand-track { position: relative; flex: 1; width: 12px; border-radius: 6px; border: 2px solid var(--cp-line); background: #fff; overflow: hidden; }
.city-demand-track::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: var(--cp-line); opacity: 0.35; }
.city-demand-fill { position: absolute; left: 0; right: 0; }
.city-demand-label { font: 700 10px/1 var(--font-display); color: var(--cp-ink); }
.city-speed { display: flex; gap: 4px; }
.city-speed .city-btn { width: 34px; padding: 0; height: 34px; }
.city-speed .city-btn.city-on { background: var(--cp-good); color: #fff; }
.city-speed .city-btn.city-on-pause { background: var(--cp-danger); color: #fff; }
.city-actions { display: flex; gap: 6px; margin-left: auto; }
.city-view { position: relative; }
.city-view-menu { position: absolute; right: 0; top: 42px; z-index: 9; display: grid; grid-template-columns: repeat(2, 132px); gap: 4px; padding: 8px; }
.city-view-item { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px; border-radius: 8px; border: 2px solid transparent; background: transparent; color: var(--cp-ink); font: 700 12px/1 var(--font-display); cursor: pointer; text-align: left; }
.city-view-item:hover { background: var(--cp-paper-2); }
.city-view-item.city-on { border-color: var(--cp-line); background: #fff; }
.city-view-dot { width: 12px; height: 12px; border-radius: 4px; border: 2px solid var(--cp-line); flex: none; }

/* toolbar dock */
.city-toolbar { position: absolute; left: 10px; top: 76px; max-height: calc(100% - 86px); z-index: 5; width: 118px; overflow-y: auto; overflow-x: visible; padding: 5px 6px; display: flex; flex-direction: column; gap: 5px; scrollbar-width: none; }
.city-toolbar::-webkit-scrollbar { display: none; }
.city-toolgroup { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding-bottom: 5px; border-bottom: 2px dashed #E3D2B8; }
.city-toolgroup:last-child { border-bottom: 0; padding-bottom: 0; }
.city-tool { position: relative; display: grid; place-items: center; width: 50px; height: 34px; border-radius: 11px; border: 2px solid var(--cp-line); color: #fff; cursor: pointer; box-shadow: 0 3px 0 var(--cp-line); transition: transform 80ms, box-shadow 80ms; }
.city-tool:hover { filter: brightness(1.08); }
.city-tool:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--cp-line); }
.city-tool.city-on { outline: 3px solid #fff; outline-offset: -5px; transform: translateY(1px); box-shadow: 0 2px 0 var(--cp-line), 0 0 0 3px var(--cp-line); }
.city-tool::after { content: attr(data-label); position: absolute; left: 58px; top: 50%; transform: translateY(-50%); white-space: nowrap; background: var(--cp-ink); color: #fff; font: 700 12px/1 var(--font-display); padding: 6px 9px; border-radius: 8px; opacity: 0; pointer-events: none; transition: opacity 100ms; z-index: 20; }
.city-tool:hover::after { opacity: 1; }
.city-density { display: flex; gap: 4px; grid-column: 1 / -1; }
.city-density .city-tool { width: auto; height: 24px; border-radius: 7px; box-shadow: 0 2px 0 var(--cp-line); background: var(--cp-paper-2); color: var(--cp-ink); flex: 1; }
.city-density .city-tool.city-on { background: var(--cp-ink); color: #fff; outline: none; }
.city-toolbadge { position: absolute; left: 138px; top: 76px; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 6px; pointer-events: none; }
.city-toolbadge b { font: 700 13px/1.1 var(--font-display); }
.city-toolbadge span { display: block; font: 700 10.5px/1.2 var(--font-mono); color: var(--cp-muted); margin-top: 2px; }

/* mobile dock */
.city-toolbar-compact { top: auto; max-height: none; bottom: 10px; left: 10px; right: 10px; width: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 6px; gap: 6px; max-height: 66px; }
.city-toolbar-compact .city-toolgroup { display: flex; flex-direction: row; padding: 0 6px 0 0; border-bottom: 0; border-right: 2px dashed #E3D2B8; }
.city-toolbar-compact .city-tool { width: 44px; height: 44px; }
.city-toolbar-compact .city-tool::after { display: none; }
.city-toolbar-compact .city-density { flex-direction: column; gap: 2px; }
.city-toolbar-compact .city-density .city-tool { width: 30px; height: 13px; }
.city-toolbar-compact .city-density .city-tool svg { width: 14px; height: 14px; }

/* advisor speech bubbles */
.city-advisor { position: absolute; right: 10px; top: 76px; z-index: 5; display: flex; flex-direction: column; gap: 8px; width: min(320px, 42vw); }
.city-advice { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; font: 500 12.5px/1.4 var(--font-sans); color: var(--cp-ink-2); }
.city-advice .city-tile { width: 28px; height: 28px; border-radius: 8px; }

/* inspector / budget */
.city-inspector { position: absolute; right: 10px; bottom: 10px; z-index: 6; width: 270px; padding: 10px 12px; }
.city-panel-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; font: 700 14px/1 var(--font-display); }
.city-kv { width: 100%; border-collapse: collapse; font: 500 12px/1.3 var(--font-sans); }
.city-kv th { text-align: left; font-weight: 500; color: var(--cp-muted); padding: 2px 0; width: 48%; }
.city-kv td { text-align: right; color: var(--cp-ink); font-weight: 700; font-variant-numeric: tabular-nums; }
.city-yes { color: var(--cp-good); }
.city-no { color: var(--cp-danger); }
.city-meter { display: inline-block; width: 64px; height: 8px; border-radius: 4px; border: 1.5px solid var(--cp-line); background: #fff; vertical-align: middle; margin-left: 6px; overflow: hidden; }
.city-meter i { display: block; height: 100%; }
.city-budget { position: absolute; left: 50%; top: 76px; transform: translateX(-50%); z-index: 7; width: min(680px, calc(100% - 20px)); max-height: calc(100% - 90px); overflow: auto; padding: 12px 16px; }
.city-budget-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.city-budget h4 { margin: 10px 0 6px; font: 700 10px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); }
.city-slider { display: grid; grid-template-columns: 26px 78px 1fr 44px; align-items: center; gap: 8px; margin: 4px 0; font: 500 12px/1 var(--font-sans); color: var(--cp-ink-2); }
.city-slider b { text-align: right; font: 700 12px/1 var(--font-display); color: var(--cp-ink); font-variant-numeric: tabular-nums; }
.city-slider input[type=range] { accent-color: var(--cp-good); }
.city-slider .city-tile { width: 24px; height: 24px; border-radius: 7px; }
.city-ledger { width: 100%; border-collapse: collapse; font: 500 12px/1.4 var(--font-sans); }
.city-ledger th { text-align: left; font-weight: 500; color: var(--cp-ink-2); padding: 1px 0; }
.city-ledger td { text-align: right; color: var(--cp-ink); font-weight: 700; font-variant-numeric: tabular-nums; }
.city-ledger-net th, .city-ledger-net td { border-top: 2px solid var(--cp-line); padding-top: 4px; }
.city-loan { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin: 4px 0; font: 500 12px/1.3 var(--font-sans); color: var(--cp-ink-2); }
.city-loan-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; font: 500 11px/1.3 var(--font-sans); color: var(--cp-muted); }

/* misc */
.city-hint { position: absolute; right: 10px; bottom: 10px; z-index: 5; font: 700 10.5px/1 var(--font-mono); color: var(--cp-ink-2); background: var(--cp-paper); border: 2px solid var(--cp-line); padding: 6px 9px; border-radius: 8px; pointer-events: none; max-width: 60%; }
.city-toast { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 8; padding: 8px 14px; font: 700 13px/1.2 var(--font-display); display: flex; gap: 10px; align-items: center; }
.city-paint { display: flex; align-items: center; gap: 6px; padding: 6px 10px; font: 700 12px/1 var(--font-display); }
.city-paint.city-on { background: var(--cp-purple); color: #fff; }
.city-modal-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(40, 25, 15, 0.5); display: grid; place-items: center; }
.city-modal { width: min(440px, calc(100% - 32px)); padding: 18px 20px; font: 500 13px/1.45 var(--font-sans); color: var(--cp-ink-2); }
.city-modal h3 { margin: 0 0 10px; font: 700 18px/1 var(--font-display); color: var(--cp-ink); display: flex; align-items: center; gap: 10px; }
.city-modal p { margin: 4px 0 10px; }
.city-modal-note { font-size: 12px; color: var(--cp-muted); }
.city-seed { display: flex; align-items: center; gap: 8px; font: 700 10px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); }
.city-seed input { flex: 1; font: 700 15px/1 var(--font-display); height: 36px; padding: 0 10px; border: 2px solid var(--cp-line); border-radius: 10px; background: #fff; color: var(--cp-ink); }
.city-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
@media (max-width: 720px) {
  .city-budget-cols { grid-template-columns: 1fr; }
  .city-advisor { top: auto; bottom: 86px; left: 10px; right: 10px; width: auto; }
  .city-inspector { bottom: 86px; left: 10px; right: 10px; width: auto; }
  .city-hint, .city-toolbadge { display: none; }
  .city-topbar { gap: 8px; padding: 6px 8px; }
  .city-stat-value { font-size: 13px; }
  .city-view-menu { grid-template-columns: repeat(2, 120px); }
}
`;
