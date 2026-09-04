import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../../../components/primitives/Button';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { locksmithPrice, sagePrice, shopAtk, shopDef, shopHp, shopPrice } from '../curves';
import type { GameState } from '../game';
import { LOOPS } from '../loops';
import type { SavedSlot, SlotId } from '../save';
import { loopBlurb, loopName, npcName, perkDesc, perkName, t, type Lang } from '../strings';
import type { KeyColor, Meta, PerkId } from '../types';

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(true, ref);
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="mt-overlay" onClick={onClose}>
      <div ref={ref} className="mt-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} style={wide ? { width: 'min(960px, 100%)' } : undefined}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2>{title}</h2>
          {onClose && <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">✕</Button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function PerkDraft({ lang, offered, onPick }: { lang: Lang; offered: PerkId[]; onPick: (id: PerkId) => void }) {
  return (
    <Modal title={t(lang, 'chooseBlessing')}>
      <p>{t(lang, 'blessingIntro')}</p>
      {offered.map(id => (
        <button key={id} type="button" className="mt-perk" onClick={() => onPick(id)}>
          <b>{perkName(id, lang)}</b>
          <span>{perkDesc(id, lang)}</span>
        </button>
      ))}
    </Modal>
  );
}

export function LoopSelect({ lang, meta, onStart, onClose }: { lang: Lang; meta: Meta; onStart: (loop: number) => void; onClose?: () => void }) {
  return (
    <Modal title={t(lang, 'chooseTower')} onClose={onClose} wide>
      <p>{t(lang, 'towerIntro')}</p>
      {LOOPS.map(l => {
        const locked = l.n > meta.unlockedLoop;
        const rec = meta.records[l.n];
        const extra = rec ? ` · ${t(lang, 'bestFloor', { n: rec.bestFloor })}${rec.clears ? ` · ${t(lang, 'cleared', { n: rec.clears })}` : ''}` : '';
        return (
          <div key={l.n} className={`mt-loop${locked ? ' mt-locked' : ''}`}>
            <span className="mt-num">{String(l.n).padStart(2, '0')}</span>
            <div>
              <h3>{loopName(l.n, lang)}</h3>
              <p>{loopBlurb(l.n, lang)}{extra}</p>
            </div>
            <Button size="sm" variant={locked ? 'outline' : 'primary'} disabled={locked} onClick={() => onStart(l.n)}>
              {locked ? t(lang, 'locked') : t(lang, 'climb')}
            </Button>
          </div>
        );
      })}
    </Modal>
  );
}

export function SaveDialog({ lang, mode, slots, onPick, onDelete, onClose }: { lang: Lang; mode: 'save' | 'load'; slots: Partial<Record<SlotId, SavedSlot>>; onPick: (id: SlotId) => void; onDelete: (id: SlotId) => void; onClose: () => void }) {
  const ids: SlotId[] = mode === 'save' ? ['s1', 's2', 's3'] : ['auto', 's1', 's2', 's3'];
  return (
    <Modal title={t(lang, mode === 'save' ? 'saveGame' : 'loadGame')} onClose={onClose}>
      <p>{t(lang, 'savesIntro')}</p>
      <div className="mt-slots">
        {ids.map(id => {
          const s = slots[id];
          const label = id === 'auto' ? t(lang, 'autosave') : t(lang, 'slot', { n: id.slice(1) });
          return (
            <div key={id} className="mt-slot">
              <div>
                <div>{label}</div>
                <small>{s ? `${loopName(s.run.loop, lang)} · ${t(lang, 'floorN', { n: s.run.floor })} · ${t(lang, 'hp')} ${s.run.hero.hp} · ${new Date(s.savedAt).toLocaleString()}` : t(lang, 'empty')}</small>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {mode === 'load' && s && <Button size="sm" variant="ghost" onClick={() => onDelete(id)}>{t(lang, 'delete')}</Button>}
                <Button size="sm" variant="primary" disabled={mode === 'load' && !s} onClick={() => onPick(id)}>
                  {mode === 'save' ? (s ? t(lang, 'overwrite') : t(lang, 'save')) : t(lang, 'load')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function FlyDialog({ lang, state, onFly, onClose }: { lang: Lang; state: GameState; onFly: (floor: number) => void; onClose: () => void }) {
  const floors = state.run.visited.slice().sort((a, b) => a - b).filter(n => state.tower.floors[n - 1]);
  return (
    <Modal title={t(lang, 'teleporter')} onClose={onClose}>
      <p>{t(lang, 'teleporterIntro')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {floors.map(n => (
          <Button key={n} size="sm" variant={n === state.run.floor ? 'soft' : 'outline'} disabled={n === state.run.floor} onClick={() => onFly(n)}>
            {state.tower.floors[n - 1].label}
          </Button>
        ))}
      </div>
    </Modal>
  );
}

export function NpcDialog({ lang, state, onShop, onLocksmith, onClose }: { lang: Lang; state: GameState; onShop: (what: 'atk' | 'def' | 'hp') => void; onLocksmith: (c: KeyColor) => void; onClose: () => void }) {
  const at = state.npcOpen;
  const f = state.tower.floors[state.run.floor - 1];
  const npc = at != null ? f.npcs[at] : null;
  if (!npc) return null;
  const h = state.run.hero;
  if (npc.kind === 'shop' || npc.kind === 'tradePost') {
    let price = shopPrice(h.shopBuys + 1, npc.tier);
    if (h.perks.includes('merchant')) price = Math.round(price * 0.75);
    return (
      <Modal title={npcName(npc.kind, lang)} onClose={onClose}>
        <p>{t(lang, 'shopIntro', { n: h.gold, m: price })}</p>
        <div className="mt-btnrow">
          <Button variant="primary" size="md" disabled={h.gold < price} onClick={() => onShop('atk')}>+{shopAtk(npc.tier)} {t(lang, 'atk')}</Button>
          <Button variant="primary" size="md" disabled={h.gold < price} onClick={() => onShop('def')}>+{shopDef(npc.tier)} {t(lang, 'def')}</Button>
          <Button variant="primary" size="md" disabled={h.gold < price} onClick={() => onShop('hp')}>+{shopHp(npc.tier)} {t(lang, 'hp')}</Button>
        </div>
      </Modal>
    );
  }
  if (npc.kind === 'locksmith') {
    const base = locksmithPrice(h.locksmithBuys + 1, npc.tier);
    return (
      <Modal title={npcName('locksmith', lang)} onClose={onClose}>
        <p>{t(lang, 'locksmithIntro', { n: h.gold })}</p>
        <div className="mt-btnrow">
          <Button size="md" disabled={h.gold < base} onClick={() => onLocksmith('y')}>{t(lang, 'yellowKey')} — {base}</Button>
          <Button size="md" disabled={h.gold < base * 2} onClick={() => onLocksmith('b')}>{t(lang, 'blueKey')} — {base * 2}</Button>
          <Button size="md" disabled={h.gold < base * 4} onClick={() => onLocksmith('r')}>{t(lang, 'redKey')} — {base * 4}</Button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={npcName('sage', lang)} onClose={onClose}>
      <p>{t(lang, 'sageIntro', { n: sagePrice(h.sageBuys + 1, npc.tier) })}</p>
    </Modal>
  );
}

export function HelpDialog({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  return (
    <Modal title={t(lang, 'howToPlay')} onClose={onClose}>
      <p>{t(lang, 'help1')}</p>
      <p>{t(lang, 'help2')}</p>
      <p>{t(lang, 'help3')}</p>
      <p>{t(lang, 'help4')}</p>
    </Modal>
  );
}
