import type { GameState } from '../game';
import { manualRows } from '../manual';
import { monsterDef } from '../monsters';
import { abilityName, t, type Lang } from '../strings';
import { Sprite } from './Sprite';

export function Manual({ state, lang, highlight, onHover }: { state: GameState; lang: Lang; highlight: number; onHover: (at: number) => void }) {
  const rows = manualRows(state);
  const hp = state.run.hero.hp;
  if (!rows.length) return <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>{t(lang, 'noMonsters')}</p>;
  const f = state.tower.floors[state.run.floor - 1];
  return (
    <div className="mt-table-wrap">
      <table className="mt-table">
        <thead>
          <tr>
            <th colSpan={2}>{t(lang, 'colMonster')}</th>
            <th className="num">{t(lang, 'colHp')}</th>
            <th className="num">{t(lang, 'colAtk')}</th>
            <th className="num">{t(lang, 'colDef')}</th>
            <th className="num">{t(lang, 'colGold')}</th>
            <th className="num">{t(lang, 'colExp')}</th>
            <th>{t(lang, 'colAbilities')}</th>
            <th className="num">{t(lang, 'colDamage')}</th>
            <th>{t(lang, 'colNext')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const def = monsterDef(r.m.id);
            const hi = highlight >= 0 && f.mons[highlight] === r.m;
            const cls = r.damage == null || r.damage >= hp ? 'mt-bad' : r.ratio < 0.15 ? 'mt-ok' : 'mt-mid';
            return (
              <tr key={r.at} className={hi ? 'mt-hi' : undefined} onMouseEnter={() => onHover(r.at)} onMouseLeave={() => onHover(-1)}>
                <td style={{ width: 36 }}><Sprite name={def.sprite} size={32} /></td>
                <td>
                  <span className="mt-name">{lang === 'en' ? def.en : def.zh}</span>
                  {r.count > 1 && <span className="mt-count">{t(lang, 'count', { n: r.count })}</span>}
                  {r.m.elite && <span className="mt-tag">{t(lang, 'elite')}</span>}
                  {r.m.boss && <span className="mt-tag">{t(lang, 'boss')}</span>}
                </td>
                <td className="num">{r.m.hp}</td>
                <td className="num">{r.m.atk}</td>
                <td className="num">{r.m.def}</td>
                <td className="num">{r.m.gold}</td>
                <td className="num">{r.m.exp}</td>
                <td>{r.m.abilities.length ? r.m.abilities.map(a => <span key={a} className="mt-tag">{abilityName(a, lang)}</span>) : <span style={{ color: 'var(--ink-muted)' }}>—</span>}</td>
                <td className="num">
                  <span className={`mt-dmg ${cls}`}>{r.damage == null ? t(lang, 'cannotFight') : r.damage >= hp ? `${r.damage} · ${t(lang, 'lethal')}` : r.damage}</span>
                </td>
                <td>
                  <div className="mt-next">
                    {r.damage == null && r.atkNeeded != null && t(lang, 'needAtk', { n: r.atkNeeded })}
                    {r.atkNext && <div>{t(lang, 'withAtk', { n: r.atkNext.atk, m: r.atkNext.damage })}</div>}
                    {r.defNext && <div>{t(lang, 'withDef', { n: r.defNext.def, m: r.defNext.damage })}</div>}
                    {r.damage != null && !r.atkNext && !r.defNext && t(lang, 'none')}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-legend">
        {lang === 'en'
          ? `Damage to you = (turns − 1) × (monster ATK − your DEF), plus any ability effects. "Cheaper with" shows the smallest ATK or DEF that would lower the cost, and what it would cost then. You have ${hp} HP.`
          : `你受伤害 =（回合数 − 1）×（怪物攻击 − 你的防御），再加特性效果。"减伤条件"给出能降低伤害的最小攻击或防御值，以及那时的伤害。你当前生命 ${hp}。`}
      </p>
    </div>
  );
}
