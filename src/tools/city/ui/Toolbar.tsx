import { DENSITY_NAMES } from '../constants';
import type { Density, Tool } from '../types';
import { CityIcon, type CityIconName } from './icons';
import { TOOL_GROUPS, toolItem, toolKey } from './toolbarData';

interface ToolbarProps {
  tool: Tool;
  density: Density;
  onTool: (t: Tool) => void;
  onDensity: (d: Density) => void;
  compact: boolean;
}

const DENSITY_ICON: CityIconName[] = ['densityLow', 'densityLow', 'densityMed', 'densityHigh'];

export function Toolbar({ tool, density, onTool, onDensity, compact }: ToolbarProps) {
  const active = toolKey(tool);
  const current = toolItem(tool);
  return (
    <>
      <div className={`city-panel city-toolbar${compact ? ' city-toolbar-compact' : ''}`} role="toolbar" aria-label="Build tools">
        {TOOL_GROUPS.map(g => (
          <div className="city-toolgroup" key={g.title}>
            {g.items.map(item => (
              <button
                key={item.key}
                type="button"
                className={`city-tool${active === item.key ? ' city-on' : ''}`}
                style={{ background: item.color }}
                data-label={`${item.label}${item.cost ? ` · ${item.cost}` : ''}${item.hotkey ? ` (${item.hotkey})` : ''}`}
                aria-label={item.label}
                aria-pressed={active === item.key}
                onClick={() => onTool(item.tool.kind === 'zone' ? { ...item.tool, density } : item.tool)}
              >
                <CityIcon name={item.icon} size={24} />
              </button>
            ))}
            {g.title === 'Zones' && (
              <div className="city-density" role="radiogroup" aria-label="Zone density">
                {([1, 2, 3] as Density[]).map(d => (
                  <button key={d} type="button" role="radio" aria-checked={density === d} className={`city-tool${density === d ? ' city-on' : ''}`} onClick={() => onDensity(d)} aria-label={`${DENSITY_NAMES[d]} density`} data-label={`${DENSITY_NAMES[d]} density`}>
                    <CityIcon name={DENSITY_ICON[d]} size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
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
