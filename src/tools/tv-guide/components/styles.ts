// The guide's one stylesheet, injected as a <style> string by GuideShell in
// both the prerendered and live trees. Class-based so the diagrams animate
// without JavaScript. Everything is namespaced `tvg-`.

export const GUIDE_STYLES = `
:root {
  --tvg-backlight: oklch(0.82 0.16 85);
  --tvg-backlight-ink: oklch(0.35 0.10 70);
  --tvg-guide: oklch(0.90 0.03 240);
  --tvg-diffuser: oklch(0.93 0.01 250);
  --tvg-qd: oklch(0.78 0.16 340);
  --tvg-tft: oklch(0.72 0.03 260);
  --tvg-lc: oklch(0.84 0.08 200);
  --tvg-filter: oklch(0.88 0.06 150);
  --tvg-glass: oklch(0.95 0.02 230);
  --tvg-emitter: oklch(0.80 0.15 45);
  --tvg-slab-edge: oklch(0.45 0.02 260 / 0.35);
  --tvg-label: var(--ink-2);
  --tvg-panel: oklch(0.16 0.01 260);
  --tvg-panel-edge: oklch(0.35 0.01 260);
  --tvg-white: oklch(0.80 0.14 90);
  --tvg-blue: oklch(0.65 0.20 255);
  --tvg-r: oklch(0.62 0.22 25);
  --tvg-g: oklch(0.72 0.20 145);
  --tvg-b: oklch(0.62 0.20 255);
  --tvg-halo: oklch(0.85 0.05 90);
  --tvg-lcd: oklch(0.55 0.15 235);
  --tvg-lcd-soft: oklch(0.93 0.04 235);
  --tvg-oled: oklch(0.55 0.18 320);
  --tvg-oled-soft: oklch(0.94 0.05 320);
  --tvg-new: oklch(0.62 0.15 60);
  --tvg-new-soft: oklch(0.95 0.06 60);
  --tvg-ink-on: oklch(0.995 0.005 80);
}
:root[data-theme="dark"] {
  --tvg-backlight: oklch(0.78 0.15 85);
  --tvg-backlight-ink: oklch(0.20 0.06 70);
  --tvg-guide: oklch(0.42 0.04 240);
  --tvg-diffuser: oklch(0.48 0.01 250);
  --tvg-qd: oklch(0.66 0.16 340);
  --tvg-tft: oklch(0.45 0.03 260);
  --tvg-lc: oklch(0.55 0.09 200);
  --tvg-filter: oklch(0.55 0.08 150);
  --tvg-glass: oklch(0.60 0.03 230);
  --tvg-emitter: oklch(0.72 0.15 45);
  --tvg-slab-edge: oklch(0.90 0.02 260 / 0.35);
  --tvg-label: var(--ink-2);
  --tvg-panel: oklch(0.10 0.005 260);
  --tvg-panel-edge: oklch(0.30 0.01 260);
  --tvg-white: oklch(0.90 0.11 90);
  --tvg-lcd: oklch(0.72 0.13 235);
  --tvg-lcd-soft: oklch(0.30 0.05 235);
  --tvg-oled: oklch(0.74 0.15 320);
  --tvg-oled-soft: oklch(0.30 0.06 320);
  --tvg-new: oklch(0.78 0.14 65);
  --tvg-new-soft: oklch(0.32 0.07 65);
  --tvg-ink-on: oklch(0.16 0.01 260);
}

.tvg-wrap { width: 100%; max-width: 980px; margin: 0 auto; padding: var(--page-pad-top) var(--page-pad-x) var(--page-pad-bot); box-sizing: border-box; display: flex; flex-direction: column; gap: 28px; }
.tvg-section { display: flex; flex-direction: column; gap: 14px; }
.tvg-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.tvg-cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.tvg-cols.tvg-cols-wide { grid-template-columns: 1.15fr 1fr; }
.tvg-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.tvg-card { display: flex; flex-direction: column; gap: 8px; padding: 16px 18px; border-radius: var(--radius-xl); background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-card); color: inherit; text-decoration: none; }
a.tvg-card { transition: transform .15s ease, box-shadow .15s ease; }
a.tvg-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-pop); }

.tvg-nav { display: flex; gap: 4px; padding: 4px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: var(--radius-pill); overflow-x: auto; scrollbar-width: none; }
.tvg-nav::-webkit-scrollbar { display: none; }
.tvg-nav a { flex: 1 0 auto; text-align: center; height: 32px; line-height: 32px; padding: 0 14px; border-radius: var(--radius-pill); color: var(--ink-3); font-size: 13px; font-weight: 500; text-decoration: none; white-space: nowrap; transition: background-color 140ms ease, color 140ms ease; }
.tvg-nav a:hover { color: var(--ink); }
.tvg-nav a[aria-current="page"] { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-card); }

.tvg-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; background: var(--surface-2); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); }
.tvg-tabs::-webkit-scrollbar { display: none; }
.tvg-tab { flex: 0 0 auto; height: 32px; padding: 0 12px; border: none; border-radius: var(--radius-md); background: transparent; color: var(--ink-3); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; text-decoration: none; line-height: 32px; transition: background-color 140ms ease, color 140ms ease; }
.tvg-tab:hover { color: var(--ink); }
.tvg-tab[aria-selected="true"], .tvg-tab[aria-current="true"] { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-card); }

.tvg-pill { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: var(--radius-pill); border: 1px solid var(--border); background: var(--surface); color: var(--ink-2); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; white-space: nowrap; }
.tvg-pill:hover { border-color: var(--border-strong); color: var(--ink); }
.tvg-pill[aria-pressed="true"], .tvg-pill[aria-checked="true"] { background: var(--accent-tint); border-color: var(--accent-soft); color: var(--accent-ink); }
.tvg-pill:disabled { opacity: 0.5; cursor: not-allowed; }
.tvg-chip { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: var(--radius-pill); font-size: 12px; font-weight: 600; letter-spacing: 0.01em; text-decoration: none; white-space: nowrap; }
.tvg-chip-lcd { background: var(--tvg-lcd-soft); color: var(--tvg-lcd); }
.tvg-chip-oled { background: var(--tvg-oled-soft); color: var(--tvg-oled); }
.tvg-chip-new { background: var(--tvg-new-soft); color: var(--tvg-new); }
.tvg-chip-muted { background: var(--surface-3); color: var(--ink-3); }
a.tvg-chip:hover { filter: brightness(0.95); }

.tvg-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border); border-radius: var(--radius-xl); background: var(--surface); box-shadow: var(--shadow-card); }
.tvg-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
.tvg-table caption { text-align: left; padding: 12px 16px 4px; font-size: 12px; color: var(--ink-3); }
.tvg-table th, .tvg-table td { padding: 10px 14px; text-align: left; vertical-align: top; border-top: 1px solid var(--border-soft); }
.tvg-table thead th { border-top: none; background: var(--surface-2); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); position: sticky; top: 0; z-index: 1; }
.tvg-table th:first-child, .tvg-table td:first-child { position: sticky; left: 0; background: var(--surface); z-index: 2; }
.tvg-table thead th:first-child { background: var(--surface-2); z-index: 3; }
.tvg-table tbody tr:nth-child(even) td, .tvg-table tbody tr:nth-child(even) th { background: var(--surface-2); }
.tvg-table td.tvg-best { box-shadow: inset 3px 0 0 var(--positive); }

.tvg-rating { display: inline-flex; gap: 3px; align-items: center; }
.tvg-rating i { width: 14px; height: 8px; border-radius: 2px; background: var(--surface-3); }
.tvg-rating i.on { background: var(--accent); }
.tvg-rating.bad i.on { background: var(--caution); }
.tvg-rating.good i.on { background: var(--positive); }

.tvg-callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--radius-lg); border: 1px solid var(--caution-soft); background: color-mix(in oklch, var(--caution-soft) 35%, var(--surface)); color: var(--ink-2); font-size: 14px; line-height: 1.55; }
.tvg-callout.info { border-color: var(--accent-soft); background: var(--accent-tint); }

.tvg-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; line-height: 1.45; color: var(--ink-2); }
.tvg-legend li { display: grid; grid-template-columns: 14px 1fr; gap: 10px; align-items: start; padding: 6px 8px; border-radius: var(--radius-md); }
.tvg-legend li i { width: 14px; height: 14px; border-radius: 4px; margin-top: 3px; border: 1px solid var(--tvg-slab-edge); }
.tvg-legend button { all: unset; cursor: pointer; display: block; width: 100%; }
.tvg-legend li[aria-current="true"] { background: var(--accent-tint); }
.tvg-legend b { color: var(--ink); font-weight: 600; }

.tvg-svg { display: block; width: 100%; height: auto; }
.tvg-slab { stroke: var(--tvg-slab-edge); stroke-width: 1; transition: opacity 160ms ease; }
.tvg-dim .tvg-slab:not(.tvg-hi) { opacity: 0.28; }
.tvg-dim .tvg-slab-label:not(.tvg-hi) { opacity: 0.4; }
.tvg-slab-label { font-family: var(--font-sans); font-size: 11.5px; fill: var(--tvg-label); }
.tvg-ray { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 6 8; }
.tvg-anim.tvg-ray { animation: tvg-flow 1.1s linear infinite; }
.tvg-anim.tvg-glow { animation: tvg-pulse 1.8s ease-in-out infinite; }
.tvg-anim.tvg-bloom { animation: tvg-bloom 2.4s ease-in-out infinite; }
.tvg-anim.tvg-rgb-r { animation: tvg-rgb-r 3s ease-in-out infinite; }
.tvg-anim.tvg-rgb-g { animation: tvg-rgb-g 3s ease-in-out infinite; }
.tvg-anim.tvg-rgb-b { animation: tvg-rgb-b 3s ease-in-out infinite; }
.tvg-anim.tvg-rgb-mix { animation: tvg-rgb-mix 3s ease-in-out infinite; }

@keyframes tvg-flow { from { stroke-dashoffset: 28; } to { stroke-dashoffset: 0; } }
@keyframes tvg-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes tvg-bloom { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
@keyframes tvg-rgb-r { 0%, 100% { opacity: 1; } 33% { opacity: 0.25; } 66% { opacity: 0.25; } }
@keyframes tvg-rgb-g { 0%, 100% { opacity: 0.25; } 33% { opacity: 1; } 66% { opacity: 0.25; } }
@keyframes tvg-rgb-b { 0%, 100% { opacity: 0.25; } 33% { opacity: 0.25; } 66% { opacity: 1; } }
@keyframes tvg-rgb-mix { 0%, 100% { fill: var(--tvg-r); } 33% { fill: var(--tvg-g); } 66% { fill: var(--tvg-b); } }

@media (prefers-reduced-motion: reduce) {
  .tvg-anim { animation: none !important; }
}
@media (max-width: 720px) {
  .tvg-wrap { padding-top: 16px; gap: 22px; }
  .tvg-cols, .tvg-cols-3, .tvg-cols.tvg-cols-wide { grid-template-columns: 1fr; }
  .tvg-nav a { flex: 0 0 auto; }
  .tvg-tabs { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .tvg-hide-mobile { display: none !important; }
}
`;
