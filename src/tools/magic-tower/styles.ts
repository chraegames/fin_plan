// Magic Tower — injected CSS (namespaced mt-*). The board keeps its fixed
// pixel-art palette in both themes; the chrome uses the site tokens.

export const MT_STYLES = `
.mt-root { display: grid; gap: 16px; grid-template-columns: 224px minmax(0, 1fr) 280px; align-items: start; }
.mt-root.mt-mobile { grid-template-columns: minmax(0, 1fr); }
.mt-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 12px 14px; }
.mt-canvas-wrap { position: relative; width: 100%; max-width: 528px; margin: 0 auto; aspect-ratio: 1 / 1; background: #0e0f16; border: 1px solid var(--border-strong); border-radius: 6px; overflow: hidden; }
.mt-canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; touch-action: manipulation; cursor: crosshair; }
.mt-stat { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-mono); font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid var(--border-soft); }
.mt-stat b { font-size: 14px; color: var(--ink); font-variant-numeric: tabular-nums; }
.mt-stat span { color: var(--ink-3); white-space: nowrap; }
.mt-keys { display: flex; gap: 10px; font-family: var(--font-mono); font-size: 12px; margin-top: 8px; }
.mt-key { display: inline-flex; align-items: center; gap: 4px; }
.mt-key i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.mt-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-index); margin: 10px 0 6px; }
.mt-mon { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 4px; border-bottom: 1px solid var(--border-soft); font-size: 12.5px; }
.mt-mon.mt-hi { background: var(--accent-tint); }
.mt-mon canvas { width: 32px; height: 32px; image-rendering: pixelated; }
.mt-mon .mt-name { color: var(--ink); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mt-mon .mt-sub { color: var(--ink-3); font-family: var(--font-mono); font-size: 11px; }
.mt-dmg { font-family: var(--font-mono); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.mt-dmg.mt-ok { color: var(--positive); }
.mt-dmg.mt-bad { color: var(--negative); }
.mt-dmg small { display: block; font-size: 10px; color: var(--ink-muted); }
.mt-log { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-3); max-height: 140px; overflow: auto; line-height: 1.5; }
.mt-log div:last-child { color: var(--ink); }
.mt-ledger { font-family: var(--font-mono); font-size: 12px; line-height: 1.6; }
.mt-ledger .mt-neg { color: var(--negative); }
.mt-ledger .mt-pos { color: var(--positive); }
.mt-btnrow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.mt-dpad { display: grid; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(3, 56px); gap: 6px; justify-content: center; margin: 12px auto 0; }
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
.mt-toast { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); background: rgba(20, 18, 28, 0.88); color: #f4efe6; font-family: var(--font-mono); font-size: 12px; padding: 6px 10px; border-radius: 4px; pointer-events: none; white-space: nowrap; }
.mt-progress { text-align: center; padding: 40px 0; color: var(--ink-2); font-family: var(--font-mono); }
.mt-hollow { display: flex; gap: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); margin-top: 8px; }
.mt-hollow b { color: var(--ink); }
.mt-kbd { font-family: var(--font-mono); font-size: 11px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 3px; padding: 0 4px; }
.mt-slots { display: grid; gap: 8px; }
.mt-slot { display: flex; justify-content: space-between; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 8px 10px; font-size: 13px; }
.mt-slot small { color: var(--ink-3); font-family: var(--font-mono); font-size: 11px; }
@media (max-width: 720px) {
  .mt-card { padding: 10px 12px; }
  .mt-statrow { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px 14px; }
}
`;
