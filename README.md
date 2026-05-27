# Financial Planner

A free, browser-only retirement and long-term financial projection tool. Model
income, expenses, investments, taxes, and withdrawals across a customizable
horizon. Everything runs locally; no account, no server, no tracking.

> Educational tool &mdash; not financial, tax, or legal advice.

## What it models

- US federal income tax — **illustrative 2026 Married Filing Jointly brackets only** (not a substitute for tax-prep software)
- Long-term capital gains (2026 MFJ thresholds)
- Brokerage, Roth IRA, and Traditional IRA accounts
- Configurable birth year for the 10% early-withdrawal penalty cutoff
- Brokerage cost basis (only the gain portion of a withdrawal is taxed)
- Inflation on selected expenses
- An LP-based optimizer that picks a tax-efficient withdrawal schedule
- Year-by-year "actuals" overrides that refine the projection

## What it does NOT model

Filing statuses other than MFJ (Single, HoH, MFS), state / local tax, Social
Security, pensions, RMDs, NIIT, Medicare IRMAA, the Roth 5-year rule, return
variability, or sequence-of-returns risk. See the in-app **About** dialog
for details.

## Local development

```bash
npm install
npm run dev      # local dev server (Vite)
npm test         # unit tests (Vitest)
npm run lint     # ESLint
npm run build    # type-check + production build → dist/
```

## Deploying

The build output (`dist/`) is a static site; any static-file host works.

### Cloudflare Pages

1. Push the repo to GitHub.
2. In the Cloudflare dashboard: **Pages → Create application → Connect to Git**.
3. Build settings: build command `npm run build`, output directory `dist`.
4. Save. Subsequent pushes to `main` auto-deploy.

### Netlify

1. **Add new site → Import an existing project → GitHub**.
2. Build command `npm run build`, publish directory `dist`.

### Vercel

1. **Add New → Project → Import** the GitHub repo.
2. Framework preset: **Vite**. Output directory: `dist`. Build command: `npm run build`.

No environment variables are required. The app is fully client-side &mdash; all
state lives in the visitor&apos;s browser `localStorage`.

## CI

`.github/workflows/ci.yml` runs lint + tests + build on every push and pull
request.

## License

This is a personal project; treat it as such. Use at your own risk.
