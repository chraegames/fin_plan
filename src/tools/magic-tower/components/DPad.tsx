import type { Dir } from '../types';

export function DPad({ onMove }: { onMove: (d: Dir) => void }) {
  const b = (d: Dir, label: string, style?: React.CSSProperties) => (
    <button type="button" style={style} aria-label={label} onClick={() => onMove(d)}>
      {label}
    </button>
  );
  return (
    <div className="mt-dpad" role="group" aria-label="Move">
      <span />
      {b(0, '▲')}
      <span />
      {b(3, '◀')}
      <span />
      {b(1, '▶')}
      <span />
      {b(2, '▼')}
      <span />
    </div>
  );
}
