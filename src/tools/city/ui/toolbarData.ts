// Toolbar groups (data only; Toolbar.tsx renders them).

import { COST, PLOPS, plopDef } from '../constants';
import { PLOP, type Tool } from '../types';

export interface ToolItem {
  key: string;
  label: string;
  short: string;
  cost: string;
  tool: Tool;
  hotkey?: string;
}
export interface ToolGroup {
  title: string;
  items: ToolItem[];
}

const plopItem = (id: number, short: string, hotkey?: string): ToolItem => {
  const d = plopDef(id)!;
  return { key: d.key, label: d.name, short, cost: `$${d.cost} · $${d.monthly}/mo`, tool: { kind: 'plop', plop: d.id }, hotkey };
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: 'Zones',
    items: [
      { key: 'r', label: 'Residential', short: 'R', cost: `$${COST.zone}/tile`, tool: { kind: 'zone', zone: 1, density: 1 }, hotkey: 'R' },
      { key: 'c', label: 'Commercial', short: 'C', cost: `$${COST.zone}/tile`, tool: { kind: 'zone', zone: 2, density: 1 }, hotkey: 'C' },
      { key: 'i', label: 'Industrial', short: 'I', cost: `$${COST.zone}/tile`, tool: { kind: 'zone', zone: 3, density: 1 }, hotkey: 'I' },
      { key: 'dezone', label: 'De-zone', short: '∅', cost: 'free', tool: { kind: 'dezone' } },
    ],
  },
  {
    title: 'Transport & power',
    items: [
      { key: 'road', label: 'Road', short: '═', cost: `$${COST.road}/tile`, tool: { kind: 'road' }, hotkey: 'T' },
      { key: 'line', label: 'Power line', short: '⚡', cost: `$${plopDef(PLOP.LINE)!.cost}/tile`, tool: { kind: 'line' } },
      plopItem(PLOP.COAL, 'Coal'),
      plopItem(PLOP.GAS, 'Gas'),
      plopItem(PLOP.WIND, 'Wind'),
      plopItem(PLOP.SOLAR, 'Solar'),
    ],
  },
  {
    title: 'Water',
    items: [plopItem(PLOP.PUMP, 'Pump'), plopItem(PLOP.TOWER, 'Tower')],
  },
  {
    title: 'Services',
    items: [plopItem(PLOP.FIRE, 'Fire'), plopItem(PLOP.POLICE, 'Police'), plopItem(PLOP.CLINIC, 'Clinic'), plopItem(PLOP.HOSPITAL, 'Hosp.'), plopItem(PLOP.SCHOOL, 'School'), plopItem(PLOP.HIGH, 'High'), plopItem(PLOP.UNI, 'Univ.')],
  },
  {
    title: 'Parks & tools',
    items: [
      plopItem(PLOP.PARK_S, 'Park'),
      plopItem(PLOP.PARK_L, 'Park L'),
      { key: 'bulldoze', label: 'Bulldoze', short: '✕', cost: `$${COST.bulldoze}/tile`, tool: { kind: 'bulldoze' }, hotkey: 'B' },
      { key: 'fire', label: 'Start a fire', short: '🔥', cost: 'disaster', tool: { kind: 'fire' } },
      { key: 'inspect', label: 'Inspect', short: '?', cost: '', tool: { kind: 'inspect' }, hotkey: 'Esc' },
    ],
  },
];

export function toolKey(t: Tool): string {
  switch (t.kind) {
    case 'zone':
      return ['', 'r', 'c', 'i'][t.zone];
    case 'plop':
      return plopDef(t.plop)?.key ?? 'plop';
    default:
      return t.kind;
  }
}

export { PLOPS };
