// The advisor: a short, prioritised list of what is holding the city back.

import { TICKS_PER_MONTH } from '../constants';
import { CHANGE, T, ZONE, type AdvisorMsg, type CityState } from '../types';

export function advise(s: CityState): void {
  const out: AdvisorMsg[] = [];
  const t = s.totals;
  const push = (id: string, level: AdvisorMsg['level'], text: string) => {
    if (out.length < 5) out.push({ id, level, text });
  };
  if (s.tick === 0) push('welcome', 'info', 'Welcome, mayor. Lay a road that reaches the map edge, zone along it, and place a power plant to get started.');
  if (s.funds < 0) push('broke', 'bad', 'The treasury is in the red. Raise taxes, cut service funding, or take a loan before services are cut automatically.');
  if (t.powerDemand > 0 && t.powerSupply === 0) push('nopower', 'bad', 'Nothing is powered. Place a power plant next to the zoned area (roads and zones carry power).');
  else if (t.powerDemand > t.powerSupply && t.powerDemand > 0) push('brownout', 'bad', 'Brownouts: power demand exceeds supply. Build another plant or raise power funding.');
  if (t.waterDemand > t.waterSupply * 1.25 && t.waterDemand > 0) push('water', 'warn', 'Water is short. Pumps next to a river or lake give the most; pipes run under roads.');
  if (!s.externalConnected && t.buildings > 0) push('ext', 'warn', 'No road reaches the map edge, so industry cannot export and residents cannot commute out of town.');
  if (t.fires > 0) push('fire', 'bad', `${t.fires} tile${t.fires > 1 ? 's are' : ' is'} on fire. Fire stations near the blaze put it out faster.`);
  if (t.population > 500 && t.unemployment > 0.12) push('jobs', 'warn', `Unemployment is ${Math.round(t.unemployment * 100)}%. Zone commercial and industrial land near the residents.`);
  // demand with nowhere to go
  const empty = [0, 0, 0, 0];
  for (let i = 0; i < T; i++) if (s.zone[i] && !s.level[i] && s.roadAccess[i]) empty[s.zone[i]]++;
  const names = ['', 'residential', 'commercial', 'industrial'];
  for (let z = 1; z <= 3; z++) {
    const d = Math.max(s.demand[(z - 1) * 3], s.demand[(z - 1) * 3 + 1], s.demand[(z - 1) * 3 + 2]);
    if (d > 60 && empty[z] < 4) push(`zone${z}`, 'info', `Demand for ${names[z]} space is high and there is little zoned ${names[z]} land with road access.`);
  }
  if (t.meanPollution > 80) push('poll', 'warn', 'Air pollution is heavy. Keep industry and coal plants downwind of homes and plant parks.');
  if (t.meanCrime > 90) push('crime', 'warn', 'Crime is high. Police stations cover the roads around them; schools help in the long run.');
  const zonedR = empty[ZONE.R] + countBuilt(s, ZONE.R);
  if (s.tick > TICKS_PER_MONTH * 6 && zonedR === 0) push('noR', 'info', 'No residential zones yet. Drag the residential tool over land within three tiles of a road.');
  s.messages = out;
  s.changed |= CHANGE.HUD;
}

function countBuilt(s: CityState, zone: number): number {
  let n = 0;
  for (let i = 0; i < T; i++) if (s.level[i] && s.zone[i] === zone) n++;
  return n;
}
