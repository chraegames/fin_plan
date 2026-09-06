// Toolbar groups (data only; Toolbar.tsx renders them).

import { COST, PLOPS, plopDef } from '../constants';
import { PLOP, type Tool } from '../types';
import type { CityIconName } from './icons';

export interface ToolItem {
  key: string;
  label: string;
  icon: CityIconName;
  /** CSS colour for the tile (a --cp-* variable). */
  color: string;
  cost: string;
  tool: Tool;
  hotkey?: string;
}
export interface ToolGroup {
  title: string;
  items: ToolItem[];
}

const plopItem = (id: number, icon: CityIconName, color: string, hotkey?: string): ToolItem => {
  const d = plopDef(id)!;
  return { key: d.key, label: d.name, icon, color, cost: `$${d.cost} · $${d.monthly}/mo`, tool: { kind: 'plop', plop: d.id }, hotkey };
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: 'Zones',
    items: [
      { key: 'r', label: 'Residential zone', icon: 'house', color: 'var(--cp-r)', cost: `$${COST.zone}/tile`, tool: { kind: 'zone', zone: 1, density: 1 }, hotkey: 'R' },
      { key: 'c', label: 'Commercial zone', icon: 'shop', color: 'var(--cp-c)', cost: `$${COST.zone}/tile`, tool: { kind: 'zone', zone: 2, density: 1 }, hotkey: 'C' },
      { key: 'i', label: 'Industrial zone', icon: 'factory', color: 'var(--cp-i)', cost: `$${COST.zone}/tile`, tool: { kind: 'zone', zone: 3, density: 1 }, hotkey: 'I' },
      { key: 'dezone', label: 'Remove zoning', icon: 'dezone', color: 'var(--cp-muted)', cost: 'free', tool: { kind: 'dezone' } },
    ],
  },
  {
    title: 'Transport & power',
    items: [
      { key: 'road', label: 'Road', icon: 'road', color: 'var(--cp-road)', cost: `$${COST.road}/tile`, tool: { kind: 'road' }, hotkey: 'T' },
      { key: 'avenue', label: 'Avenue', icon: 'avenue', color: '#3E4147', cost: `$${COST.avenue}/tile · 2.5× capacity`, tool: { kind: 'avenue' }, hotkey: 'Y' },
      { key: 'line', label: 'Power line', icon: 'pylon', color: 'var(--cp-power)', cost: `$${plopDef(PLOP.LINE)!.cost}/tile`, tool: { kind: 'line' } },
      plopItem(PLOP.COAL, 'coal', '#6B6E7A'),
      plopItem(PLOP.GAS, 'gas', '#E58E3B'),
      plopItem(PLOP.WIND, 'wind', '#66B8D9'),
      plopItem(PLOP.SOLAR, 'solar', '#3D62B8'),
    ],
  },
  {
    title: 'Water',
    items: [plopItem(PLOP.PUMP, 'pump', 'var(--cp-water)'), plopItem(PLOP.TOWER, 'tower', '#3B7FB5')],
  },
  {
    title: 'Services',
    items: [
      plopItem(PLOP.FIRE, 'firestation', 'var(--cp-danger)'),
      plopItem(PLOP.POLICE, 'police', '#3F5FB0'),
      plopItem(PLOP.CLINIC, 'clinic', 'var(--cp-health)'),
      plopItem(PLOP.HOSPITAL, 'hospital', '#C44D67'),
      plopItem(PLOP.SCHOOL, 'school', 'var(--cp-edu)'),
      plopItem(PLOP.HIGH, 'highschool', '#A9702B'),
      plopItem(PLOP.UNI, 'university', '#7E521C'),
    ],
  },
  {
    title: 'Parks & tools',
    items: [
      plopItem(PLOP.PARK_S, 'park', 'var(--cp-park)'),
      plopItem(PLOP.PARK_L, 'parkL', '#2E7D3A'),
      { key: 'bulldoze', label: 'Bulldoze', icon: 'bulldoze', color: '#E07B2E', cost: `$${COST.bulldoze}/tile`, tool: { kind: 'bulldoze' }, hotkey: 'B' },
      { key: 'inspect', label: 'Inspect', icon: 'inspect', color: 'var(--cp-purple)', cost: 'click a tile', tool: { kind: 'inspect' }, hotkey: 'Esc' },
    ],
  },
  {
    title: 'Disasters',
    items: [
      { key: 'fire', label: 'Start a fire', icon: 'flame', color: '#B3261E', cost: 'disaster', tool: { kind: 'disaster', disaster: 'fire' } },
      { key: 'tornado', label: 'Tornado', icon: 'tornado', color: '#5E6B85', cost: 'disaster', tool: { kind: 'disaster', disaster: 'tornado' } },
      { key: 'quake', label: 'Earthquake', icon: 'quake', color: '#7A5A3A', cost: 'disaster', tool: { kind: 'disaster', disaster: 'quake' } },
    ],
  },
];

export function toolKey(t: Tool): string {
  switch (t.kind) {
    case 'zone':
      return ['', 'r', 'c', 'i'][t.zone];
    case 'plop':
      return plopDef(t.plop)?.key ?? 'plop';
    case 'disaster':
      return t.disaster;
    default:
      return t.kind;
  }
}

export function toolItem(t: Tool): ToolItem | undefined {
  const k = toolKey(t);
  for (const g of TOOL_GROUPS) for (const it of g.items) if (it.key === k) return it;
  return undefined;
}

export { PLOPS };
