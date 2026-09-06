// Monthly ledger: taxes in, services and loans out.

import { PLOPS, TUNING, plopDef } from '../constants';
import { CHANGE, SERVICE, SERVICE_COUNT, T, ZONE, type CityState, type Ledger } from '../types';

/** Funding a service actually gets: the slider, halved after months in the red. */
export function effectiveFunding(s: CityState, service: number): number {
  const f = s.funding[service];
  return s.monthsInRed >= TUNING.redMonthsBeforeCuts ? f * 0.5 : f;
}

export function monthlyBudget(s: CityState): Ledger {
  let incomeR = 0;
  let incomeC = 0;
  let incomeI = 0;
  const expenses = new Array<number>(SERVICE_COUNT).fill(0);
  const plopCount = new Map<number, number>();
  for (let i = 0; i < T; i++) {
    if (s.plop[i] && s.plopOrigin[i] === i) plopCount.set(s.plop[i], (plopCount.get(s.plop[i]) ?? 0) + 1);
    if (!s.level[i] || s.abandoned[i]) continue;
    const z = s.zone[i];
    const wm = TUNING.wealthTaxMult[s.wealth[i]];
    if (z === ZONE.R) incomeR += s.pop[i] * TUNING.taxR * wm * (s.taxes[0] / TUNING.taxNeutral);
    else if (z === ZONE.C) incomeC += s.jobs[i] * TUNING.taxC * wm * (s.taxes[1] / TUNING.taxNeutral);
    else incomeI += s.jobs[i] * TUNING.taxI * wm * (s.taxes[2] / TUNING.taxNeutral);
  }
  for (const def of PLOPS) {
    const n = plopCount.get(def.id) ?? 0;
    if (!n) continue;
    const slot = def.service < 0 ? SERVICE.ROADS : def.service;
    expenses[slot] += n * def.monthly * s.funding[slot];
  }
  expenses[SERVICE.ROADS] += s.totals.roadTiles * TUNING.roadUpkeep * s.funding[SERVICE.ROADS];
  let loanCost = 0;
  for (const loan of s.loans) {
    const principalPart = loan.principal / TUNING.loanMonths;
    loanCost += principalPart + (loan.balance * TUNING.loanApr) / 12;
    loan.balance -= principalPart;
    loan.monthsLeft--;
  }
  s.loans = s.loans.filter(l => l.balance > 0.5 && l.monthsLeft > 0);
  const totalExp = expenses.reduce((a, b) => a + b, 0) + loanCost;
  const net = incomeR + incomeC + incomeI - totalExp;
  s.funds += net;
  s.monthsInRed = s.funds < 0 ? s.monthsInRed + 1 : 0;
  const entry: Ledger = {
    month: Math.floor(s.tick / 24),
    incomeR: Math.round(incomeR),
    incomeC: Math.round(incomeC),
    incomeI: Math.round(incomeI),
    expenses: expenses.map(Math.round),
    loanCost: Math.round(loanCost),
    net: Math.round(net),
  };
  s.ledger.unshift(entry);
  if (s.ledger.length > 12) s.ledger.length = 12;
  s.changed |= CHANGE.HUD;
  return entry;
}

export { plopDef };
