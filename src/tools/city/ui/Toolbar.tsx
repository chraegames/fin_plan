import { useState } from 'react';
import { DENSITY_NAMES } from '../constants';
import { densityTier } from '../sim/milestones';
import type { Density, Tool } from '../types';
import { CityIcon, type CityIconName } from './icons';
import { categoryOf, tierLabel, tierName, TOOL_CATEGORIES, toolItem, toolKey, toolTier, type ToolItem } from './toolbarData';

interface ToolbarProps {
  tool: Tool;
  density: Density;
  /** Milestone reached; anything with a higher tier is shown locked. */
  milestone: number;
  onTool: (t: Tool) => void;
  onDensity: (d: Density) => void;
  compact: boolean;
}

const DENSITY_ICON: CityIconName[] = ['densityLow', 'densityLow', 'densityMed', 'densityHigh'];

/** Dock of labelled categories; one opens as a flyout of named tools with an info card. */
export function Toolbar({ tool, density, milestone, onTool, onDensity, compact }: ToolbarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<ToolItem | null>(null);
  const activeKey = toolKey(tool);
  const activeCat = categoryOf(tool)?.key;
  const current = toolItem(tool);
  const flyout = open ? TOOL_CATEGORIES.find(c => c.key === open) : undefined;
  const pick = (t: Tool) => {
    onTool(t.kind === 'zone' ? { ...t, density } : t);
    setOpen(null);
    setHover(null);
  };
  const info = hover ?? (flyout ? flyout.items.find(it => it.key === activeKey) : undefined);
  const lockedCount = (items: ToolItem[]) => items.filter(it => toolTier(it, density) > milestone).length;
  return (
    <>
      <div className={`city-panel city-dock${compact ? ' city-dock-compact' : ''}`} role="toolbar" aria-label="Build tools">
        {TOOL_CATEGORIES.map(c => {
          const isOpen = open === c.key;
          const isActive = activeCat === c.key;
          const allLocked = !c.quick && lockedCount(c.items) === c.items.length;
          return (
            <button
              key={c.key}
              type="button"
              className={`city-cat${isActive ? ' city-on' : ''}${isOpen ? ' city-open' : ''}${allLocked ? ' city-locked' : ''}`}
              aria-haspopup={c.quick ? undefined : 'menu'}
              aria-expanded={c.quick ? undefined : isOpen}
              aria-pressed={c.quick ? isActive : undefined}
              onClick={() => (c.quick ? pick(c.items[0].tool) : setOpen(isOpen ? null : c.key))}
              title={c.title}
            >
              <span className="city-tile" style={{ background: c.color }}>
                <CityIcon name={c.icon} size={18} />
                {allLocked && (
                  <span className="city-tile-lock">
                    <CityIcon name="lock" size={10} />
                  </span>
                )}
              </span>
              <span className="city-cat-label">{c.title}</span>
            </button>
          );
        })}
      </div>
      {flyout && (
        <div className={`city-flyout-wrap${compact ? ' city-flyout-wrap-compact' : ''}`}>
          <div className={`city-panel city-flyout${compact ? ' city-flyout-compact' : ''}`} role="menu" aria-label={flyout.title} onMouseLeave={() => setHover(null)}>
            <div className="city-flyout-title">{flyout.title}</div>
            <div className={`city-flyout-items${flyout.items.length > 6 ? ' city-flyout-cols' : ''}`}>
              {flyout.items.map(item => {
                const tier = toolTier(item, density);
                const locked = tier > milestone;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={activeKey === item.key}
                    aria-disabled={locked || undefined}
                    className={`city-flyout-item${activeKey === item.key ? ' city-on' : ''}${locked ? ' city-locked' : ''}`}
                    onClick={() => !locked && pick(item.tool)}
                    onMouseEnter={() => setHover(item)}
                    onFocus={() => setHover(item)}
                  >
                    <span className="city-tile" style={{ background: item.color }}>
                      <CityIcon name={item.icon} size={16} />
                      {locked && (
                        <span className="city-tile-lock">
                          <CityIcon name="lock" size={10} />
                        </span>
                      )}
                    </span>
                    <span className="city-flyout-text">
                      <b>{item.label}</b>
                      <small>{locked ? `Needs ${tierName(tier)}` : `${item.cost}${item.hotkey ? ` · ${item.hotkey}` : ''}`}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            {flyout.key === 'zones' && (
              <div className="city-density" role="radiogroup" aria-label="Zone density">
                {([1, 2, 3] as Density[]).map(d => {
                  const locked = densityTier(d) > milestone;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={density === d}
                      aria-disabled={locked || undefined}
                      className={`city-density-btn${density === d ? ' city-on' : ''}${locked ? ' city-locked' : ''}`}
                      onClick={() => !locked && onDensity(d)}
                      title={locked ? `Unlocks at ${tierLabel(densityTier(d))}` : `${DENSITY_NAMES[d]} density`}
                    >
                      <CityIcon name={locked ? 'lock' : DENSITY_ICON[d]} size={14} />
                      {DENSITY_NAMES[d]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {info && !compact && (
            <div className="city-panel city-infocard" aria-live="polite">
              <div className="city-infocard-head">
                <span className="city-tile" style={{ background: info.color }}>
                  <CityIcon name={info.icon} size={18} />
                </span>
                <div>
                  <b>{info.label}</b>
                  <small>{info.cost}</small>
                </div>
              </div>
              <p>{info.desc}</p>
              {info.facts.length > 0 && (
                <ul>
                  {info.facts.map(f => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {toolTier(info, density) > milestone && (
                <div className="city-infocard-lock">
                  <CityIcon name="lock" size={12} /> Unlocks at {tierLabel(toolTier(info, density))} residents
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {!compact && current && tool.kind !== 'inspect' && (
        <div className="city-panel city-toolbadge" aria-live="polite">
          <span className="city-tile" style={{ background: current.color }}>
            <CityIcon name={current.icon} size={18} />
          </span>
          <div>
            <b>
              {current.label}
              {tool.kind === 'zone' ? ` · ${DENSITY_NAMES[tool.density]}` : ''}
            </b>
            <span>{current.cost}</span>
          </div>
        </div>
      )}
    </>
  );
}
