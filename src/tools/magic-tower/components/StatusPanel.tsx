import { Button } from '../../../components/primitives/Button';
import { breachTarget, type GameState } from '../game';
import { loopLabel } from '../loops';
import { perkLabel } from '../perks';

interface Props {
  state: GameState;
  compact: boolean;
  onBreach: (dir: 'up' | 'down') => void;
  onFly: () => void;
  onManual: () => void;
  onSave: () => void;
  onLoad: () => void;
  onUndo: () => void;
  onHelp: () => void;
  onHolyWater: () => void;
  onTool: (tool: 'bomb' | 'pickaxe') => void;
}

export function StatusPanel({ state, compact, onBreach, onFly, onManual, onSave, onLoad, onUndo, onHelp, onHolyWater, onTool }: Props) {
  const { run, tower } = state;
  const h = run.hero;
  const f = tower.floors[run.floor - 1];
  const up = breachTarget(state, 'up');
  const down = breachTarget(state, 'down');
  const stat = (label: string, value: string | number) => (
    <div className="mt-stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
  return (
    <div className="mt-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{f.label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{loopLabel(run.loop)}</span>
      </div>
      <div className={compact ? 'mt-statrow' : undefined} style={{ marginTop: 6 }}>
        {stat('HP 生命', h.hp)}
        {stat('ATK 攻击', h.atk)}
        {stat('DEF 防御', h.def)}
        {stat('Gold 金币', h.gold)}
        {stat('EXP 经验', `${h.exp} · L${h.level}`)}
        {stat('Stones 穿层石', h.stones)}
      </div>
      <div className="mt-keys" aria-label="Keys">
        <span className="mt-key"><i style={{ background: '#e0b23a' }} />{h.keys.y}</span>
        <span className="mt-key"><i style={{ background: '#4f8ae6' }} />{h.keys.b}</span>
        <span className="mt-key"><i style={{ background: '#e0483a' }} />{h.keys.r}</span>
        {h.holyWater > 0 && <span className="mt-key">✚ {h.holyWater}</span>}
        {h.bombs > 0 && <span className="mt-key">💣 {h.bombs}</span>}
        {h.pickaxes > 0 && <span className="mt-key">⛏ {h.pickaxes}</span>}
        {h.cross && <span className="mt-key">✝</span>}
        {h.shield > 0 && <span className="mt-key">◈ {h.shield}</span>}
      </div>
      <div className="mt-hollow">
        <span>Ceiling ▲ <b>{up != null ? 'hollow' : 'solid'}</b></span>
        <span>Floor ▼ <b>{down != null ? 'hollow' : 'solid'}</b></span>
      </div>
      {h.perks.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
          {h.perks.map(p => perkLabel(p)).join(' · ')}
        </div>
      )}
      <div className="mt-btnrow">
        <Button size="sm" variant={up != null && h.stones > 0 ? 'soft' : 'outline'} disabled={h.stones <= 0 || up == null} onClick={() => onBreach('up')} title="Breach the ceiling (B)">Breach ▲</Button>
        <Button size="sm" variant={down != null && h.stones > 0 ? 'soft' : 'outline'} disabled={h.stones <= 0 || down == null} onClick={() => onBreach('down')} title="Breach the floor (B)">Breach ▼</Button>
        <Button size="sm" disabled={!h.teleporter} onClick={onFly} title="Floor teleporter (F)">Fly</Button>
        {h.holyWater > 0 && <Button size="sm" variant="soft" onClick={onHolyWater} title="Drink holy water">Holy water</Button>}
        {h.bombs > 0 && <Button size="sm" onClick={() => onTool('bomb')}>Bomb</Button>}
        {h.pickaxes > 0 && <Button size="sm" onClick={() => onTool('pickaxe')}>Pickaxe</Button>}
      </div>
      <div className="mt-btnrow">
        <Button size="sm" onClick={onManual} title="Monster manual (M)">Manual</Button>
        <Button size="sm" onClick={onUndo} disabled={run.history.length === 0} title="Undo (Z)">Undo</Button>
        <Button size="sm" onClick={onSave} title="Save (S)">Save</Button>
        <Button size="sm" onClick={onLoad} title="Load (L)">Load</Button>
        <Button size="sm" variant="ghost" onClick={onHelp} title="Help (?)">?</Button>
      </div>
    </div>
  );
}
