// Magic Tower — injected CSS (namespaced mt-*). The game frame keeps its own
// fixed dark palette in both site themes (like a classic 魔塔 screen); the
// dialogs use the site tokens.

export const MT_STYLES = `
:root {
  --mt-bg: #0a0a0e;
  --mt-gold: #e2c04a;
  --mt-gold-dim: #8a7530;
  --mt-text: #f3ecd6;
  --mt-muted: #9c957f;
  --mt-white: #ffffff;
}
.mt-frame { display: grid; grid-template-columns: 210px minmax(0, 1fr); width: min(1120px, 100%, calc(100vh - 150px)); background: var(--mt-bg); border: 3px solid var(--mt-gold); border-radius: 4px; box-shadow: 0 0 0 1px #000, 0 20px 60px rgba(0,0,0,0.35); color: var(--mt-text); font-family: var(--font-mono); max-width: 1120px; margin: 0 auto; overflow: hidden; }
.mt-frame.mt-mobile { grid-template-columns: minmax(0, 1fr); width: 100%; }
.mt-side { border-right: 2px solid var(--mt-gold); padding: 14px 14px 10px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mt-mobile .mt-side { border-right: 0; border-bottom: 2px solid var(--mt-gold); padding: 10px 12px; }
.mt-mobile .mt-status { display: none; }
.mt-mobile .mt-hollow { grid-template-columns: 1fr 1fr; }
.mt-side-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.mt-side-head canvas { width: 40px; height: 40px; image-rendering: pixelated; }
.mt-side-head .mt-title { color: var(--mt-gold); font-size: 15px; font-weight: 700; line-height: 1.25; }
.mt-side-head .mt-floor { color: var(--mt-gold); font-size: 22px; font-weight: 700; letter-spacing: 0.04em; }
.mt-stats { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 3px; align-items: baseline; }
.mt-mobile .mt-stats { grid-template-columns: auto 1fr auto 1fr; }
.mt-stats .k { color: var(--mt-gold); font-size: 15px; font-weight: 600; white-space: nowrap; }
.mt-stats .v { color: var(--mt-white); font-size: 18px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.mt-rule { border: 0; border-top: 1px solid var(--mt-gold-dim); margin: 6px 0; }
.mt-icons { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
.mt-mobile .mt-icons { grid-template-columns: repeat(4, 1fr); }
.mt-icon { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; color: var(--mt-white); font-variant-numeric: tabular-nums; }
.mt-icon canvas { width: 24px; height: 24px; image-rendering: pixelated; flex: none; }
.mt-icon.mt-y { color: #f0cc5a; } .mt-icon.mt-b { color: #9ab8ff; } .mt-icon.mt-r { color: #ff8a80; }
.mt-hollow { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 12.5px; color: var(--mt-muted); }
.mt-hollow b { color: var(--mt-white); font-weight: 700; }
.mt-hollow b.mt-on { color: #7ee787; }
.mt-perks { font-size: 12px; color: var(--mt-muted); line-height: 1.5; }
.mt-status { margin-top: auto; padding-top: 8px; font-size: 12.5px; color: var(--mt-muted); line-height: 1.45; min-height: 2.9em; }
.mt-status b { color: var(--mt-text); font-weight: 600; }
.mt-board { position: relative; background: #000; aspect-ratio: 1 / 1; min-width: 0; }
.mt-canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; touch-action: manipulation; cursor: crosshair; }
.mt-toast { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); background: rgba(8, 8, 12, 0.92); border: 1px solid var(--mt-gold-dim); color: var(--mt-text); font-family: var(--font-mono); font-size: 13px; padding: 6px 12px; border-radius: 3px; pointer-events: none; white-space: nowrap; max-width: 92%; overflow: hidden; text-overflow: ellipsis; }
.mt-ledger-pop { position: absolute; left: 12px; right: 12px; bottom: 12px; background: rgba(10, 10, 14, 0.94); border: 1px solid var(--mt-gold); border-radius: 4px; padding: 10px 12px; font-size: 13px; line-height: 1.5; color: var(--mt-text); }
.mt-ledger-pop .mt-neg { color: #ff8a80; } .mt-ledger-pop .mt-pos { color: #7ee787; } .mt-ledger-pop .mt-note { color: var(--mt-muted); }
.mt-ledger-pop .mt-sum { border-top: 1px solid var(--mt-gold-dim); margin-top: 6px; padding-top: 6px; color: var(--mt-white); font-weight: 600; }
.mt-toolbar { grid-column: 1 / -1; border-top: 2px solid var(--mt-gold); display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; align-items: center; }
.mt-tool { appearance: none; background: #16161d; color: var(--mt-text); border: 1px solid var(--mt-gold-dim); border-radius: 3px; font-family: var(--font-mono); font-size: 12.5px; font-weight: 600; padding: 7px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; line-height: 1; }
.mt-tool:hover:not(:disabled) { border-color: var(--mt-gold); background: #1f1f28; }
.mt-tool:disabled { opacity: 0.4; cursor: default; }
.mt-tool kbd { font-family: inherit; font-size: 10px; color: var(--mt-gold); border: 1px solid var(--mt-gold-dim); border-radius: 2px; padding: 1px 4px; }
.mt-tool.mt-primary { background: var(--mt-gold); color: #14120a; border-color: var(--mt-gold); }
.mt-tool.mt-primary:hover:not(:disabled) { background: #f0d060; }
.mt-toolbar .mt-spacer { flex: 1; }
.mt-dpad { display: grid; grid-template-columns: repeat(3, 52px); grid-template-rows: repeat(3, 52px); gap: 6px; justify-content: center; margin: 10px auto 0; }
.mt-dpad button { appearance: none; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--ink); border-radius: var(--radius-md); font-size: 20px; box-shadow: inset 0 1px 0 var(--key-highlight); }
.mt-dpad button:active { background: var(--surface-3); }
.mt-overlay { position: fixed; inset: 0; background: rgba(10, 12, 16, 0.6); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 16px; }
.mt-modal { background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-2xl); box-shadow: var(--shadow-pop); width: min(560px, 100%); max-height: 90vh; overflow: auto; padding: 18px 20px; }
.mt-modal h2 { font-family: var(--font-display); font-weight: 500; font-size: 20px; margin: 0 0 6px; color: var(--ink); }
.mt-modal p { color: var(--ink-2); font-size: 13.5px; line-height: 1.55; margin: 6px 0; }
.mt-perk { display: block; width: 100%; text-align: left; appearance: none; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--ink); border-radius: var(--radius-lg); padding: 10px 12px; margin: 8px 0; cursor: pointer; box-shadow: inset 0 1px 0 var(--key-highlight); }
.mt-perk:hover { background: var(--surface-3); }
.mt-perk b { display: block; font-size: 14px; }
.mt-perk span { font-size: 12.5px; color: var(--ink-3); }
.mt-loop { display: grid; grid-template-columns: 40px 1fr auto; gap: 10px; align-items: center; padding: 10px 6px; border-bottom: 1px solid var(--border-soft); }
.mt-loop .mt-num { font-family: var(--font-mono); color: var(--ink-index); font-size: 12px; }
.mt-loop h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.mt-loop p { margin: 2px 0 0; font-size: 12.5px; color: var(--ink-3); }
.mt-loop.mt-locked { opacity: 0.5; }
.mt-progress { text-align: center; padding: 40px 0; color: var(--ink-2); font-family: var(--font-mono); }
.mt-kbd { font-family: var(--font-mono); font-size: 11px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 3px; padding: 0 4px; }
.mt-slots { display: grid; gap: 8px; }
.mt-slot { display: flex; justify-content: space-between; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 8px 10px; font-size: 13px; }
.mt-slot small { color: var(--ink-3); font-family: var(--font-mono); font-size: 11px; }
.mt-btnrow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
/* Monster manual table */
.mt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mt-table th { text-align: left; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-index); padding: 6px 8px; border-bottom: 1px solid var(--border-strong); white-space: nowrap; }
.mt-table td { padding: 7px 8px; border-bottom: 1px solid var(--border-soft); vertical-align: middle; font-variant-numeric: tabular-nums; }
.mt-table td.num, .mt-table th.num { text-align: right; font-family: var(--font-mono); }
.mt-table tr:nth-child(even) td { background: var(--surface-2); }
.mt-table tr.mt-hi td { background: var(--accent-tint); }
.mt-table canvas { width: 32px; height: 32px; image-rendering: pixelated; display: block; }
.mt-table .mt-name { font-weight: 600; color: var(--ink); white-space: nowrap; }
.mt-table .mt-count { color: var(--ink-3); font-family: var(--font-mono); font-size: 11px; margin-left: 6px; }
.mt-tag { display: inline-block; font-family: var(--font-mono); font-size: 10.5px; padding: 1px 6px; border-radius: 3px; background: var(--accent-tint); color: var(--accent-ink); margin: 1px 3px 1px 0; white-space: nowrap; }
.mt-dmg { font-family: var(--font-mono); font-weight: 700; font-size: 14px; }
.mt-dmg.mt-ok { color: var(--positive); } .mt-dmg.mt-mid { color: var(--caution); } .mt-dmg.mt-bad { color: var(--negative); }
.mt-next { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-3); white-space: nowrap; line-height: 1.5; }
.mt-legend { font-size: 12px; color: var(--ink-3); margin-top: 10px; line-height: 1.5; }
.mt-table-wrap { overflow-x: auto; }
@media (max-width: 720px) {
  .mt-modal { padding: 14px; }
}
`;
