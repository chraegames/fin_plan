// Go — injected CSS (namespaced go-*). The board keeps a classic warm-wood
// look in both themes; stones are fixed colours so "black" stays black in
// dark mode. Hover ghosts are CSS-only and disabled on touch devices.

export const GO_STYLES = `
:root {
  --go-board: #E2C27A;
  --go-line: #5C4620;
  --go-black: #17181A;
  --go-black-edge: #000000;
  --go-white: #F6F3EB;
  --go-white-edge: #B6B0A3;
}
:root[data-theme="dark"] {
  --go-board: #8A7040;
  --go-line: #2A2010;
  --go-black: #0F1011;
  --go-black-edge: #000000;
  --go-white: #E9E5DB;
  --go-white-edge: #5E594E;
}
.go-svg { display: block; width: 100%; height: auto; user-select: none; -webkit-tap-highlight-color: transparent; }
.go-hit { cursor: pointer; }
.go-ghost { opacity: 0; transition: opacity 80ms linear; }
.go-hit:hover .go-ghost { opacity: 0.5; }
@media (hover: none) {
  .go-hit:hover .go-ghost { opacity: 0; }
}
@keyframes go-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
.go-pulse { animation: go-pulse 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .go-pulse { animation: none; opacity: 1; }
}
.go-seg { display: inline-flex; border: 1px solid var(--border-strong); border-radius: var(--radius-md); overflow: hidden; }
.go-seg button {
  appearance: none; border: 0; background: var(--surface); color: var(--ink-2);
  font: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer;
  border-right: 1px solid var(--border-strong);
}
.go-seg button:last-child { border-right: 0; }
.go-seg button[aria-pressed="true"] { background: var(--accent); color: var(--accent-contrast); }
.go-seg button:hover:not([aria-pressed="true"]) { background: var(--surface-2); }
.go-code-input {
  font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.18em; text-transform: uppercase;
  width: 6.2em; height: 34px; padding: 0 10px; box-sizing: border-box;
  border: 1px solid var(--border-strong); border-radius: var(--radius-md);
  background: var(--surface); color: var(--ink);
}
.go-code-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
`;
