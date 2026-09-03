import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../../../components/primitives/Button';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { locksmithPrice, sagePrice, shopAtk, shopDef, shopHp, shopPrice } from '../curves';
import type { GameState } from '../game';
import { NPC_LABEL, bi } from '../i18n';
import { LOOPS, loopLabel } from '../loops';
import { PERKS, perkLabel } from '../perks';
import type { SavedSlot, SlotId } from '../save';
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
      <div ref={ref} className="mt-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} style={wide ? { width: 'min(720px, 100%)' } : undefined}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2>{title}</h2>
          {onClose && <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">✕</Button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function PerkDraft({ offered, onPick }: { offered: PerkId[]; onPick: (id: PerkId) => void }) {
  return (
    <Modal title="Choose a blessing 祝福">
      <p>The boss is down. Take one blessing for the floors ahead — the tower is rebuilt around whatever you choose.</p>
      {offered.map(id => (
        <button key={id} type="button" className="mt-perk" onClick={() => onPick(id)}>
          <b>{perkLabel(id)}</b>
          <span>{PERKS[id].desc}</span>
        </button>
      ))}
    </Modal>
  );
}

export function LoopSelect({ meta, onStart, onClose }: { meta: Meta; onStart: (loop: number) => void; onClose?: () => void }) {
  return (
    <Modal title="Choose a tower" onClose={onClose} wide>
      <p>Ten towers of 99 floors. Clear one to unlock the next; each adds new monsters, rules and puzzles. Nothing carries over but what you have learned.</p>
      {LOOPS.map(l => {
        const locked = l.n > meta.unlockedLoop;
        const rec = meta.records[l.n];
        return (
          <div key={l.n} className={`mt-loop${locked ? ' mt-locked' : ''}`}>
            <span className="mt-num">{String(l.n).padStart(2, '0')}</span>
            <div>
              <h3>{loopLabel(l.n)}</h3>
              <p>{l.blurb}{rec ? ` · best floor ${rec.bestFloor}${rec.clears ? ` · cleared ×${rec.clears}` : ''}` : ''}</p>
            </div>
            <Button size="sm" variant={locked ? 'outline' : 'primary'} disabled={locked} onClick={() => onStart(l.n)}>
              {locked ? 'Locked' : 'Climb'}
            </Button>
          </div>
        );
      })}
    </Modal>
  );
}

export function SaveDialog({ mode, slots, onPick, onDelete, onClose }: { mode: 'save' | 'load'; slots: Partial<Record<SlotId, SavedSlot>>; onPick: (id: SlotId) => void; onDelete: (id: SlotId) => void; onClose: () => void }) {
  const ids: SlotId[] = mode === 'save' ? ['s1', 's2', 's3'] : ['auto', 's1', 's2', 's3'];
  return (
    <Modal title={mode === 'save' ? 'Save game 存档' : 'Load game 读档'} onClose={onClose}>
      <p>Saves live in this browser only. The autosave slot is written after every move.</p>
      <div className="mt-slots">
        {ids.map(id => {
          const s = slots[id];
          const label = id === 'auto' ? 'Autosave' : `Slot ${id.slice(1)}`;
          return (
            <div key={id} className="mt-slot">
              <div>
                <div>{label}</div>
                <small>{s ? `${loopLabel(s.run.loop)} · floor ${s.run.floor} · HP ${s.run.hero.hp} · ${new Date(s.savedAt).toLocaleString()}` : 'Empty'}</small>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {mode === 'load' && s && <Button size="sm" variant="ghost" onClick={() => onDelete(id)}>Delete</Button>}
                <Button size="sm" variant="primary" disabled={mode === 'load' && !s} onClick={() => onPick(id)}>
                  {mode === 'save' ? (s ? 'Overwrite' : 'Save') : 'Load'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function FlyDialog({ state, onFly, onClose }: { state: GameState; onFly: (floor: number) => void; onClose: () => void }) {
  const floors = state.run.visited.slice().sort((a, b) => a - b).filter(n => state.tower.floors[n - 1]);
  return (
    <Modal title="Floor teleporter 楼层传送器" onClose={onClose}>
      <p>Return to any floor you have visited. You arrive on its stairs.</p>
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

export function NpcDialog({ state, onShop, onLocksmith, onClose }: { state: GameState; onShop: (what: 'atk' | 'def' | 'hp') => void; onLocksmith: (c: KeyColor) => void; onClose: () => void }) {
  const at = state.npcOpen;
  const f = state.tower.floors[state.run.floor - 1];
  const npc = at != null ? f.npcs[at] : null;
  if (!npc) return null;
  const h = state.run.hero;
  if (npc.kind === 'shop' || npc.kind === 'tradePost') {
    let price = shopPrice(h.shopBuys + 1, npc.tier);
    if (h.perks.includes('merchant')) price = Math.round(price * 0.75);
    return (
      <Modal title={bi(NPC_LABEL[npc.kind])} onClose={onClose}>
        <p>"Gold for strength. The price climbs with every purchase." You have {h.gold} gold; the next purchase costs {price}.</p>
        <div className="mt-btnrow">
          <Button variant="primary" size="md" disabled={h.gold < price} onClick={() => onShop('atk')}>+{shopAtk(npc.tier)} ATK</Button>
          <Button variant="primary" size="md" disabled={h.gold < price} onClick={() => onShop('def')}>+{shopDef(npc.tier)} DEF</Button>
          <Button variant="primary" size="md" disabled={h.gold < price} onClick={() => onShop('hp')}>+{shopHp(npc.tier)} HP</Button>
        </div>
      </Modal>
    );
  }
  if (npc.kind === 'locksmith') {
    const base = locksmithPrice(h.locksmithBuys + 1, npc.tier);
    return (
      <Modal title={bi(NPC_LABEL.locksmith)} onClose={onClose}>
        <p>"Keys cut while you wait." You have {h.gold} gold.</p>
        <div className="mt-btnrow">
          <Button size="md" disabled={h.gold < base} onClick={() => onLocksmith('y')}>Yellow key — {base}g</Button>
          <Button size="md" disabled={h.gold < base * 2} onClick={() => onLocksmith('b')}>Blue key — {base * 2}g</Button>
          <Button size="md" disabled={h.gold < base * 4} onClick={() => onLocksmith('r')}>Red key — {base * 4}g</Button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={bi(NPC_LABEL.sage)} onClose={onClose}>
      <p>"Experience is the only coin I take." Next lesson costs {sagePrice(h.sageBuys + 1, npc.tier)} EXP.</p>
    </Modal>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const k = (s: string) => <span className="mt-kbd">{s}</span>;
  return (
    <Modal title="How to play" onClose={onClose}>
      <p>Every fight is arithmetic: you hit for ATK − monster DEF, it hits back for its ATK − your DEF, and the manual shows exactly what each fight costs before you commit. Nothing is random.</p>
      <p>Move with {k('arrows')} / {k('WASD')}, or click a tile to preview the route and its ledger, then Go. {k('Enter')} uses the stairs or hole under you.</p>
      <p>{k('B')} breach the ceiling or floor with a Breach Stone 穿层石 (lands on the same square of the next floor; vaults 密室 have no door and can only be entered this way). {k('F')} floor teleporter. {k('M')} manual. {k('Z')} undo (last 10 steps). {k('S')} / {k('L')} save and load. {k('Esc')} closes.</p>
      <p>Every zone boss drops a stone and offers a blessing. Getting stuck is part of the genre — keep saves.</p>
    </Modal>
  );
}
