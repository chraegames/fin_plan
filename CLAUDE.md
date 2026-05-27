# Repo guide

A browser-only retirement / FIRE planning SPA. React 19 + Vite 8 + TypeScript 5.9, no backend, no env vars (except optional Umami analytics in production). All state lives in `localStorage`; the entire engine runs client-side.

User-facing: `README.md`. Deploy ops: `DEPLOY.md`. This file is for developers + future Claude sessions and captures the architecture, contracts, and gotchas that aren't obvious from skimming the tree.

---

## Big picture

```
src/
  main.tsx                # boots StrictMode + analytics, mounts <App />
  App.tsx                 # state owner; computes routing; passes handlers down
  engine/                 # pure simulation (no React, no DOM)
  utils/                  # persistence, formatting, analytics, env detection
  hooks/                  # useTheme, useIsMobile, useFocusTrap
  models/types.ts         # the data model — everything else types against this
  components/
    layout/               # AppBar, ScenarioTabs, Page, NameForm, Logo, SectionHead
    primitives/           # Button, Icon, Input variants, Popover (used everywhere)
    storyline/            # screen-level components and modals
      Intro / Welcome / PartialPlan / PlanForecast / HistoryPage
      AboutModal / ExportModal / ImportModal / ConfirmDialog
      cards/ charts/ drawers/ sections/
  styles/
    tokens.css            # design tokens via CSS custom properties (light + dark)
    base.css              # element resets, fonts, theme-bound declarations
```

Recharts is the only runtime UI dep (used by `storyline/charts/*`). Three Fontsource families are bundled (space-grotesk display, dm-sans body, jetbrains-mono numerics). No CSS framework, no UI kit, no router. There is no React Router — routing is just `useState` enums in `App.tsx`.

---

## Data model — `src/models/types.ts`

Three nested layers persist to one localStorage key:

```
ProfilesState
  profiles: Profile[]                       # multiple personal profiles (e.g. "Me", "Spouse")
  activeProfileId: string
Profile
  plans: Scenario[]                         # scenarios within a profile
  activePlanId: string
  id, name
Scenario  (a.k.a. "plan" in code; "scenario" in UI copy)
  input: PlanInput                          # the user's assumptions
  actuals: ActualsData                      # year-by-year overrides
  touched?: boolean                         # drives the Welcome→Partial→Forecast screen ladder
  id, name
```

The `touched` flag is the single most important state bit in the app — see [Routing](#routing-the-touched-contract).

---

## Engine — `src/engine/`

Pure functions. No React imports. Reused by both the live UI (`runSimulation` on every input change) and the auto-balance optimizer.

| Module | Role |
|---|---|
| `simulation.ts` | The forward simulator. Iterates years, applies income/expenses/inflation/withdrawals/tax, returns a `SimulationResult` (one row per year). Honors `actuals` overrides — actual values fully replace projected values for the same year. |
| `tax.ts` | `calculateIncomeTax(grossTaxable)` and `calculateCapitalGainsTax(gains, ordinaryIncome)` — bracket-by-bracket. **Brackets are 2026 Married Filing Jointly, illustrative only.** See [Tax model caveats](#tax-model-caveats). |
| `constants.ts` | Bracket data + `EARLY_WITHDRAWAL_PENALTY_AGE = 60`. The 59½ IRS rule is approximated as "the calendar year you turn 60" because we don't capture birth month. |
| `resolve.ts` | `resolveAmount(periods, year)` — sums all periods that overlap the year (intentional double-count for overlapping periods). `resolveIncomeAndExpenses(input, year, actuals?)` aggregates income/expense lines for a single year, applying inflation to expenses with `applyInflation !== false`, and respecting monthly actuals (keyed `year*100 + month`). |
| `autoBalance.ts` | The withdrawal-schedule optimizer. Forward-greedy with proportional drawdown across brokerage/Roth/IRA. Binary-search shrinks `targetCash` if user's target is unsustainable. **Used to be an LP; isn't anymore** — `javascript-lp-solver` returned blatantly suboptimal solutions on long horizons (header comment explains). |
| `defaults.ts` | `buildDefaultInput()` (seed plan), `defaultActuals` (empty), `generateId()` (UUID-with-fallback). |
| `presets.ts` | The three Welcome-screen sample lives (Coast FIRE / Mid-career / Approaching retirement). |

The engine is the only place numbers come from. UI components never compute simulated values themselves — they read from `SimulationResult` or render the input.

---

## Routing — the `touched` contract

`App.tsx` derives the current screen with **two** layers:

```ts
if (!seenIntro)          → <Intro />                  // first-visit gate
                            // (nothing else renders below; AppBar is minimized)

route === 'history'      → <HistoryPage />            // sticky side-route, AppBar Back button

else, based on activePlan:
  !activePlan.touched                → <Welcome />
  touched && expenses.length === 0   → <PartialPlan />
  touched && expenses.length > 0     → <PlanForecast />
```

**Key invariant: Welcome only renders on an untouched active plan.** Welcome's preset/build buttons (`handleLoadPreset`, `handleBuild`, `handleSkipToAdvanced` in `App.tsx`) mutate the active plan in place — they're safe only because the plan they overwrite by contract has only default seed data. If a regression ever showed Welcome on a touched plan, that contract would be broken and the in-place mutation would become silent data loss. The single-source-of-truth check is the `screen` derivation; no other code re-derives it.

**`touched` gets set to true** by every input edit, preset load, scenario creation via "+ New" tab, and the `Skip to advanced` button. **It's set false** only by `freshStart()` (first visit) and `deletePlan`'s last-plan rebuild (deleting the only scenario in a profile re-creates an untouched Default).

`migratePlans` always backfills `touched: true` when missing — imported plans without the flag are treated as touched (don't bounce to Welcome).

---

## Persistence — `src/utils/persistence.ts`

### localStorage keys

| Key | Owner | Purpose |
|---|---|---|
| `financial-planner-profiles` | `PROFILES_KEY` | Current `ProfilesState` blob (the only "data" key) |
| `firePlannerIntroSeen` | `INTRO_SEEN_KEY` | `'1'` once the user dismisses the Intro |
| `firePlannerTheme` | `THEME_KEY` (in `useTheme.ts`) | `'light'` or `'dark'` |
| `financial-planner-scenarios` | legacy | Pre-profiles "single profile, many scenarios" shape |
| `financial-planner-input` | legacy | Pre-scenarios "one plan" shape |
| `financial-planner-plans` | legacy | Withdrawal schedules from the pre-scenarios shape |

`loadProfiles()` reads modern → falls back through each legacy shape → ultimately returns `freshStart()`. Legacy keys are deleted after a successful migration.

`migratePlans(plans)` is **idempotent** and **mutates in place**. Tests pin this. It backfills missing fields, renames `brokerageReturnRate` → `returnRate`, splits the legacy `retirementBalance` 50/50 into `rothBalance`/`iraBalance`, renames `accountType: 'retirement'` → `'ira'`, ensures every account type has a withdrawal schedule, re-buckets old per-schedule-ID withdrawal actuals into per-account-type buckets, and stamps `touched: true` when absent.

### Writing state

Every write goes through `safeSetItem(key, value)` (`persistence.ts`). It catches the localStorage quota / permission errors and returns `false` so the caller can degrade. `App.tsx`'s `setProfilesState` increments `saveErrorVersion` on failure; the toast at the top of the page shows whenever `saveErrorVersion > dismissedErrorVersion` (so each new failure re-shows after dismissal).

### `loadIntroSeen()` grandfathering

Returns `true` (skip Intro) when:
1. The seen flag is already in localStorage, OR
2. Any profile has any scenario with `touched === true`, OR
3. Any of the three legacy storage keys are present.

Result: only genuinely new visitors see the Intro. Audited returning users never get it.

---

## Tax model caveats

Documented in About modal, README, `engine/constants.ts`, and inside `engine/tax.ts` header comments. Summary:

- **2026 MFJ only.** Std deduction $32,200; brackets from IRS Rev. Proc. 2025-32. Single / HoH / MFS not supported — there's a `TODO(filing-status)` marker near the constants.
- **"Age 60" semantics for the 59½ rule.** We have birth *year* but not birth *month*. `earlyWithdrawalCutoff = birthYear + 60` is exact for December-born users and ~6 months conservative for January-born ones.
- **Not modeled at all:** state/local tax, Social Security, pensions, RMDs, NIIT, Medicare IRMAA, the Roth 5-year rule, Roth conversions, return variability, sequence-of-returns risk, inflation on income.

If you change the brackets, also update: README "What it models" section, About modal "What it models" / "What it skips" blocks, the noscript block in `index.html`, the OG/meta/JSON-LD descriptions (they all carry "2026 MFJ" framing), and re-run `tax.test.ts` against the new boundaries.

---

## Dev affordances (localhost only)

`AppBar.tsx` shows three things when `isLocalHost()` returns true (`hostname === localhost | 127.0.0.1 | ''`):

1. An orange app-bar background + black `LOCAL` chip so it's obvious you're not on production.
2. `↻ Intro` button — clears `INTRO_SEEN_KEY` and flips state. **Non-destructive.** Plan data untouched.
3. `↻ Welcome` button — sets `seenIntro = true`, then finds-or-creates an untouched "Default" scenario in the active profile and switches to it. **Non-destructive.** Other profiles/scenarios preserved. (It used to call `freshStart()` and wiped everything — that bug is fixed; don't reintroduce.)

All three render only when `local && !isMobile`. Handlers are passed unconditionally from `App.tsx` (the props are optional on `AppBar`); UI gating happens entirely in `AppBar.tsx`.

---

## UI conventions

- **Inline styles + CSS variables.** No CSS modules, no Tailwind, no styled-components. Style objects are passed to JSX `style={}` and reference tokens from `styles/tokens.css`. The tokens cover colors (light + dark), shadows, radii, and font families.
- **Primitives over re-rolling.** `Button`, `Icon`, `Input` (and `MoneyInput` / `PercentInput` / `YearInput`), `Popover`, and `EditDrawer` are the building blocks. New screens should compose these rather than introducing parallel primitives.
- **Numeric inputs use a focus-buffered pattern** (see comment block at the top of `Input.tsx`). While focused: show raw typed text, allow mid-edit invalid states. On blur: clamp + canonicalize. The pattern matters — if you bypass it (e.g., always-controlled value with `Math.max`), backspace stops working.
- **Modals use the focus-trap hook.** `useFocusTrap(active, ref)` (`hooks/useFocusTrap.ts`) handles tab trapping, body scroll lock, and focus restoration on close. All five modal-likes use it: AboutModal, ExportModal, ImportModal, EditDrawer, ConfirmDialog.
- **Drawers vs modals:** edit flows use `EditDrawer` (side panel on desktop, bottom sheet on mobile, mounted by `DrawerHost.tsx`). One-shot confirmations and content-only screens use the modal pattern.
- **Mobile breakpoint:** `useIsMobile()` (default ≤ 720px). Most layout decisions branch on this — see `HistoryPage`, `YearByYear`, `AppBar`, `PlanForecast`.

---

## Coding rules the linter enforces

The ESLint config uses the strict `react-hooks/*` ruleset. Two rules bite often:

- **`react-hooks/rules-of-hooks`** — no early returns *before* the hook calls in a component. If you want to short-circuit on a derived state (e.g., empty profiles), you have to do it in the JSX, not by returning early at the top of the function. Lost two hours to this once already; the existing pattern of "render conditionally inside the return" is the canonical fix.
- **`react-hooks/set-state-in-effect`** — don't call `setX` synchronously inside a `useEffect`. Move the work into the event handler that triggered the change, or compute the value as derived state via `useMemo`. The mobile YearByYear right-fade hook had to be restructured to satisfy this.

Also worth knowing:
- The repo runs `tsc -b && vite build` (strict mode), so missing nullability and unused variables fail the build.
- ESLint runs separately via `npm run lint`. Pre-push: `npm run lint && npm test && npm run build` (per `~/.claude` auto-memory).

---

## Testing — `vitest`

Engine + utility coverage, no DOM tests. Run with `npm test` (one-shot) or `npm run test:watch`.

| File | What it covers |
|---|---|
| `engine/simulation.test.ts` | Cutoff scaling by birth year, brokerage basis/cap, withdrawal proportional split |
| `engine/tax.test.ts` | Income + LTCG brackets, pinned to 2026 MFJ values; spelled out at top so a future bracket change fails loudly |
| `engine/autoBalance.test.ts` | Cash floor under various retirement shapes; the latest case covers `targetCash < CASH_FLOOR` (no NaN / infinite loop) |
| `engine/resolve.test.ts` | `resolveAmount` overlap semantics, monthly actuals fill-in, inflation behavior |
| `utils/persistence.test.ts` | Every legacy migration shape, `cleanActuals` clipping logic (uses `vi.useFakeTimers()` to pin `Date.now()`) |
| `utils/format.test.ts` | `formatDollars` + `formatDollarsCompact` boundaries; the `999_500 → "$1.0M"` and negative-sign-placement fixes are pinned here |
| `utils/dedupeName.test.ts` | Smallest-gap insertion, case/whitespace sensitivity, Set vs array input |

75 tests as of the latest commit. New engine/util modules should ship with a test file.

---

## Analytics

`utils/analytics.ts` injects Umami via `VITE_UMAMI_HOST` + `VITE_UMAMI_WEBSITE_ID` env vars (set in `.env.production`). Disabled automatically on localhost and when env vars are missing — `npm run dev` never touches the production Umami. Event names used today:

```
drawer_opened, plan_created, profile_created, auto_balance_run,
preset_loaded, plan_built, skip_to_advanced, export_downloaded,
import_applied, history_opened, theme_toggled,
intro_shown, intro_dismissed
```

`track()` swallows all errors — analytics must never break the app.

---

## SEO surface — `index.html`

Two parallel "what is this app" surfaces exist by design:

1. **The Intro component** — first-visit UX for JS users.
2. **The `<noscript>` block** — what crawlers, link unfurlers (Slack/Discord/Twitter/Bing), and JS-disabled visitors see.

They share brand voice and structure but should not be merged: the Intro's "What this is" panel is collapsed by default, so crawlers wouldn't see its substance; link unfurlers don't run JS at all. The noscript intentionally flattens the same three sections.

Two JSON-LD blocks: `WebApplication` (current pricing + category) and `FAQPage` (three Q&As mirroring the Intro panel — eligible for Google FAQ rich snippets).

If you change the Intro's copy, also update the noscript and the meta/OG/Twitter/JSON-LD descriptions so the brand voice stays consistent across all four surfaces.

---

## Gotchas + things to avoid

- **Don't add `setProfilesState(freshStart())` anywhere new.** It nukes every profile and every scenario. The current callers are `deleteProfile` (last profile, gated by confirm dialog) and nothing else. The dev `↻ Welcome` button used to do this; it doesn't anymore.
- **Don't call setState in a render function on a path that always runs.** It triggers an infinite loop and React eats the error. (Conditional state-sync — `if (prop !== last) { setLast(prop); ... }` — is fine, see `HistoryPage` `CellInput`.)
- **Don't bypass `safeSetItem`.** Direct `localStorage.setItem` skips the quota toast path and crashes the app in Safari private mode / quota-exceeded scenarios.
- **Don't mutate `ProfilesState` from inside `runSimulation` or any engine function.** The engine is pure; the UI hook (`useMemo`) assumes inputs don't change as a side effect.
- **Don't conditionally render hooks.** See [Coding rules](#coding-rules-the-linter-enforces).
- **Don't introduce a router.** The two-axis routing (intro/seen + screen derivation) covers everything; adding React Router would be a regression.
- **Don't drop the noscript block** even though it's "duplicate content." See [SEO surface](#seo-surface--indexhtml).

---

## Where to look first when…

- **Adding a new input field**: model in `types.ts`, default in `defaults.ts`, simulator change in `simulation.ts` + test, UI in the relevant drawer + a `SummaryCard` row.
- **Tweaking the chart**: `components/storyline/charts/`.
- **Changing what counts as "touched"**: `App.tsx` `screen` derivation and every handler that sets `touched: true` — search for `touched: true`.
- **Adding a localStorage key**: declare it in `persistence.ts`, plumb load via a `loadX()` helper, write via `safeSetItem`, add tests.
- **Refreshing brand copy**: change `Intro.tsx` + `index.html` (noscript + meta + OG + Twitter + JSON-LD) + `AboutModal.tsx` + `README.md` in lockstep.
