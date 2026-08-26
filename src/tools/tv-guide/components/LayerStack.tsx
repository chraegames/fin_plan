// Exploded-view diagram of a panel's layers (bottom = furthest from the
// viewer) with animated light rays that change colour as they pass through
// each layer. PURE: CSS animates the rays, so it works on the static page;
// the live page adds a "tap a layer" highlight through onHighlight.

import type { ReactNode } from 'react';
import { LAYER_BY_ID, type LayerId, type LayerTone } from '../data';

interface LayerStackProps {
  layers: LayerId[];
  /** Unique per instance — several stacks share a page. */
  idPrefix: string;
  highlight?: LayerId;
  onHighlight?: (id: LayerId | undefined) => void;
  compact?: boolean;
  caption?: string;
}

type RayState = 'none' | 'white' | 'blue' | 'rgb';

const SOURCE: Partial<Record<LayerId, RayState>> = {
  'edge-leds': 'white',
  'led-array': 'white',
  'blue-led-array': 'blue',
  'mini-led-array': 'blue',
  'rgb-led-array': 'rgb',
  'micro-rgb-array': 'rgb',
  'oled-white': 'white',
  'oled-tandem': 'white',
  'oled-blue': 'blue',
};

function afterLayer(state: RayState, id: LayerId): RayState {
  if (state === 'none') return SOURCE[id] ?? 'none';
  if (id === 'qd-film' || id === 'sqd-film') return state === 'blue' ? 'white' : state;
  if (id === 'qd-converter' || id === 'color-filter' || id === 'wrgb-filter') return 'rgb';
  return state;
}

const RGB = ['var(--tvg-r)', 'var(--tvg-g)', 'var(--tvg-b)'];

function rayColor(state: RayState, k: number): string {
  if (state === 'rgb') return RGB[k];
  if (state === 'blue') return 'var(--tvg-blue)';
  return 'var(--tvg-white)';
}

function toneVar(tone: LayerTone): string {
  return `var(--tvg-${tone})`;
}

/** Decorative dots drawn on light-producing slabs. */
function dots(id: LayerId, x0: number, x1: number, y: number, skew: number, th: number, idPrefix: string) {
  const out: ReactNode[] = [];
  const cy = y + th / 2;
  const push = (cx: number, fill: string, r: number, cls: string, i: number) =>
    out.push(<circle key={`${idPrefix}-d${i}`} cx={cx} cy={cy} r={r} fill={fill} className={cls} />);
  switch (id) {
    case 'edge-leds':
      for (let i = 0; i < 4; i++) push(x0 + skew / 2 + 6 + i * 9, 'var(--tvg-white)', 2.6, 'tvg-anim tvg-glow', i);
      break;
    case 'led-array':
      for (let i = 0; i < 6; i++) push(x0 + skew / 2 + 22 + i * 36, 'var(--tvg-white)', 3.2, 'tvg-anim tvg-glow', i);
      break;
    case 'blue-led-array':
      for (let i = 0; i < 6; i++) push(x0 + skew / 2 + 22 + i * 36, 'var(--tvg-blue)', 3.2, 'tvg-anim tvg-glow', i);
      break;
    case 'mini-led-array':
      for (let i = 0; i < 22; i++) push(x0 + skew / 2 + 8 + i * 9.6, 'var(--tvg-blue)', 1.7, 'tvg-anim tvg-glow', i);
      break;
    case 'rgb-led-array':
      for (let i = 0; i < 15; i++) push(x0 + skew / 2 + 10 + i * 14, RGB[i % 3], 2.4, `tvg-anim tvg-rgb-${'rgb'[i % 3]}`, i);
      break;
    case 'micro-rgb-array':
      for (let i = 0; i < 36; i++) push(x0 + skew / 2 + 6 + i * 6, RGB[i % 3], 1.3, `tvg-anim tvg-rgb-${'rgb'[i % 3]}`, i);
      break;
    case 'oled-white':
    case 'oled-tandem':
      for (let i = 0; i < 10; i++) push(x0 + skew / 2 + 14 + i * 22, 'var(--tvg-white)', 2.6, 'tvg-anim tvg-glow', i);
      break;
    case 'oled-blue':
      for (let i = 0; i < 10; i++) push(x0 + skew / 2 + 14 + i * 22, 'var(--tvg-blue)', 2.6, 'tvg-anim tvg-glow', i);
      break;
    default:
      break;
  }
  if (id === 'oled-tandem') {
    // second and third emitter rows suggest the stack
    for (let r = 1; r <= 2; r++)
      for (let i = 0; i < 10; i++)
        out.push(
          <circle key={`${idPrefix}-s${r}-${i}`} cx={x0 + skew / 2 + 14 + i * 22 + r * 3} cy={cy - r * 3} r={1.8} fill="var(--tvg-white)" opacity={0.7} />,
        );
  }
  if (id === 'color-filter' || id === 'wrgb-filter') {
    const n = id === 'wrgb-filter' ? 4 : 3;
    const cols = id === 'wrgb-filter' ? [...RGB, 'var(--tvg-white)'] : RGB;
    for (let g = 0; g < 4; g++)
      for (let i = 0; i < n; i++)
        out.push(
          <rect
            key={`${idPrefix}-f${g}-${i}`}
            x={x0 + skew / 2 + 12 + g * 52 + i * 11}
            y={y + 4}
            width={8}
            height={th - 8}
            rx={1.5}
            fill={cols[i]}
            opacity={0.85}
          />,
        );
  }
  if (id === 'qd-film' || id === 'sqd-film' || id === 'qd-converter') {
    const n = id === 'sqd-film' ? 40 : 20;
    for (let i = 0; i < n; i++)
      out.push(
        <circle
          key={`${idPrefix}-q${i}`}
          cx={x0 + skew / 2 + 8 + (i * (x1 - x0 - 16)) / n}
          cy={cy + ((i % 3) - 1) * 3}
          r={id === 'sqd-film' ? 1 : 1.6}
          fill="var(--tvg-ink-on)"
          opacity={0.6}
        />,
      );
  }
  if (id === 'lc-layer') {
    for (let i = 0; i < 12; i++)
      out.push(
        <rect
          key={`${idPrefix}-l${i}`}
          x={x0 + skew / 2 + 10 + i * 18}
          y={y + 3}
          width={3}
          height={th - 6}
          rx={1}
          fill="var(--tvg-ink-on)"
          opacity={0.55}
          transform={`rotate(${i % 2 ? 20 : -20} ${x0 + skew / 2 + 11 + i * 18} ${cy})`}
        />,
      );
  }
  return out;
}

export function LayerStack({ layers, idPrefix, highlight, onHighlight, compact = false, caption }: LayerStackProps) {
  const x0 = 24;
  const x1 = compact ? 200 : 236;
  const skew = compact ? 26 : 34;
  const th = 16;
  const gap = compact ? 26 : 30;
  const n = layers.length;
  const top = 34;
  const height = top + (n - 1) * gap + th + 22;
  const width = x1 + skew + (compact ? 20 : 150);
  const yOf = (i: number) => top + (n - 1 - i) * gap; // i = 0 bottom
  const labelX = x1 + skew + 12;

  // Ray segments
  const rayXs = [0.28, 0.52, 0.76].map(f => x0 + skew / 2 + (x1 - x0) * f);
  const segments: { k: number; y1: number; y2: number; color: string }[] = [];
  let state: RayState = 'none';
  layers.forEach((id, i) => {
    const next = afterLayer(state, id);
    state = next;
    if (next === 'none') return;
    const yFrom = yOf(i) + th / 2;
    const yTo = i === n - 1 ? top - 22 : yOf(i + 1) + th / 2;
    for (let k = 0; k < 3; k++) segments.push({ k, y1: yFrom, y2: yTo, color: rayColor(next, k) });
  });

  const dim = Boolean(highlight);
  const layerList = (
    <ol className="tvg-legend" aria-label="Layers, top to bottom">
      {[...layers].reverse().map(id => {
        const l = LAYER_BY_ID[id];
        const body = (
          <>
            <i style={{ background: toneVar(l.tone) }} aria-hidden="true" />
            <span>
              <b>{l.name}</b> — {l.role}
            </span>
          </>
        );
        return (
          <li key={id} aria-current={highlight === id ? 'true' : undefined} style={onHighlight ? { display: 'block' } : undefined}>
            {onHighlight ? (
              <button type="button" onClick={() => onHighlight(highlight === id ? undefined : id)} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', gap: 10 }}>
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className={compact ? undefined : 'tvg-cols tvg-cols-wide'}>
        <svg
          className={`tvg-svg${dim ? ' tvg-dim' : ''}`}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Layer diagram: ${layers.map(id => LAYER_BY_ID[id].name).join(', ')} (bottom to top)`}
          style={{ maxWidth: width }}
        >
          {/* viewer eye marker */}
          <text x={x0 + skew / 2 + (x1 - x0) * 0.52} y={top - 26} textAnchor="middle" className="tvg-slab-label" style={{ fontSize: 10.5 }}>
            ↑ to the viewer
          </text>
          {segments.map((s, i) => (
            <line
              key={`${idPrefix}-r${i}`}
              x1={rayXs[s.k]}
              y1={s.y1}
              x2={rayXs[s.k]}
              y2={s.y2}
              stroke={s.color}
              className="tvg-ray tvg-anim"
            />
          ))}
          {layers.map((id, i) => {
            const l = LAYER_BY_ID[id];
            const y = yOf(i);
            const hi = highlight === id;
            const pts = `${x0 + skew},${y} ${x1 + skew},${y} ${x1},${y + th} ${x0},${y + th}`;
            return (
              <g key={id}>
                <polygon points={pts} fill={toneVar(l.tone)} className={`tvg-slab${hi ? ' tvg-hi' : ''}`} />
                <g className={`tvg-slab${hi ? ' tvg-hi' : ''}`} style={{ stroke: 'none' }}>
                  {dots(id, x0, x1, y, skew, th, `${idPrefix}-${id}`)}
                </g>
                {!compact && (
                  <>
                    <line x1={x1 + skew + 2} y1={y + th / 2} x2={labelX - 4} y2={y + th / 2} stroke="var(--tvg-slab-edge)" strokeWidth={1} />
                    <text x={labelX} y={y + th / 2 + 4} className={`tvg-slab-label${hi ? ' tvg-hi' : ''}`}>
                      {l.name}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {!compact && layerList}
      </div>
      {caption && (
        <figcaption style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{caption}</figcaption>
      )}
    </figure>
  );
}
