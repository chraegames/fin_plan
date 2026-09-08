// Tool categories (data only; Toolbar.tsx renders the dock + flyout).

import { COST, PLOPS, TUNING, plopDef, type PlopDef } from '../constants';
import { AVENUE_TIER, densityTier, MILESTONES, unlockTier } from '../sim/milestones';
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
  /** Milestone index needed (0 = always available). */
  tier: number;
  /** Longer copy for the info card. */
  desc: string;
  /** Extra facts for the info card. */
  facts: string[];
}
export interface ToolCategory {
  key: string;
  title: string;
  icon: CityIconName;
  color: string;
  items: ToolItem[];
  /** Quick tools sit on the dock itself, with no flyout. */
  quick?: true;
}

export const PLOP_ICON: Record<number, CityIconName> = {
  [PLOP.COAL]: 'coal',
  [PLOP.GAS]: 'gas',
  [PLOP.WIND]: 'wind',
  [PLOP.SOLAR]: 'solar',
  [PLOP.HYDRO]: 'hydro',
  [PLOP.NUCLEAR]: 'nuclear',
  [PLOP.LINE]: 'pylon',
  [PLOP.PUMP]: 'pump',
  [PLOP.TOWER]: 'tower',
  [PLOP.TREATMENT]: 'treatment',
  [PLOP.PIPE]: 'pipe',
  [PLOP.LANDFILL]: 'landfill',
  [PLOP.INCINERATOR]: 'incinerator',
  [PLOP.RECYCLING]: 'recycling',
  [PLOP.FIRE]: 'firestation',
  [PLOP.FIRE_HQ]: 'fireHq',
  [PLOP.POLICE]: 'police',
  [PLOP.POLICE_HQ]: 'policeHq',
  [PLOP.CLINIC]: 'clinic',
  [PLOP.HOSPITAL]: 'hospital',
  [PLOP.SCHOOL]: 'school',
  [PLOP.HIGH]: 'highschool',
  [PLOP.LIBRARY]: 'library',
  [PLOP.UNI]: 'university',
  [PLOP.PARK_S]: 'park',
  [PLOP.PARK_L]: 'parkL',
  [PLOP.PLAZA]: 'plaza',
  [PLOP.BUS]: 'bus',
  [PLOP.CITY_HALL]: 'cityHall',
  [PLOP.STADIUM]: 'stadium',
  [PLOP.LANDMARK]: 'landmark',
};

export const PLOP_COLOR: Record<number, string> = {
  [PLOP.COAL]: '#6B6E7A',
  [PLOP.GAS]: '#E58E3B',
  [PLOP.WIND]: '#66B8D9',
  [PLOP.SOLAR]: '#3D62B8',
  [PLOP.HYDRO]: '#2E86AB',
  [PLOP.NUCLEAR]: '#7A9E3B',
  [PLOP.LINE]: 'var(--cp-power)',
  [PLOP.PUMP]: 'var(--cp-water)',
  [PLOP.TOWER]: '#3B7FB5',
  [PLOP.TREATMENT]: '#2F6F9F',
  [PLOP.PIPE]: '#5FA8D3',
  [PLOP.LANDFILL]: '#8C7A4B',
  [PLOP.INCINERATOR]: '#6F5A3E',
  [PLOP.RECYCLING]: '#3FA66B',
  [PLOP.FIRE]: 'var(--cp-danger)',
  [PLOP.FIRE_HQ]: '#B3261E',
  [PLOP.POLICE]: '#3F5FB0',
  [PLOP.POLICE_HQ]: '#2E4585',
  [PLOP.CLINIC]: 'var(--cp-health)',
  [PLOP.HOSPITAL]: '#C44D67',
  [PLOP.SCHOOL]: 'var(--cp-edu)',
  [PLOP.HIGH]: '#A9702B',
  [PLOP.LIBRARY]: '#8D6E63',
  [PLOP.UNI]: '#7E521C',
  [PLOP.PARK_S]: 'var(--cp-park)',
  [PLOP.PARK_L]: '#2E7D3A',
  [PLOP.PLAZA]: '#9C8F7A',
  [PLOP.BUS]: '#E0A33B',
  [PLOP.CITY_HALL]: '#B08D57',
  [PLOP.STADIUM]: '#4F86E0',
  [PLOP.LANDMARK]: 'var(--cp-purple)',
};

/** Facts shown on the info card for a facility. */
export function plopFacts(d: PlopDef): string[] {
  const out: string[] = [`${d.size}×${d.size} tiles`];
  switch (d.kind) {
    case 'power':
      out.push(`${d.capacity.toLocaleString('en-US')} power`);
      out.push(d.emission ? `pollution ${d.emission}` : 'no pollution');
      break;
    case 'water':
      out.push(`${d.capacity.toLocaleString('en-US')} water`);
      break;
    case 'garbage':
      out.push(`${d.capacity.toLocaleString('en-US')} rubbish / month`);
      out.push(`reach ${TUNING.serviceRange[d.id]} road tiles`);
      if (d.power) out.push(`+${d.power} power`);
      if (d.emission) out.push(`pollution ${d.emission}`);
      break;
    case 'fire':
    case 'police':
    case 'transit':
      out.push(`reach ${TUNING.serviceRange[d.id]} road tiles`);
      break;
    case 'health':
      out.push(`${TUNING.serviceCapacity[d.id]?.toLocaleString('en-US')} patients`, `reach ${TUNING.serviceRange[d.id]} road tiles`);
      break;
    case 'education':
      out.push(`${TUNING.serviceCapacity[d.id]?.toLocaleString('en-US')} students`, `reach ${TUNING.serviceRange[d.id]} road tiles`);
      break;
    case 'civic':
      out.push(`lifts ${TUNING.serviceRange[d.id]} tiles around it`);
      break;
    default:
      break;
  }
  if (d.needsRoad) out.push('needs a road next to it');
  if (d.needsWater) out.push('must touch water');
  return out;
}

const plopItem = (id: number, hotkey?: string): ToolItem => {
  const d = plopDef(id)!;
  return {
    key: d.key,
    label: d.name,
    icon: PLOP_ICON[id] ?? 'house',
    color: PLOP_COLOR[id] ?? 'var(--cp-muted)',
    cost: `$${d.cost.toLocaleString('en-US')} · $${d.monthly}/mo`,
    tool: { kind: 'plop', plop: d.id },
    hotkey,
    tier: unlockTier(id),
    desc: d.desc,
    facts: plopFacts(d),
  };
};

const zoneItem = (zone: 1 | 2 | 3, label: string, icon: CityIconName, color: string, hotkey: string, desc: string): ToolItem => ({
  key: ['', 'r', 'c', 'i'][zone],
  label,
  icon,
  color,
  cost: `$${COST.zone}/tile`,
  tool: { kind: 'zone', zone, density: 1 },
  hotkey,
  tier: 0,
  desc,
  facts: ['drag a rectangle within 3 tiles of a road', 'buildings grow on their own when demand is up'],
});

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    key: 'zones',
    title: 'Zones',
    icon: 'house',
    color: 'var(--cp-r)',
    items: [
      zoneItem(1, 'Residential', 'house', 'var(--cp-r)', 'R', 'Homes. People move in when there are jobs, power and a road nearby.'),
      zoneItem(2, 'Commercial', 'shop', 'var(--cp-c)', 'C', 'Shops and offices. They want customers close by and a tidy neighbourhood.'),
      zoneItem(3, 'Industrial', 'factory', 'var(--cp-i)', 'I', 'Factories. Lots of jobs and pollution; they need a road to the map edge to export.'),
      { key: 'dezone', label: 'Remove zoning', icon: 'dezone', color: 'var(--cp-muted)', cost: 'free', tool: { kind: 'dezone' }, tier: 0, desc: 'Clears zoning from empty land. Built lots keep their zone until bulldozed.', facts: [] },
    ],
  },
  {
    key: 'roads',
    title: 'Roads',
    icon: 'road',
    color: 'var(--cp-road)',
    items: [
      { key: 'road', label: 'Street', icon: 'road', color: 'var(--cp-road)', cost: `$${COST.road}/tile`, tool: { kind: 'road' }, hotkey: 'T', tier: 0, desc: 'Every road carries power and a water pipe. Reach the map edge to connect the outside world.', facts: ['drag to draw an L-shaped route', 'upkeep $0.60 per tile'] },
      { key: 'avenue', label: 'Avenue', icon: 'avenue', color: '#3E4147', cost: `$${COST.avenue}/tile · 2.5× capacity`, tool: { kind: 'avenue' }, hotkey: 'Y', tier: AVENUE_TIER, desc: 'A wide road with 2.5× the capacity. Draw it over a jammed street to upgrade in place.', facts: ['upkeep $1.20 per tile'] },
    ],
  },
  {
    key: 'power',
    title: 'Power',
    icon: 'pylon',
    color: 'var(--cp-power)',
    items: [plopItem(PLOP.WIND), plopItem(PLOP.COAL), plopItem(PLOP.GAS), plopItem(PLOP.SOLAR), plopItem(PLOP.HYDRO), plopItem(PLOP.NUCLEAR), { ...plopItem(PLOP.LINE), cost: `$${plopDef(PLOP.LINE)!.cost}/tile`, tool: { kind: 'line' } }],
  },
  {
    key: 'water',
    title: 'Water',
    icon: 'pump',
    color: 'var(--cp-water)',
    items: [plopItem(PLOP.PUMP), plopItem(PLOP.TOWER), plopItem(PLOP.TREATMENT), { ...plopItem(PLOP.PIPE), cost: `$${plopDef(PLOP.PIPE)!.cost}/tile`, tool: { kind: 'pipe' } }],
  },
  {
    key: 'garbage',
    title: 'Garbage',
    icon: 'bin',
    color: '#8C7A4B',
    items: [plopItem(PLOP.LANDFILL), plopItem(PLOP.INCINERATOR), plopItem(PLOP.RECYCLING)],
  },
  {
    key: 'services',
    title: 'Services',
    icon: 'police',
    color: '#3F5FB0',
    items: [plopItem(PLOP.FIRE), plopItem(PLOP.FIRE_HQ), plopItem(PLOP.POLICE), plopItem(PLOP.POLICE_HQ), plopItem(PLOP.CLINIC), plopItem(PLOP.HOSPITAL), plopItem(PLOP.SCHOOL), plopItem(PLOP.HIGH), plopItem(PLOP.LIBRARY), plopItem(PLOP.UNI)],
  },
  {
    key: 'civic',
    title: 'Civic',
    icon: 'park',
    color: 'var(--cp-park)',
    items: [plopItem(PLOP.PARK_S), plopItem(PLOP.PARK_L), plopItem(PLOP.PLAZA), plopItem(PLOP.BUS), plopItem(PLOP.CITY_HALL), plopItem(PLOP.STADIUM), plopItem(PLOP.LANDMARK)],
  },
  {
    key: 'disasters',
    title: 'Disasters',
    icon: 'tornado',
    color: '#5E6B85',
    items: [
      { key: 'fire', label: 'Fire', icon: 'flame', color: '#B3261E', cost: 'sets a building alight', tool: { kind: 'disaster', disaster: 'fire' }, tier: 0, desc: 'Start a fire on a building. Fire stations nearby put it out.', facts: [] },
      { key: 'tornado', label: 'Tornado', icon: 'tornado', color: '#5E6B85', cost: 'wanders for a while', tool: { kind: 'disaster', disaster: 'tornado' }, tier: 0, desc: 'A tornado that wanders across the map wrecking what it touches.', facts: [] },
      { key: 'quake', label: 'Earthquake', icon: 'quake', color: '#7A5A3A', cost: 'radius 9', tool: { kind: 'disaster', disaster: 'quake' }, tier: 0, desc: 'Instant damage in a radius of nine tiles.', facts: [] },
    ],
  },
  {
    key: 'bulldoze',
    title: 'Bulldoze',
    icon: 'bulldoze',
    color: '#E07B2E',
    quick: true,
    items: [{ key: 'bulldoze', label: 'Bulldoze', icon: 'bulldoze', color: '#E07B2E', cost: `$${COST.bulldoze}/tile`, tool: { kind: 'bulldoze' }, hotkey: 'B', tier: 0, desc: 'Clears buildings, roads and zoning.', facts: [] }],
  },
  {
    key: 'inspect',
    title: 'Inspect',
    icon: 'inspect',
    color: 'var(--cp-purple)',
    quick: true,
    items: [{ key: 'inspect', label: 'Inspect', icon: 'inspect', color: 'var(--cp-purple)', cost: 'click a tile', tool: { kind: 'inspect' }, hotkey: 'Esc', tier: 0, desc: 'Click any tile to see what is there and what it needs.', facts: [] }],
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
  for (const c of TOOL_CATEGORIES) for (const it of c.items) if (it.key === k) return it;
  return undefined;
}

export function categoryOf(t: Tool): ToolCategory | undefined {
  const k = toolKey(t);
  return TOOL_CATEGORIES.find(c => c.items.some(it => it.key === k));
}

/** Tier needed for a tool at the given zone density (zones lock by density, not by kind). */
export function toolTier(item: ToolItem, density: number): number {
  if (item.tool.kind === 'zone') return densityTier(density);
  return item.tier;
}

export function tierName(tier: number): string {
  return MILESTONES[tier]?.name ?? '';
}

export function tierLabel(tier: number): string {
  const m = MILESTONES[tier];
  return m ? `${m.name} · ${m.pop.toLocaleString('en-US')}` : '';
}

export { PLOPS };
