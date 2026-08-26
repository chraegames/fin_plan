// Blue LED + quantum dots + filter (conventional) versus RGB LEDs (colour made
// at the source). PURE; the LEDs cycle via CSS.

interface Props {
  idPrefix: string;
}

const RGB = ['var(--tvg-r)', 'var(--tvg-g)', 'var(--tvg-b)'];

function Arrow({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g stroke="var(--tvg-slab-edge)" strokeWidth={1.4} fill="none">
      <line x1={x} y1={y} x2={x + w} y2={y} />
      <polyline points={`${x + w - 6},${y - 4} ${x + w},${y} ${x + w - 6},${y + 4}`} />
    </g>
  );
}

function Filter({ x, y, idPrefix }: { x: number; y: number; idPrefix: string }) {
  return (
    <g>
      <rect x={x} y={y - 26} width={14} height={52} rx={3} fill="var(--tvg-filter)" stroke="var(--tvg-slab-edge)" />
      {RGB.map((c, i) => (
        <rect key={`${idPrefix}-f${i}`} x={x + 3} y={y - 22 + i * 16} width={8} height={12} rx={1.5} fill={c} opacity={0.9} />
      ))}
    </g>
  );
}

function Outputs({ x, y, idPrefix, strong }: { x: number; y: number; idPrefix: string; strong: boolean }) {
  return (
    <g>
      {RGB.map((c, i) => (
        <g key={`${idPrefix}-o${i}`}>
          <line x1={x} y1={y - 16 + i * 16} x2={x + 34} y2={y - 16 + i * 16} stroke={c} strokeWidth={strong ? 3.2 : 2} className="tvg-ray tvg-anim" strokeDasharray="5 7" />
        </g>
      ))}
    </g>
  );
}

export function RgbBacklight({ idPrefix }: Props) {
  const W = 330;
  const H = 120;
  const y = 60;
  return (
    <div className="tvg-cols">
      <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Conventional: blue LED → quantum dots → filter</div>
        <svg className="tvg-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A blue LED shines through a quantum-dot film to make white light, then a colour filter throws most of it away to make red, green and blue" style={{ maxWidth: 360 }}>
          <circle cx={26} cy={y} r={11} fill="var(--tvg-blue)" className="tvg-anim tvg-glow" />
          <text x={26} y={y + 30} textAnchor="middle" className="tvg-slab-label">blue LED</text>
          <Arrow x={42} y={y} w={30} />
          <rect x={76} y={y - 26} width={16} height={52} rx={3} fill="var(--tvg-qd)" stroke="var(--tvg-slab-edge)" />
          <text x={84} y={y + 44} textAnchor="middle" className="tvg-slab-label">QD film</text>
          <line x1={98} y1={y} x2={150} y2={y} stroke="var(--tvg-white)" strokeWidth={3} className="tvg-ray tvg-anim" strokeDasharray="5 7" />
          <text x={124} y={y - 14} textAnchor="middle" className="tvg-slab-label">white</text>
          <Arrow x={150} y={y} w={22} />
          <Filter x={178} y={y} idPrefix={`${idPrefix}-a`} />
          <text x={185} y={y + 44} textAnchor="middle" className="tvg-slab-label">filter</text>
          <Outputs x={200} y={y} idPrefix={`${idPrefix}-a`} strong={false} />
          <text x={258} y={y + 44} textAnchor="start" className="tvg-slab-label">~⅔ of the light</text>
          <text x={258} y={y + 56} textAnchor="start" className="tvg-slab-label">is blocked</text>
        </svg>
        <figcaption style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          White light has to be filtered down to red, green and blue — each sub-pixel throws away the colours it does not need.
        </figcaption>
      </figure>
      <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>RGB backlight: colour made at the source</div>
        <svg className="tvg-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Separate red, green and blue LEDs mix light that already matches the scene, so the colour filter has far less to block" style={{ maxWidth: 360 }}>
          {RGB.map((c, i) => (
            <circle key={`${idPrefix}-led${i}`} cx={26} cy={y - 22 + i * 22} r={8} fill={c} className={`tvg-anim tvg-rgb-${'rgb'[i]}`} />
          ))}
          <text x={26} y={y + 46} textAnchor="middle" className="tvg-slab-label">R G B LEDs</text>
          <Arrow x={42} y={y} w={30} />
          <circle cx={100} cy={y} r={16} fill="var(--tvg-r)" className="tvg-anim tvg-rgb-mix" opacity={0.9} />
          <text x={100} y={y + 44} textAnchor="middle" className="tvg-slab-label">mixed to match</text>
          <text x={100} y={y + 56} textAnchor="middle" className="tvg-slab-label">the scene</text>
          <Arrow x={122} y={y} w={50} />
          <Filter x={178} y={y} idPrefix={`${idPrefix}-b`} />
          <text x={185} y={y + 44} textAnchor="middle" className="tvg-slab-label">filter</text>
          <Outputs x={200} y={y} idPrefix={`${idPrefix}-b`} strong />
          <text x={258} y={y + 44} textAnchor="start" className="tvg-slab-label">little is lost:</text>
          <text x={258} y={y + 56} textAnchor="start" className="tvg-slab-label">brighter, purer</text>
        </svg>
        <figcaption style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          A red sunset gets a red backlight. Less light is wasted, so colours stay saturated even at very high brightness.
        </figcaption>
      </figure>
    </div>
  );
}
