// Magic Tower validation CLI.
//   npx tsx scripts/mt-validate.ts --seeds 20 --loops 1-10
// Generates towers, validates each one (structure, ledger replay through the
// game reducer, naive policies, templates) and prints a distribution report.

import { START_HERO } from '../src/tools/magic-tower/curves';
import { generateTower, genDebug } from '../src/tools/magic-tower/floorgen';
import { POLICIES } from '../src/tools/magic-tower/policies';
import { solveZone } from '../src/tools/magic-tower/solver';
import { validateTower } from '../src/tools/magic-tower/validate';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const seeds = Number(arg('seeds', '10'));
const [lo, hi] = arg('loops', '1-10').split('-').map(Number);
const seedBase = Number(arg('seed', '1000'));

const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

let failures = 0;
for (let loop = lo; loop <= (hi ?? lo); loop++) {
  const slack: number[][] = [[], [], []];
  const policyFail: number[] = [];
  const collectAllFail: number[] = [];
  const tplCount: number[] = [];
  const genMs: number[] = [];
  const rerolls: number[] = [];
  const problems: string[] = [];
  let towers = 0;
  for (let k = 0; k < seeds; k++) {
    const seed = seedBase + k;
    genDebug.reasons.length = 0;
    const t0 = performance.now();
    let tower;
    try {
      tower = generateTower(seed, loop);
    } catch (e) {
      problems.push(`seed ${seed}: generation failed: ${String(e)}`);
      failures++;
      continue;
    }
    genMs.push(performance.now() - t0);
    rerolls.push(genDebug.reasons.length);
    towers++;
    const rep = validateTower(tower);
    if (!rep.ok) {
      failures++;
      problems.push(`seed ${seed}: structural ${rep.structural.slice(0, 3).join(' | ') || 'ok'}; replay ${rep.zones.find(z => !z.replayOk)?.replayError ?? 'ok'}`);
    }
    let hero = START_HERO;
    for (const z of rep.zones) {
      const band = z.zone <= 2 ? 0 : z.zone <= 5 ? 1 : 2;
      slack[band].push(z.lineSlack);
      policyFail.push(z.policiesFailed);
      collectAllFail.push(z.policies.collectAll === false ? 1 : 0);
      tplCount.push(z.templates.length);
      void hero;
      hero = z.heroOut;
    }
    void solveZone;
  }
  console.log(`\nLoop ${loop}: ${towers}/${seeds} towers generated, ${problems.length} problems`);
  console.log(`  generation ms: median ${pct(genMs, 0.5).toFixed(0)}, p90 ${pct(genMs, 0.9).toFixed(0)}; rerolls median ${pct(rerolls, 0.5)}`);
  console.log(`  line slack — zones 1–3: median ${pct(slack[0], 0.5).toFixed(2)} min ${pct(slack[0], 0).toFixed(2)} | 4–6: ${pct(slack[1], 0.5).toFixed(2)} / ${pct(slack[1], 0).toFixed(2)} | 7–9: ${pct(slack[2], 0.5).toFixed(2)} / ${pct(slack[2], 0).toFixed(2)}`);
  console.log(`  naive policies failing per zone: median ${pct(policyFail, 0.5)} of ${POLICIES.length}; zones where collectAll fails: ${(100 * collectAllFail.reduce((a, b) => a + b, 0) / Math.max(1, collectAllFail.length)).toFixed(0)}%`);
  console.log(`  puzzle templates per zone: median ${pct(tplCount, 0.5)}, min ${pct(tplCount, 0)}`);
  for (const p of problems.slice(0, 10)) console.log(`  ! ${p}`);
}
console.log(failures ? `\n${failures} tower(s) failed validation` : '\nAll towers validated');
process.exit(failures ? 1 : 0);
