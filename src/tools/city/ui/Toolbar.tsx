import { useState } from 'react';
import { DENSITY_NAMES } from '../constants';
import type { Density, Tool } from '../types';
import { CityIcon, type CityIconName } from './icons';
import { categoryOf, TOOL_CATEGORIES, toolItem, toolKey } from './toolbarData';

interface ToolbarProps {
  tool: Tool;
  density: Density;
  onTool: (t: Tool) => void;
  onDensity: (d: Density) => void;
  compact: boolean;
}

const DENSITY_ICON: CityIconName[] = ['densityLow', 'densityLow', 'densityMed', 'densityHigh'];

/** Dock of labelled categories; one opens as a flyout of named tools. */
export function Toolbar({ tool, density, onTool, onDensity, compact }: ToolbarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const activeKey = toolKey(tool);
  const activeCat = categoryOf(tool)?.key;
  const current = toolItem(tool);
  const flyout = open ? TOOL_CATEGORIES.find(c => c.key === open) : undefined;
  const pick = (t: Tool) => {
    onTool(t.kind === 'zone' ? { ...t, density } : t);
    setOpen(null);
  };
  return (
    <>
      <div className={`city-panel city-dock${compact ? ' city-dock-compact' : ''}`} role="toolbar" aria-label="Build tools">
        {TOOL_CATEGORIES.map(c => {
          const isOpen = open === c.key;
          const isActive = activeCat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              className={`city-cat${isActive ? ' city-on' : ''}${isOpen ? ' city-open' : ''}`}
              aria-haspopup={c.quick ? undefined : 'menu'}
              aria-expanded={c.quick ? undefined : isOpen}
              aria-pressed={c.quick ? isActive : undefined}
              onClick={() => (c.quick ? pick(c.items[0].tool) : setOpen(isOpen ? null : c.key))}
              title={c.title}
            >
              <span className="city-tile" style={{ background: c.color }}>
                <CityIcon name={c.icon} size={18} />
              </span>
              <span className="city-cat-label">{c.title}</span>
            </button>
          );
        })}
      </div>
      {flyout && (
        <div className={`city-panel city-flyout${compact ? ' city-flyout-compact' : ''}`} role="menu" aria-label={flyout.title}>
          <div className="city-flyout-title">{flyout.title}</div>
          {flyout.items.map(item => (
            <button key={item.key} type="button" role="menuitemradio" aria-checked={activeKey === item.key} className={`city-flyout-item${activeKey === item.key ? ' city-on' : ''}`} onClick={() => pick(item.tool)}>
              <span className="city-tile" style={{ background: item.color }}>
                <CityIcon name={item.icon} size={16} />
              </span>
              <span className="city-flyout-text">
                <b>{item.label}</b>
                <small>
                  {item.cost}
                  {item.hotkey ? ` · ${item.hotkey}` : ''}
                </small>
              </span>
            </button>
          ))}
          {flyout.key === 'zones' && (
            <div className="city-density" role="radiogroup" aria-label="Zone density">
              {([1, 2, 3] as Density[]).map(d => (
                <button key={d} type="button" role="radio" aria-checked={density === d} className={`city-density-btn${density === d ? ' city-on' : ''}`} onClick={() => onDensity(d)}>
                  <CityIcon name={DENSITY_ICON[d]} size={14} />
                  {DENSITY_NAMES[d]}
                </button>
              ))}
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
