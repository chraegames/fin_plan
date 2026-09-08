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
.city-stat-btn { background: transparent; border: 2px solid transparent; border-radius: 10px; padding: 2px 6px 2px 2px; cursor: pointer; color: inherit; font: inherit; text-align: left; }
.city-stat-btn:hover { background: var(--cp-paper-2); border-color: var(--cp-line); }
.city-chips { display: flex; gap: 4px; }
.city-chip { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 7px; border-radius: 8px; border: 2px solid var(--cp-line); font: 700 11px/1 var(--font-mono); color: var(--cp-ink); font-variant-numeric: tabular-nums; }
.city-chip-ok { background: #DDF3E4; }
.city-chip-warn { background: #FFEDB8; }
.city-chip-bad { background: #FFD3CC; color: #7A1E12; }
.city-milestone { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 10px 0 4px; border-radius: 10px; border: 2px solid transparent; background: transparent; color: var(--cp-ink); cursor: pointer; font: inherit; text-align: left; }
.city-milestone:hover { background: var(--cp-paper-2); border-color: var(--cp-line); }
.city-milestone .city-tile { width: 30px; height: 30px; border-radius: 9px; }
.city-milestone-text { display: flex; flex-direction: column; gap: 3px; min-width: 96px; }
.city-milestone-text b { font: 700 12.5px/1 var(--font-display); }
.city-milestone-text small { font: 600 9.5px/1 var(--font-mono); color: var(--cp-muted); white-space: nowrap; }
.city-milestone-bar { display: block; height: 7px; border-radius: 4px; border: 1.5px solid var(--cp-line); background: #fff; overflow: hidden; }
.city-milestone-bar i { display: block; height: 100%; background: var(--cp-purple); transition: width 300ms; }
.city-gear-menu { grid-template-columns: 180px; }
@media (max-width: 1440px) {
  .city-hide-md { display: none !important; }
  .city-topbar { gap: 8px; padding: 8px 10px; }
  .city-stat { padding-right: 2px; }
  .city-milestone-text { min-width: 80px; }
}
.city-stat-text { display: flex; flex-direction: column; line-height: 1.05; }
.city-stat-label { font: 700 9.5px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); margin-bottom: 3px; }
.city-stat-value { font: 700 15px/1 var(--font-display); color: var(--cp-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
.city-stat-value small { font-size: 11px; font-weight: 700; margin-left: 4px; }
.city-neg { color: var(--cp-danger); }
.city-pos { color: var(--cp-good); }
.city-demands { display: flex; align-items: flex-end; gap: 5px; height: 40px; padding: 0 6px; border-left: 2px dashed #E3D2B8; border-right: 2px dashed #E3D2B8; }
.city-demand { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 22px; height: 100%; }
.city-demand-tracks { display: flex; gap: 2px; flex: 1; width: 100%; }
.city-demand-track { position: relative; flex: 1; min-width: 5px; border-radius: 3px; border: 1.5px solid var(--cp-line); background: #fff; overflow: hidden; }
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

/* category dock + flyout */
.city-dock { position: absolute; left: 10px; top: 76px; z-index: 6; width: 88px; padding: 5px; display: flex; flex-direction: column; gap: 2px; max-height: calc(100% - 96px); overflow-y: auto; scrollbar-width: none; }
.city-dock::-webkit-scrollbar { display: none; }
.city-cat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px 3px; border-radius: 10px; border: 2px solid transparent; background: transparent; color: var(--cp-ink); cursor: pointer; position: relative; }
.city-cat.city-locked .city-tile { opacity: 0.55; }
.city-tile { position: relative; }
.city-tile-lock { position: absolute; right: -5px; bottom: -5px; width: 16px; height: 16px; border-radius: 6px; background: var(--cp-paper); border: 2px solid var(--cp-line); color: var(--cp-ink); display: grid; place-items: center; }
.city-cat:hover { background: var(--cp-paper-2); }
.city-cat.city-open { background: #fff; border-color: var(--cp-line); }
.city-cat.city-on .city-tile { outline: 3px solid var(--cp-line); outline-offset: 1px; }
.city-cat .city-tile { width: 34px; height: 34px; border-radius: 10px; }
.city-cat-label { font: 700 10px/1 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; color: var(--cp-ink-2); }
.city-flyout-wrap { position: absolute; left: 106px; top: 76px; z-index: 7; display: flex; align-items: flex-start; gap: 8px; }
.city-flyout { width: 236px; padding: 8px; display: flex; flex-direction: column; gap: 3px; max-height: calc(100dvh - 160px); overflow-y: auto; }
.city-flyout-items { display: flex; flex-direction: column; gap: 3px; }
.city-flyout-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
.city-flyout-cols .city-flyout-item { padding: 5px 4px; }
.city-flyout-cols .city-flyout-text b { font-size: 12px; }
.city-flyout-cols .city-flyout-text small { font-size: 9.5px; }
.city-flyout:has(.city-flyout-cols) { width: 330px; }
.city-flyout-item.city-locked { opacity: 0.6; cursor: not-allowed; }
.city-flyout-item.city-locked:hover { background: transparent; }
.city-infocard { width: 240px; padding: 10px 12px; font: 500 12px/1.4 var(--font-sans); color: var(--cp-ink-2); }
.city-infocard-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.city-infocard-head .city-tile { width: 32px; height: 32px; border-radius: 9px; }
.city-infocard-head b { display: block; font: 700 14px/1.1 var(--font-display); color: var(--cp-ink); }
.city-infocard-head small { display: block; font: 600 10px/1.2 var(--font-mono); color: var(--cp-muted); margin-top: 2px; }
.city-infocard p { margin: 0 0 6px; }
.city-infocard ul { margin: 0; padding-left: 16px; font: 600 11px/1.5 var(--font-mono); color: var(--cp-ink-2); }
.city-infocard-lock { margin-top: 8px; padding: 6px 8px; border-radius: 8px; background: var(--cp-paper-2); font: 700 11px/1.2 var(--font-mono); color: var(--cp-ink); display: flex; align-items: center; gap: 6px; }
.city-flyout-title { font: 700 10px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); padding: 2px 4px 6px; }
.city-flyout-item { display: flex; align-items: center; gap: 10px; padding: 5px 6px; border-radius: 9px; border: 2px solid transparent; background: transparent; color: var(--cp-ink); cursor: pointer; text-align: left; }
.city-flyout-item:hover { background: var(--cp-paper-2); }
.city-flyout-item.city-on { background: #fff; border-color: var(--cp-line); }
.city-flyout-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.city-flyout-text b { font: 700 13px/1.1 var(--font-display); }
.city-flyout-text small { font: 600 10px/1.2 var(--font-mono); color: var(--cp-muted); }
.city-density { display: flex; gap: 4px; margin-top: 6px; padding-top: 8px; border-top: 2px dashed #E3D2B8; }
.city-density-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; height: 30px; border-radius: 8px; border: 2px solid var(--cp-line); background: var(--cp-paper-2); color: var(--cp-ink); font: 700 10.5px/1 var(--font-display); cursor: pointer; box-shadow: 0 2px 0 var(--cp-line); }
.city-density-btn.city-on { background: var(--cp-ink); color: #fff; }
.city-density-btn.city-locked { opacity: 0.55; cursor: not-allowed; }
.city-toolbadge { position: absolute; left: 112px; bottom: 10px; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 6px; pointer-events: none; }
.city-toolbadge b { font: 700 13px/1.1 var(--font-display); }
.city-toolbadge span { display: block; font: 700 10.5px/1.2 var(--font-mono); color: var(--cp-muted); margin-top: 2px; }

/* mobile dock */
.city-dock-compact { top: auto; bottom: 10px; left: 10px; right: 10px; width: auto; flex-direction: row; overflow-x: auto; padding: 4px; gap: 2px; scrollbar-width: none; }
.city-dock-compact::-webkit-scrollbar { display: none; }
.city-dock-compact .city-cat { flex: none; width: 60px; }
.city-dock-compact .city-cat-label { font-size: 9px; }
.city-flyout-wrap-compact { left: 10px; right: 10px; top: auto; bottom: 84px; }
.city-flyout-compact { width: 100%; max-height: 46dvh; }
.city-flyout-compact .city-flyout-items { display: grid; grid-template-columns: 1fr 1fr; }
.city-flyout-compact:has(.city-flyout-cols) { width: 100%; }

/* advisor speech bubbles */
.city-advisor { position: absolute; right: 10px; top: 76px; z-index: 5; display: flex; flex-direction: column; gap: 8px; width: min(320px, 42vw); }
.city-advice { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; font: 500 12.5px/1.4 var(--font-sans); color: var(--cp-ink-2); }
.city-advice .city-tile { width: 28px; height: 28px; border-radius: 8px; flex: none; }
.city-advice-text { flex: 1; }
.city-advice-show { flex: none; }

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

/* inspector extras */
.city-inspector-title { display: inline-flex; align-items: center; gap: 8px; }
.city-inspector-title .city-tile { width: 26px; height: 26px; border-radius: 8px; }
.city-status { padding: 7px 9px; border-radius: 8px; font: 500 12px/1.35 var(--font-sans); margin-bottom: 8px; border: 2px solid var(--cp-line); }
.city-status-ok { background: #DDF3E4; }
.city-status-warn { background: #FFEDB8; }
.city-status-bad { background: #FFD3CC; }
.city-problems { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.city-problems li { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--cp-paper-2); font: 500 11.5px/1.3 var(--font-sans); color: var(--cp-ink-2); }
.city-problems .city-tile { width: 24px; height: 24px; border-radius: 7px; flex: none; }
.city-problems b { display: block; font: 700 12px/1.2 var(--font-display); color: var(--cp-ink); }
.city-problems small { display: block; font-size: 11px; margin-top: 2px; }
.city-problems span:nth-child(2) { flex: 1; }

.city-next { margin: 0 0 8px; padding: 7px 9px; border-radius: 8px; border: 2px dashed var(--cp-purple); font: 500 11.5px/1.3 var(--font-sans); color: var(--cp-ink-2); }
.city-next b { display: block; font: 700 12px/1.2 var(--font-display); color: var(--cp-ink); margin-bottom: 4px; }
.city-next ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.city-next li { display: flex; align-items: flex-start; gap: 6px; }
.city-next li.city-done { color: var(--cp-muted); }
.city-next .city-check { width: 15px; height: 15px; border-radius: 5px; }
.city-next li > span:last-child { flex: 1; }
.city-meter-sm { display: block; width: 100%; height: 5px; margin: 3px 0 0; }
.city-spend { position: absolute; left: 132px; bottom: 60px; z-index: 6; font: 700 15px/1 var(--font-display); color: var(--cp-danger); text-shadow: 0 1px 0 #fff, 0 0 6px #fff; pointer-events: none; animation: city-float 1.1s ease-out forwards; }
@keyframes city-float { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-34px); opacity: 0; } }

/* sheets (budget, milestones, stats) */
.city-sheet { position: absolute; left: 50%; top: 76px; transform: translateX(-50%); z-index: 7; width: min(720px, calc(100% - 20px)); max-height: calc(100% - 90px); overflow: auto; padding: 12px 16px; }
.city-sheet-intro { margin: 0 0 10px; font: 500 12.5px/1.4 var(--font-sans); color: var(--cp-ink-2); }
.city-sheet-note { margin: 0 0 6px; font: 500 11px/1.4 var(--font-sans); color: var(--cp-muted); }
.city-sheet h4 { margin: 10px 0 6px; font: 700 10px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); display: flex; align-items: center; gap: 6px; }
.city-policies { display: flex; flex-direction: column; gap: 4px; }
.city-policy { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; font: 500 11.5px/1.3 var(--font-sans); color: var(--cp-ink-2); }
.city-policy:hover { background: var(--cp-paper-2); }
.city-policy.city-on { border-color: var(--cp-line); background: #fff; }
.city-policy input { margin: 3px 0 0; accent-color: var(--cp-good); }
.city-policy-text b { display: flex; justify-content: space-between; gap: 8px; font: 700 12px/1.2 var(--font-display); color: var(--cp-ink); }
.city-policy-text em { font: 600 10px/1.2 var(--font-mono); color: var(--cp-muted); font-style: normal; white-space: nowrap; }
.city-policy-text small { display: block; margin-top: 2px; font-size: 11px; }
.city-ladder { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.city-ladder-row { display: flex; gap: 10px; padding: 8px 10px; border-radius: 10px; border: 2px solid transparent; background: var(--cp-paper-2); opacity: 0.75; }
.city-ladder-row.city-done { opacity: 1; }
.city-ladder-row.city-current { border-color: var(--cp-line); background: #fff; opacity: 1; }
.city-ladder-row.city-next { opacity: 1; border-style: dashed; border-color: var(--cp-purple); }
.city-ladder-mark { width: 24px; height: 24px; border-radius: 8px; border: 2px solid var(--cp-line); display: grid; place-items: center; flex: none; background: var(--cp-paper); color: var(--cp-ink); }
.city-done .city-ladder-mark { background: var(--cp-good); color: #fff; }
.city-next .city-ladder-mark { background: var(--cp-purple); color: #fff; }
.city-ladder-body { flex: 1; min-width: 0; }
.city-ladder-title { display: flex; align-items: baseline; gap: 8px; font: 500 11px/1.2 var(--font-mono); color: var(--cp-muted); }
.city-ladder-title b { font: 700 14px/1.1 var(--font-display); color: var(--cp-ink); }
.city-ladder-title em { margin-left: auto; font-style: normal; font-weight: 700; color: var(--cp-good); }
.city-ladder-bar { margin: 6px 0 2px; }
.city-ladder-unlocks { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.city-unlock { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 7px 0 2px; border-radius: 7px; background: var(--cp-paper); border: 1.5px solid var(--cp-line); font: 700 10.5px/1 var(--font-display); color: var(--cp-ink); }
.city-unlock .city-tile { width: 18px; height: 18px; border-radius: 5px; }
.city-unlock-feature { padding-left: 6px; background: #EFE7FF; }
.city-stats-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; }
.city-spark { margin-bottom: 4px; }
.city-spark svg { display: block; width: 100%; height: 56px; border-radius: 8px; border: 2px solid var(--cp-line); background: #fff; }
.city-spark-vals { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-top: 3px; font: 600 10.5px/1.2 var(--font-mono); color: var(--cp-muted); }
.city-spark-vals b { font: 700 14px/1 var(--font-display); color: var(--cp-ink); font-variant-numeric: tabular-nums; }
.city-fact { display: flex; align-items: center; gap: 8px; padding: 3px 0; font: 500 12px/1.2 var(--font-sans); color: var(--cp-ink-2); }
.city-fact .city-tile { width: 22px; height: 22px; border-radius: 6px; }
.city-fact-label { flex: 1; }
.city-fact b { font: 700 12px/1 var(--font-display); color: var(--cp-ink); font-variant-numeric: tabular-nums; text-align: right; }

/* legend */
.city-legend { position: absolute; right: 10px; bottom: 44px; z-index: 5; width: 232px; padding: 8px 10px; font: 500 11.5px/1.35 var(--font-sans); color: var(--cp-ink-2); }
.city-legend-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.city-legend-head b { flex: 1; font: 700 13px/1 var(--font-display); color: var(--cp-ink); }
.city-legend-scale { display: flex; align-items: center; gap: 6px; font: 600 10px/1 var(--font-mono); color: var(--cp-muted); }
.city-legend-ramp { flex: 1; height: 10px; border-radius: 5px; border: 1.5px solid var(--cp-line); background: linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725); }
.city-legend-heat { background: linear-gradient(90deg, #ffffff, #ffc85a, #e65a28, #8c0a1e); }
.city-legend-binary { display: flex; gap: 12px; font: 600 10.5px/1 var(--font-mono); color: var(--cp-ink); }
.city-legend-binary i { display: inline-block; width: 12px; height: 12px; border-radius: 4px; border: 1.5px solid var(--cp-line); vertical-align: -2px; margin-right: 4px; }
.city-legend p { margin: 6px 0 0; }

/* onboarding checklist */
.city-onboarding { position: absolute; left: 112px; top: 76px; z-index: 5; width: 300px; padding: 10px 12px; font: 500 12px/1.4 var(--font-sans); color: var(--cp-ink-2); }
.city-onboarding-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.city-onboarding-head .city-tile { width: 26px; height: 26px; border-radius: 8px; }
.city-onboarding-head b { flex: 1; font: 700 14px/1 var(--font-display); color: var(--cp-ink); }
.city-onboarding-head small { font: 700 11px/1 var(--font-mono); color: var(--cp-muted); }
.city-onboarding ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.city-onboarding li { display: flex; align-items: flex-start; gap: 8px; }
.city-onboarding li.city-done { color: var(--cp-muted); text-decoration: line-through; }
.city-check { width: 18px; height: 18px; border-radius: 6px; border: 2px solid var(--cp-line); background: #fff; flex: none; display: grid; place-items: center; color: #fff; margin-top: 1px; }
.city-done .city-check { background: var(--cp-good); border-color: var(--cp-good); }
.city-onboarding p { margin: 8px 0 0; font-size: 11px; color: var(--cp-muted); }

/* notice banner */
.city-notice { position: absolute; left: 50%; bottom: 48px; transform: translateX(-50%); z-index: 8; width: min(520px, calc(100% - 20px)); padding: 10px 12px; animation: city-pop 320ms cubic-bezier(.2,1.4,.4,1); }
@keyframes city-pop { from { transform: translateX(-50%) scale(0.85); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }
.city-notice-head { display: flex; align-items: flex-start; gap: 10px; }
.city-notice-head .city-tile { width: 36px; height: 36px; border-radius: 10px; flex: none; }
.city-notice-head > div { flex: 1; }
.city-notice-head b { display: block; font: 700 17px/1.1 var(--font-display); color: var(--cp-ink); }
.city-notice-head small { display: block; margin-top: 3px; font: 500 12px/1.35 var(--font-sans); color: var(--cp-ink-2); }
.city-notice-unlocks { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 8px; padding-top: 8px; border-top: 2px dashed #E3D2B8; }
.city-notice-label { font: 700 10px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--cp-muted); margin-right: 4px; }
.city-notice-unlocks .city-btn { margin-left: auto; }

/* debug */
.city-debug { position: absolute; right: 10px; top: 76px; bottom: 10px; z-index: 8; width: 330px; overflow: auto; padding: 10px 12px; font: 500 11.5px/1.3 var(--font-mono); }
.city-debug-actions { display: flex; gap: 6px; margin-bottom: 8px; }
.city-debug-kv th { width: 52%; }
.city-debug-tuning { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; margin-top: 10px; }
.city-debug-tuning label { display: flex; flex-direction: column; gap: 2px; font-size: 10px; color: var(--cp-muted); }
.city-debug-tuning input { font: 600 11px/1 var(--font-mono); height: 24px; padding: 0 6px; border: 2px solid var(--cp-line); border-radius: 6px; background: #fff; color: var(--cp-ink); width: 100%; box-sizing: border-box; }

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
  .city-budget-cols, .city-stats-grid { grid-template-columns: 1fr; }
  .city-chips, .city-legend, .city-onboarding { display: none; }
  .city-milestone-text { display: none; }
  .city-sheet { top: 66px; max-height: calc(100% - 160px); }
  .city-notice { bottom: 100px; }
  .city-advisor { top: auto; bottom: 86px; left: 10px; right: 10px; width: auto; }
  .city-inspector { bottom: 86px; left: 10px; right: 10px; width: auto; }
  .city-hint, .city-toolbadge { display: none; }
  .city-advisor { bottom: 96px; }
  .city-inspector { bottom: 96px; }
  .city-topbar { gap: 8px; padding: 6px 8px; }
  .city-stat-value { font-size: 13px; }
  .city-view-menu { grid-template-columns: repeat(2, 120px); }
}
`;
