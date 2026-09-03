import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ToolShell } from '../../components/layout/ToolShell';
import { Button } from '../../components/primitives/Button';
import { Icon } from '../../components/primitives/Icon';
import { ConfirmDialog } from '../../components/storyline/ConfirmDialog';
import { useIsMobile } from '../../hooks/useIsMobile';
import { byPath } from '../../site/manifest';
import { track } from '../../utils/analytics';
import { Canvas } from './components/Canvas';
import { DPad } from './components/DPad';
import { FlyDialog, HelpDialog, LoopSelect, Modal, NpcDialog, PerkDraft, SaveDialog } from './components/Dialogs';
import { Ledger } from './components/Ledger';
import { previewRoute, type LedgerPreview } from './ledger';
import { Manual } from './components/Manual';
import { StatusPanel } from './components/StatusPanel';
import { emptyTower, hasZone, heroForZone, generateZoneAsync } from './generate';
import { currentFloor, diffOf, gameReducer, planRoute, previewDamage, type GameAction, type GameState } from './game';
import { loopDef } from './loops';
import { monsterDef } from './monsters';
import { randomSeed } from './rng';
import { deleteSlot, loadMeta, loadSlots, saveMeta, saveSlot, type SlotId } from './save';
import { MT_STYLES } from './styles';
import { ZONES, zoneOf, type Dir, type Meta, type PerkId, type Run } from './types';
import type { Fx } from './render';

const entry = byPath('/magic-tower/')!;

type Dialog = null | 'loop' | 'save' | 'load' | 'fly' | 'help' | 'manual' | 'tool';

function useKey(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => ref.current(e);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
}

export default function App() {
  const isMobile = useIsMobile();
  const [meta, setMeta] = useState<Meta>(() => loadMeta());
  const [game, dispatch] = useReducer(gameReducer, null as unknown as GameState);
  const [dialog, setDialog] = useState<Dialog>('loop');
  const [building, setBuilding] = useState<{ zone: number; total: number } | null>(null);
  const [preview, setPreview] = useState<LedgerPreview | null>(null);
  const [hover, setHover] = useState(-1);
  const [floats, setFloats] = useState<Fx['floats']>([]);
  const [tool, setTool] = useState<'bomb' | 'pickaxe' | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const slotsRef = useRef(loadSlots());
  const genToken = useRef(0);

  // Inject styles once.
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = MT_STYLES;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // ─── Zone generation (worker) ───────────────────────────────────────
  const ensureZone = useCallback(
    async (state: GameState, zone: number): Promise<GameState> => {
      if (zone >= ZONES || hasZone(state.tower, zone)) return state;
      const token = ++genToken.current;
      setBuilding({ zone, total: ZONES });
      try {
        const tower = await generateZoneAsync(state.tower, zone, heroForZone(state.tower, zone, state.run.hero.perks));
        if (token !== genToken.current) return state;
        dispatch({ type: 'setTower', tower });
        return { ...state, tower };
      } finally {
        if (token === genToken.current) setBuilding(null);
      }
    },
    [],
  );

  const startRun = useCallback(
    async (loop: number, seed = randomSeed()) => {
      const tower = emptyTower(seed, loop);
      // The first zone must exist before the hero can stand anywhere.
      const token = ++genToken.current;
      setBuilding({ zone: 0, total: ZONES });
      setDialog(null);
      try {
        const t2 = await generateZoneAsync(tower, 0, heroForZone(tower, 0, []));
        if (token !== genToken.current) return;
        dispatch({ type: 'newRun', seed, loop, tower: t2 });
        track('mt_run_started', { loop });
      } finally {
        if (token === genToken.current) setBuilding(null);
      }
    },
    [],
  );

  // Autosave + record keeping after every change.
  const lastFloor = useRef(0);
  useEffect(() => {
    if (!game) return;
    const ok = saveSlot('auto', game.run);
    slotsRef.current = loadSlots();
    if (!ok) queueMicrotask(() => setSaveFailed(true));
    if (game.run.floor !== lastFloor.current) {
      lastFloor.current = game.run.floor;
      const rec = meta.records[game.run.loop] ?? { bestFloor: 0, clears: 0 };
      if (game.run.floor > rec.bestFloor) {
        const next = { ...meta, records: { ...meta.records, [game.run.loop]: { ...rec, bestFloor: game.run.floor } } };
        setMeta(next);
        saveMeta(next);
      }
    }
    if (game.run.status === 'won') {
      const rec = meta.records[game.run.loop] ?? { bestFloor: 99, clears: 0 };
      if (meta.unlockedLoop <= game.run.loop || rec.clears === 0) {
        const next: Meta = { ...meta, unlockedLoop: Math.max(meta.unlockedLoop, Math.min(10, game.run.loop + 1)), records: { ...meta.records, [game.run.loop]: { ...rec, bestFloor: 99, clears: rec.clears + 1 } } };
        setMeta(next);
        saveMeta(next);
        track('mt_loop_cleared', { loop: game.run.loop, steps: game.run.steps });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Generate the next zone as soon as the boss is beaten and the blessing chosen.
  useEffect(() => {
    if (!game || game.run.pendingDraft || building) return;
    const z = zoneOf(game.run.floor);
    if (game.run.bossesDown >= z && !hasZone(game.tower, z + 1) && z + 1 < ZONES) {
      void ensureZone(game, z + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.run.bossesDown, game?.run.pendingDraft, game?.tower, building]);

  // Floating damage numbers on HP change.
  const prevHp = useRef<number | null>(null);
  useEffect(() => {
    if (!game) return;
    const hp = game.run.hero.hp;
    if (prevHp.current != null && hp !== prevHp.current) {
      const d = hp - prevHp.current;
      const at = game.run.pos;
      setFloats(f => [...f.filter(x => performance.now() - x.born < 900), { at, text: d > 0 ? `+${d}` : `${d}`, color: d > 0 ? '#7ee787' : '#ff6b6b', born: performance.now() }]);
    }
    prevHp.current = hp;
  }, [game]);

  const send = useCallback((a: GameAction) => {
    setPreview(null);
    dispatch(a);
  }, []);

  const onTap = useCallback(
    (tile: number) => {
      if (!game || tile < 0 || game.run.status !== 'playing' || game.run.pendingDraft) return;
      if (preview && preview.target === tile) {
        send({ type: 'walkPath', path: preview.path });
        return;
      }
      if (tile === game.run.pos) {
        send({ type: 'useTile' });
        return;
      }
      const path = planRoute(game, tile);
      if (!path.length) {
        setPreview(null);
        return;
      }
      setPreview(previewRoute(game, tile, path));
    },
    [game, preview, send],
  );

  const move = useCallback(
    (d: Dir) => {
      if (!game) return;
      if (tool) {
        send({ type: tool, dir: d });
        setTool(null);
        return;
      }
      send({ type: 'move', dir: d });
    },
    [game, tool, send],
  );

  useKey(e => {
    if (!game || dialog || building) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const k = e.key;
    const dirs: Record<string, Dir> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, k: 0, l: 1, j: 2, h: 3, W: 0, D: 1, S: 2, A: 3 };
    if (k in dirs && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      move(dirs[k]);
      return;
    }
    if (game.run.pendingDraft) return;
    if (k === 'Enter' || k === ' ') { e.preventDefault(); if (preview) send({ type: 'walkPath', path: preview.path }); else send({ type: 'useTile' }); }
    else if (k === 'z' || k === 'Z' || k === 'u' || k === 'U' || (k === 'z' && (e.metaKey || e.ctrlKey))) send({ type: 'undo' });
    else if (k === 'b' || k === 'B') {
      const up = game.run.hero.stones > 0;
      if (up) setDialog('tool');
    } else if (k === 'f' || k === 'F') setDialog('fly');
    else if (k === 'm' || k === 'M') setDialog('manual');
    else if (k === 'S' || (k === 's' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); setDialog('save'); }
    else if (k === 'L' || (k === 'l' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); setDialog('load'); }
    else if (k === '?') setDialog('help');
    else if (k === 'Escape') { setPreview(null); setTool(null); if (game.npcOpen != null) send({ type: 'closeNpc' }); }
  });

  const doSave = useCallback(
    (id: SlotId) => {
      if (!game) return;
      const ok = saveSlot(id, game.run);
      slotsRef.current = loadSlots();
      if (!ok) setSaveFailed(true);
      setDialog(null);
    },
    [game],
  );

  const doLoad = useCallback(
    async (id: SlotId) => {
      const s = slotsRef.current[id];
      if (!s) return;
      setDialog(null);
      // Rebuild the tower zone by zone with the saved perks.
      const run: Run = { ...s.run, history: [] };
      let tower = emptyTower(run.seed, run.loop);
      const token = ++genToken.current;
      const need = zoneOf(run.floor) + (run.bossesDown >= zoneOf(run.floor) ? 1 : 0);
      try {
        for (let z = 0; z <= Math.min(ZONES - 1, need); z++) {
          setBuilding({ zone: z, total: ZONES });
          const perks = run.hero.perks.slice(0, z);
          tower = await generateZoneAsync(tower, z, heroForZone(tower, z, perks));
          if (token !== genToken.current) return;
        }
        dispatch({ type: 'load', run, tower });
      } finally {
        if (token === genToken.current) setBuilding(null);
      }
    },
    [],
  );

  const manualHighlight = hover;
  const hoverInfo = useMemo(() => {
    if (!game || hover < 0) return null;
    const f = currentFloor(game);
    const m = f.mons[hover];
    if (!m || diffOf(game.run, f.n).killed.includes(hover)) return null;
    const dmg = previewDamage(game, hover);
    return `${monsterDef(m.id).en} ${monsterDef(m.id).zh}: ${dmg == null ? 'cannot fight' : `−${dmg} HP`}`;
  }, [game, hover]);

  // ─── Render ─────────────────────────────────────────────────────────
  const rightSlot = (
    <Button size="sm" variant="soft" onClick={() => (game ? setConfirmNew(true) : setDialog('loop'))} leading={<Icon name="grid" size={12} />}>
      Towers
    </Button>
  );

  return (
    <ToolShell entry={entry} maxWidth={1180} rightSlot={rightSlot}>
      {saveFailed && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: 'var(--negative)', background: 'var(--negative-soft)', border: '1px solid var(--negative)', borderRadius: 'var(--radius-md)' }}>
          <Icon name="warning" size={14} />
          <span style={{ flex: 1 }}>Couldn't save — storage is full or disabled.</span>
          <Button variant="ghost" size="sm" aria-label="Dismiss" onClick={() => setSaveFailed(false)} leading={<Icon name="close" size={12} />} />
        </div>
      )}

      {!game && !building && (
        <div className="mt-progress">
          <p>Choose a tower to begin.</p>
          <Button variant="primary" onClick={() => setDialog('loop')}>Towers</Button>
          {slotsRef.current.auto && <Button style={{ marginLeft: 8 }} onClick={() => setDialog('load')}>Load</Button>}
        </div>
      )}

      {game && (
        <div className={`mt-root${isMobile ? ' mt-mobile' : ''}`}>
          <StatusPanel
            state={game}
            compact={isMobile}
            onBreach={dir => send({ type: 'breach', dir })}
            onFly={() => setDialog('fly')}
            onManual={() => setDialog('manual')}
            onSave={() => setDialog('save')}
            onLoad={() => setDialog('load')}
            onUndo={() => send({ type: 'undo' })}
            onHelp={() => setDialog('help')}
            onHolyWater={() => send({ type: 'holyWater' })}
            onTool={t => setTool(t)}
          />
          <div>
            <div className="mt-canvas-wrap">
              <Canvas state={game} route={preview?.path ?? []} hover={hover} floats={floats} onHover={setHover} onTap={onTap} />
              {(game.toast || hoverInfo || tool) && <div className="mt-toast">{tool ? `Choose a direction for the ${tool}` : hoverInfo ?? game.toast}</div>}
            </div>
            {isMobile && <DPad onMove={move} />}
            {preview && (
              <div className="mt-card" style={{ marginTop: 10 }}>
                <div className="mt-label">Route ledger 路线账本</div>
                <Ledger state={game} preview={preview} onGo={() => send({ type: 'walkPath', path: preview.path })} onCancel={() => setPreview(null)} />
              </div>
            )}
          </div>
          <div>
            {!isMobile && (
              <div className="mt-card">
                <div className="mt-label" style={{ marginTop: 0 }}>Monsters on this floor 怪物手册</div>
                <Manual state={game} highlight={manualHighlight} onHover={setHover} />
              </div>
            )}
            <div className="mt-card" style={{ marginTop: 10 }}>
              <div className="mt-label" style={{ marginTop: 0 }}>Log</div>
              <div className="mt-log">
                {game.run.log.slice(-8).map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {building && (
        <Modal title="Building the tower…">
          <p className="mt-progress">Zone {building.zone + 1} of {building.total} — laying floors, placing keys, proving the line.</p>
        </Modal>
      )}
      {dialog === 'loop' && <LoopSelect meta={meta} onStart={l => void startRun(l)} onClose={game ? () => setDialog(null) : undefined} />}
      {game && game.run.pendingDraft && !building && <PerkDraft offered={game.run.pendingDraft} onPick={(id: PerkId) => { send({ type: 'pickPerk', id }); track('mt_perk', { id }); }} />}
      {dialog === 'save' && game && <SaveDialog mode="save" slots={slotsRef.current} onPick={doSave} onDelete={id => { deleteSlot(id); slotsRef.current = loadSlots(); }} onClose={() => setDialog(null)} />}
      {dialog === 'load' && <SaveDialog mode="load" slots={slotsRef.current} onPick={id => void doLoad(id)} onDelete={id => { deleteSlot(id); slotsRef.current = loadSlots(); setDialog(null); }} onClose={() => setDialog(null)} />}
      {dialog === 'fly' && game && <FlyDialog state={game} onFly={n => { send({ type: 'teleport', floor: n }); setDialog(null); }} onClose={() => setDialog(null)} />}
      {dialog === 'help' && <HelpDialog onClose={() => setDialog(null)} />}
      {dialog === 'manual' && game && (
        <Modal title="Monster manual 怪物手册" onClose={() => setDialog(null)} wide>
          <Manual state={game} highlight={-1} onHover={() => undefined} />
        </Modal>
      )}
      {dialog === 'tool' && game && (
        <Modal title="Breach 穿层" onClose={() => setDialog(null)}>
          <p>Use a Breach Stone to punch through the ceiling or the floor. You land on the same square of the next floor; the hole stays open both ways.</p>
          <div className="mt-btnrow">
            <Button variant="primary" onClick={() => { send({ type: 'breach', dir: 'up' }); setDialog(null); }}>Ceiling ▲</Button>
            <Button variant="primary" onClick={() => { send({ type: 'breach', dir: 'down' }); setDialog(null); }}>Floor ▼</Button>
          </div>
        </Modal>
      )}
      {game && game.npcOpen != null && (
        <NpcDialog state={game} onShop={w => send({ type: 'shop', what: w })} onLocksmith={c => send({ type: 'locksmith', color: c })} onClose={() => send({ type: 'closeNpc' })} />
      )}
      {game && game.run.status === 'won' && (
        <Modal title="The tower is yours">
          <p>{loopDef(game.run.loop).en} {loopDef(game.run.loop).zh} — cleared in {game.run.steps} steps. {game.run.loop < 10 ? 'The next tower is open.' : 'There is nothing above you.'}</p>
          <Button variant="primary" onClick={() => setDialog('loop')}>Towers</Button>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmNew}
        title="Leave this run?"
        subtitle="Your autosave stays; unsaved progress since it does not"
        message={<>Open the tower list? The current run is autosaved on this device.</>}
        confirmLabel="Open towers"
        icon="grid"
        onClose={() => setConfirmNew(false)}
        onConfirm={() => { setConfirmNew(false); setDialog('loop'); }}
      />
    </ToolShell>
  );
}
