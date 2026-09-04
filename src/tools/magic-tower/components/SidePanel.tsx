import { breachTarget, type GameState } from '../game';
import { msg, perkName, t, type Lang } from '../strings';
import { loopName } from '../strings';
import { Sprite } from './Sprite';

export function SidePanel({ state, lang }: { state: GameState; lang: Lang }) {
  const { run, tower } = state;
  const h = run.hero;
  const f = tower.floors[run.floor - 1];
  const up = breachTarget(state, 'up') != null;
  const down = breachTarget(state, 'down') != null;
  const last = run.log[run.log.length - 1];
  const floorNo = f.label.replace(/^F/, '');
  const floorText = lang === 'en' ? (f.label.startsWith('B') ? f.label : `Floor ${floorNo}`) : f.label.startsWith('B') ? `地下 ${f.label.slice(1)} 层` : `第 ${floorNo} 层`;
  return (
    <aside className="mt-side" aria-label="Status">
      <div className="mt-side-head">
        <Sprite name="heroDown" size={40} />
        <div>
          <div className="mt-title">{loopName(run.loop, lang)}</div>
          <div className="mt-floor">{floorText}</div>
        </div>
      </div>
      <div className="mt-stats">
        <span className="k">{t(lang, 'level')}</span><span className="v">{h.level}</span>
        <span className="k">{t(lang, 'hp')}</span><span className="v">{h.hp}</span>
        <span className="k">{t(lang, 'atk')}</span><span className="v">{h.atk}</span>
        <span className="k">{t(lang, 'def')}</span><span className="v">{h.def}</span>
        {h.shield > 0 && (<><span className="k">{t(lang, 'shield')}</span><span className="v">{h.shield}</span></>)}
        <span className="k">{t(lang, 'exp')}</span><span className="v">{h.exp}</span>
        <span className="k">{t(lang, 'gold')}</span><span className="v">{h.gold}</span>
      </div>
      <hr className="mt-rule" />
      <div className="mt-icons" aria-label={t(lang, 'keysLabel')}>
        <span className="mt-icon mt-y"><Sprite name="yKey" size={24} />{h.keys.y}</span>
        <span className="mt-icon mt-b"><Sprite name="bKey" size={24} />{h.keys.b}</span>
        <span className="mt-icon mt-r"><Sprite name="rKey" size={24} />{h.keys.r}</span>
        <span className="mt-icon"><Sprite name="stone" size={24} />{h.stones}</span>
        {h.holyWater > 0 && <span className="mt-icon"><Sprite name="holyWater" size={24} />{h.holyWater}</span>}
        {h.bombs > 0 && <span className="mt-icon"><Sprite name="bomb" size={24} />{h.bombs}</span>}
        {h.pickaxes > 0 && <span className="mt-icon"><Sprite name="pickaxe" size={24} />{h.pickaxes}</span>}
        {h.cross && <span className="mt-icon"><Sprite name="cross" size={24} />1</span>}
        {h.teleporter && <span className="mt-icon"><Sprite name="teleporter" size={24} />1</span>}
      </div>
      <hr className="mt-rule" />
      <div className="mt-hollow">
        <span>{t(lang, 'ceiling')} ▲ <b className={up ? 'mt-on' : undefined}>{t(lang, up ? 'hollow' : 'solid')}</b></span>
        <span>{t(lang, 'floorBelow')} ▼ <b className={down ? 'mt-on' : undefined}>{t(lang, down ? 'hollow' : 'solid')}</b></span>
      </div>
      {h.perks.length > 0 && <div className="mt-perks">✦ {h.perks.map(p => perkName(p, lang)).join(' · ')}</div>}
      <div className="mt-status">{last ? <b>{msg(last, lang)}</b> : null}</div>
    </aside>
  );
}
