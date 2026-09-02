import { BLACK, starPoints, toCoord, toXY, type BoardSize, type Color, type Stone } from './go';

interface BoardProps {
  size: BoardSize;
  board: readonly Stone[];
  lastMove: number | null;
  koPoint: number | null;
  /** Colour previewed on hover; null makes the board read-only. */
  active: Color | null;
  onPlay?: (idx: number) => void;
}

const STONE_R = 0.47;

function stoneFill(c: Color): string {
  return c === BLACK ? 'var(--go-black)' : 'var(--go-white)';
}

function stoneEdge(c: Color): string {
  return c === BLACK ? 'var(--go-black-edge)' : 'var(--go-white-edge)';
}

/** Pure SVG Go board. Intersections sit at integer coordinates 1..size; the viewBox adds a half-cell margin. */
export function Board({ size, board, lastMove, koPoint, active, onPlay }: BoardProps) {
  const margin = 0.6;
  const view = `${1 - margin} ${1 - margin} ${size - 1 + 2 * margin} ${size - 1 + 2 * margin}`;
  const lines: string[] = [];
  for (let i = 1; i <= size; i++) {
    lines.push(`M1 ${i}H${size}`);
    lines.push(`M${i} 1V${size}`);
  }
  const interactive = active != null && onPlay != null;

  return (
    <svg className="go-svg" viewBox={view} role="img" aria-label={`${size} by ${size} Go board`}>
      <rect x={1 - margin} y={1 - margin} width={size - 1 + 2 * margin} height={size - 1 + 2 * margin} fill="var(--go-board)" rx={0.15} />
      <path d={lines.join('')} stroke="var(--go-line)" strokeWidth={0.035} fill="none" />
      {starPoints(size).map(idx => {
        const { x, y } = toXY(idx, size);
        return <circle key={`s${idx}`} cx={x + 1} cy={y + 1} r={0.09} fill="var(--go-line)" />;
      })}
      {board.map((s, idx) => {
        if (s === 0) return null;
        const { x, y } = toXY(idx, size);
        return (
          <circle
            key={`p${idx}`}
            cx={x + 1}
            cy={y + 1}
            r={STONE_R}
            fill={stoneFill(s)}
            stroke={stoneEdge(s)}
            strokeWidth={0.04}
          />
        );
      })}
      {lastMove != null && board[lastMove] !== 0 && (
        <circle
          cx={toXY(lastMove, size).x + 1}
          cy={toXY(lastMove, size).y + 1}
          r={0.19}
          fill="none"
          stroke={board[lastMove] === BLACK ? 'var(--go-white)' : 'var(--go-black)'}
          strokeWidth={0.07}
        />
      )}
      {koPoint != null && (
        <rect
          x={toXY(koPoint, size).x + 1 - 0.2}
          y={toXY(koPoint, size).y + 1 - 0.2}
          width={0.4}
          height={0.4}
          fill="none"
          stroke="var(--go-line)"
          strokeWidth={0.05}
        />
      )}
      {interactive &&
        board.map((s, idx) => {
          if (s !== 0 || idx === koPoint) return null;
          const { x, y } = toXY(idx, size);
          return (
            <g key={`h${idx}`} className="go-hit" onClick={() => onPlay(idx)}>
              <title>{toCoord(idx, size)}</title>
              <circle className="go-ghost" cx={x + 1} cy={y + 1} r={STONE_R} fill={stoneFill(active)} />
              <rect x={x + 0.5} y={y + 0.5} width={1} height={1} fill="transparent" />
            </g>
          );
        })}
    </svg>
  );
}
