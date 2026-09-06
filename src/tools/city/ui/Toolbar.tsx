import { DENSITY_NAMES } from '../constants';
import type { Density, Tool } from '../types';
import { TOOL_GROUPS, toolKey } from './toolbarData';

interface ToolbarProps {
  tool: Tool;
  density: Density;
  onTool: (t: Tool) => void;
  onDensity: (d: Density) => void;
  compact: boolean;
}

export function Toolbar({ tool, density, onTool, onDensity, compact }: ToolbarProps) {
  const active = toolKey(tool);
  return (
    <div className={`city-panel city-toolbar${compact ? ' city-toolbar-compact' : ''}`} role="toolbar" aria-label="Build tools">
      {TOOL_GROUPS.map(g => (
        <div className="city-toolgroup" key={g.title}>
          {!compact && <div className="city-toolgroup-title">{g.title}</div>}
          <div className="city-toolgroup-items">
            {g.items.map(item => (
              <button
                key={item.key}
                type="button"
                className={`city-tool${active === item.key ? ' city-tool-active' : ''}`}
                title={`${item.label}${item.cost ? ` — ${item.cost}` : ''}${item.hotkey ? ` (${item.hotkey})` : ''}`}
                aria-pressed={active === item.key}
                onClick={() => onTool(item.tool.kind === 'zone' ? { ...item.tool, density } : item.tool)}
              >
                <span className="city-tool-short">{item.short}</span>
                {!compact && <span className="city-tool-label">{item.label}</span>}
              </button>
            ))}
          </div>
          {g.title === 'Zones' && (
            <div className="city-density" role="radiogroup" aria-label="Zone density">
              {([1, 2, 3] as Density[]).map(d => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={density === d}
                  className={`city-density-btn${density === d ? ' city-density-active' : ''}`}
                  onClick={() => onDensity(d)}
                  title={`${DENSITY_NAMES[d]} density`}
                >
                  {compact ? DENSITY_NAMES[d][0] : DENSITY_NAMES[d]}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
