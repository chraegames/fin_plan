// Namespaced styles for the City tool, injected once by App.

export const CITY_STYLES = `
.city-root { display: flex; flex-direction: column; height: calc(100dvh - 56px); min-height: 420px; position: relative; background: var(--bg); }
.city-viewport { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.city-viewport canvas { display: block; width: 100%; height: 100%; outline: none; cursor: crosshair; }
.city-viewport.city-pan canvas { cursor: grab; }
.city-loading { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-mono); font-size: 12px; color: var(--ink-3); background: var(--bg); }
.city-hud { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: stretch; gap: 8px; padding: 8px 10px; pointer-events: none; z-index: 5; }
.city-hud > * { pointer-events: auto; }
.city-panel { background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: blur(8px); border: 1px solid var(--border-strong); border-radius: 6px; box-shadow: var(--shadow-pop); }
.city-topbar { display: flex; align-items: center; gap: 14px; padding: 6px 12px; font-family: var(--font-mono); font-size: 12px; color: var(--ink-2); flex-wrap: wrap; }
.city-topbar b { color: var(--ink); font-weight: 500; }
.city-stat { display: flex; flex-direction: column; gap: 1px; min-width: 64px; }
.city-stat span:first-child { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-index); }
.city-stat span:last-child { font-size: 13px; color: var(--ink); }
.city-hint { position: absolute; left: 10px; bottom: 10px; z-index: 5; font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); background: color-mix(in srgb, var(--surface) 80%, transparent); padding: 4px 8px; border-radius: 4px; pointer-events: none; }
`;
