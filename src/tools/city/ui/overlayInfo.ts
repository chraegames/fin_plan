// Labels, colours and one-line explanations for every data view (pure data).

import type { OverlayKind } from '../types';

export const OVERLAY_INFO: Record<OverlayKind, { label: string; color: string; hint: string; scale?: [string, string] }> = {
  none: { label: 'Zones', color: 'var(--cp-r)', hint: 'Zone colours: green homes, blue shops, yellow industry.' },
  power: { label: 'Power', color: 'var(--cp-power)', hint: 'Red buildings have no electricity. Roads and zones carry power from plants.' },
  water: { label: 'Water', color: 'var(--cp-water)', hint: 'Red buildings are dry. Pipes run under every road, within 6 tiles.' },
  garbage: { label: 'Garbage', color: '#8C7A4B', hint: 'Red buildings have no rubbish collection. Facilities reach along roads.' },
  traffic: { label: 'Traffic', color: 'var(--cp-road)', hint: 'Busy roads glow red. Avenues carry 2.5× more; buses cut car trips.', scale: ['quiet', 'jammed'] },
  transit: { label: 'Transit', color: '#E0A33B', hint: 'How far bus routes reach from each depot along the roads.', scale: ['none', 'served'] },
  pollution: { label: 'Pollution', color: '#8C7A4B', hint: 'Industry, coal, traffic and rubbish pollute; parks clean the air.', scale: ['clean', 'heavy'] },
  landValue: { label: 'Land value', color: 'var(--cp-coin)', hint: 'Hills, water, parks, civic buildings and services raise it; pollution and crime sink it.', scale: ['low', 'high'] },
  crime: { label: 'Crime', color: '#3F5FB0', hint: 'Dense, poor and unpoliced blocks. Police stations and schools lower it.', scale: ['safe', 'high'] },
  fireRisk: { label: 'Fire risk', color: 'var(--cp-danger)', hint: 'Old, dense and industrial buildings burn more; fire cover lowers the risk.', scale: ['low', 'high'] },
  fireCover: { label: 'Fire cover', color: '#F08A5D', hint: 'Reach of fire stations along the roads.', scale: ['none', 'covered'] },
  policeCover: { label: 'Police cover', color: '#6C8AE0', hint: 'Reach of police stations along the roads.', scale: ['none', 'covered'] },
  education: { label: 'Education', color: 'var(--cp-edu)', hint: 'School reach and capacity. Educated residents want better homes and jobs.', scale: ['none', 'full'] },
  health: { label: 'Health', color: 'var(--cp-health)', hint: 'Clinic and hospital reach and capacity.', scale: ['none', 'full'] },
  desirability: { label: 'Desirability', color: 'var(--cp-purple)', hint: 'How much people want to live or work on each lot. Growth follows it.', scale: ['unwanted', 'prime'] },
};

