// Shared marketing copy for the FIRE Planner landing surface.
//
// This is the SINGLE SOURCE for the home-page hero + "what this is" copy. It
// feeds three places:
//   1. The interactive <Intro> screen (composes the pieces below + a CTA and a
//      collapsible accordion around <IntroSections>).
//   2. The build-time prerendered HTML injected into #root (scripts/prerender.tsx
//      renders <IntroContent/> to a static string so crawlers / no-JS visitors
//      get real content on the first byte).
//
// Everything here is PURE: no hooks, no analytics, no browser APIs — so it can be
// rendered to a string in the Vite build (Node) context. Keep it that way.

const sectionBody: React.CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  color: 'var(--ink-2)',
  lineHeight: 1.6,
};

export function IntroHeader() {
  return (
    <header style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--accent-ink)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        FIRE Planner
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 'clamp(34px, 7.5vw, 64px)',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: 'var(--ink)',
          margin: 0,
          maxWidth: 720,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Plan your retirement,{' '}
        <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>in your browser.</em>
      </h1>
      <p
        style={{
          fontSize: 'clamp(14px, 2.5vw, 17px)',
          color: 'var(--ink-3)',
          lineHeight: 1.55,
          margin: '20px auto 0',
          maxWidth: 560,
        }}
      >
        Free, private, browser-only. No signup, no server — your data never leaves
        this device.
      </p>
    </header>
  );
}

// The three "what this is" paragraphs. Rendered inline (always visible) on the
// prerendered home page, and inside the collapsible accordion in <Intro>.
export function IntroSections() {
  return (
    <>
      <p style={sectionBody}>
        <strong style={{ color: 'var(--ink)' }}>What you can do.</strong>{' '}
        Project income, expenses, investment growth, illustrative federal taxes, and
        withdrawals across a configurable horizon. Compare scenarios side-by-side,
        record actuals year by year as life happens, and let an optimizer pick a
        tax-efficient withdrawal schedule.
      </p>
      <p style={sectionBody}>
        <strong style={{ color: 'var(--ink)' }}>How it works.</strong>{' '}
        Everything runs in your browser — the simulation, the optimizer, the
        charts. There is no server-side computation. Plans persist in this browser's
        localStorage so they're here when you come back.
      </p>
      <p style={sectionBody}>
        <strong style={{ color: 'var(--ink)' }}>Your data.</strong>{' '}
        No account, no server, no tracking of personal information. Export and import
        plans as JSON files you control. Clearing your browser data erases everything
        — nothing is kept anywhere else.
      </p>
    </>
  );
}

export function IntroDisclaimer() {
  return (
    <p
      style={{
        textAlign: 'center',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--ink-muted)',
        margin: 0,
      }}
    >
      Educational tool — not financial advice.
    </p>
  );
}

// The static, fully-expanded landing view used for build-time prerendering.
// Unlike <Intro>, the "what this is" sections are always visible here so crawlers
// and no-JS visitors see the substance (the live Intro keeps them in a collapsed
// accordion by default). On mount, App's createRoot render replaces this markup.
export function IntroContent() {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: 'var(--page-pad-top) var(--page-pad-x) var(--page-pad-bot)',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        paddingTop: 'clamp(48px, 10vw, 96px)',
      }}
    >
      <IntroHeader />
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-card)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          What this is
        </h2>
        <IntroSections />
      </section>
      <IntroDisclaimer />
    </div>
  );
}
