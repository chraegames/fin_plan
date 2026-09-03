import { useEffect, useRef } from 'react';
import type { GameState } from '../game';
import { ABILITY_LABEL, bi } from '../i18n';
import { manualRows } from '../manual';
import { monsterDef } from '../monsters';
import { buildAtlas, TILE, type Atlas } from '../sprites';

let atlasCache: Atlas | null = null;

function Portrait({ sprite }: { sprite: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!atlasCache) atlasCache = buildAtlas(2);
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const col = atlasCache.index.get(sprite);
    if (col == null) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(atlasCache.canvas as CanvasImageSource, col * TILE * 2, 0, TILE * 2, TILE * 2, 0, 0, 32, 32);
  }, [sprite]);
  return <canvas ref={ref} width={32} height={32} aria-hidden />;
}

export function Manual({ state, highlight, onHover }: { state: GameState; highlight: number; onHover: (at: number) => void }) {
  const rows = manualRows(state);
  const hp = state.run.hero.hp;
  if (!rows.length) return <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0 }}>No monsters left on this floor.</p>;
  return (
    <div>
      {rows.map(r => {
        const def = monsterDef(r.m.id);
        const hi = state.tower.floors[state.run.floor - 1].mons[highlight] && highlight === r.at;
        const bad = r.damage == null || r.damage >= hp;
        return (
          <div key={r.at} className={`mt-mon${hi ? ' mt-hi' : ''}`} onMouseEnter={() => onHover(r.at)} onMouseLeave={() => onHover(-1)}>
            <Portrait sprite={def.sprite} />
            <div>
              <div className="mt-name">
                {def.en} {def.zh}
                {r.m.elite ? ' ★' : ''}
                {r.m.boss ? ' — Boss' : ''}
              </div>
              <div className="mt-sub">
                HP {r.m.hp} · ATK {r.m.atk} · DEF {r.m.def} · {r.m.gold}g · {r.m.exp}xp
                {r.m.abilities.length > 0 && <> · {r.m.abilities.map(a => bi(ABILITY_LABEL[a])).join(', ')}</>}
              </div>
            </div>
            <div className={`mt-dmg ${bad ? 'mt-bad' : 'mt-ok'}`}>
              {r.damage == null ? '—' : `−${r.damage}`}
              <small>
                {r.breakAtk != null ? `ATK ${r.breakAtk}` : ''}
                {r.breakAtk != null && r.breakDef != null ? ' · ' : ''}
                {r.breakDef != null ? `DEF ${r.breakDef}` : ''}
              </small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
