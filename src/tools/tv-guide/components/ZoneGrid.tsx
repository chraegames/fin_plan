// A dark panel with one bright object, showing how backlight zones light up
// around it (halo / blooming) versus a self-emissive panel where only the
// object's own pixels glow. PURE; the halo pulses via CSS.

interface ZoneGridProps {
  idPrefix: string;
  cols: number;
  rows: number;
  mode: 'zones' | 'pixels';
  title: string;
  caption: string;
}

export function ZoneGrid({ idPrefix, cols, rows, mode, title, caption }: ZoneGridProps) {
  const W = 320;
  const H = 190;
  const pad = 8;
  const pw = W - pad * 2;
  const ph = H - pad * 2;
  const cx = 214;
  const cy = 74;
  const r = 22;
  const cw = pw / cols;
  const ch = ph / rows;
  const lit: { x: number; y: number }[] = [];
  if (mode === 'zones') {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = pad + i * cw;
        const y = pad + j * ch;
        // nearest point on the cell to the circle centre
        const nx = Math.max(x, Math.min(cx, x + cw));
        const ny = Math.max(y, Math.min(cy, y + ch));
        if (Math.hypot(nx - cx, ny - cy) <= r + 2) lit.push({ x, y });
      }
    }
  }
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      <svg className="tvg-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${caption}`} style={{ maxWidth: 360 }}>
        <defs>
          <radialGradient id={`${idPrefix}-halo`}>
            <stop offset="0%" stopColor="var(--tvg-halo)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--tvg-halo)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} rx={10} fill="var(--tvg-panel)" stroke="var(--tvg-panel-edge)" />
        {lit.map((c, i) => (
          <rect key={`${idPrefix}-z${i}`} x={c.x} y={c.y} width={cw} height={ch} fill="var(--tvg-halo)" opacity={0.35} className="tvg-anim tvg-bloom" />
        ))}
        {mode === 'zones' &&
          Array.from({ length: cols - 1 }, (_, i) => (
            <line key={`${idPrefix}-v${i}`} x1={pad + (i + 1) * cw} y1={pad} x2={pad + (i + 1) * cw} y2={pad + ph} stroke="var(--tvg-panel-edge)" strokeWidth={0.6} opacity={0.6} />
          ))}
        {mode === 'zones' &&
          Array.from({ length: rows - 1 }, (_, j) => (
            <line key={`${idPrefix}-h${j}`} x1={pad} y1={pad + (j + 1) * ch} x2={pad + pw} y2={pad + (j + 1) * ch} stroke="var(--tvg-panel-edge)" strokeWidth={0.6} opacity={0.6} />
          ))}
        {mode === 'zones' && <circle cx={cx} cy={cy} r={r * 2.2} fill={`url(#${idPrefix}-halo)`} className="tvg-anim tvg-bloom" />}
        <circle cx={cx} cy={cy} r={r} fill="var(--tvg-halo)" />
        <text x={pad + 10} y={H - pad - 10} fill="var(--tvg-panel-edge)" style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5 }}>
          {mode === 'zones' ? `${cols * rows} dimming zones` : 'every pixel is its own light'}
        </text>
      </svg>
      <figcaption style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{caption}</figcaption>
    </figure>
  );
}
