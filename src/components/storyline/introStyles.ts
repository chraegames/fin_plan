// Class rules for the FIRE Planner landing surface (hero, projection panel,
// "What this is" panels). Injected as a <style> string by both the prerendered
// <IntroContent/> and the live <Intro/>, so it lives in a .ts (tsx files export
// components only). Namespaced `fire-intro-*`.

export const INTRO_STYLES = `
.fire-intro{max-width:1240px;margin:0 auto;padding:0 var(--page-pad-x);display:flex;flex-direction:column}
.fire-intro a:hover{color:var(--accent)}
.fire-intro-top{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px 0;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:12px;color:var(--ink-3)}
.fire-intro-crumb{display:flex;align-items:center;gap:10px}
.fire-intro-crumb a{color:var(--ink-3)}
.fire-intro-crumb i{font-style:normal;color:var(--ink-slash)}
.fire-intro-crumb b{font-weight:400;color:var(--ink)}
.fire-intro-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:var(--radius-pill);background:var(--accent-tint);color:var(--accent);font-family:var(--font-mono);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap}
.fire-intro-pill i{width:6px;height:6px;border-radius:50%;background:var(--accent);display:block}
.fire-intro-hero{padding:64px 0 52px;display:grid;grid-template-columns:1.3fr 1fr;gap:56px;align-items:center;border-bottom:1px solid var(--border);background-image:radial-gradient(circle at 78% 20%,var(--accent-tint) 0,transparent 44%)}
.fire-intro-eyebrow{font-family:var(--font-mono);font-size:11.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent);margin-bottom:22px}
.fire-intro-h1{font-family:var(--font-serif);font-size:clamp(40px,4.8vw,72px);line-height:1;letter-spacing:-0.03em;font-weight:400;margin:0 0 20px;color:var(--ink);text-wrap:pretty}
.fire-intro-h1 em{font-style:italic;color:var(--accent)}
.fire-intro-lead{font-size:18px;line-height:1.5;color:var(--ink-2);margin:0;max-width:40ch}
.fire-intro-cta{margin-top:28px;display:flex}
.fire-intro-panel{border:1px solid var(--border-strong);border-radius:var(--radius-md);background:var(--surface);padding:24px;display:flex;flex-direction:column;gap:16px}
.fire-intro-caption{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-mono);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-muted)}
.fire-intro-bars{height:132px;display:flex;align-items:flex-end;gap:5px}
.fire-intro-bars i{flex:1;border-radius:2px;display:block;background:var(--accent)}
.fire-intro-bars i.drawdown{background:var(--cat-games)}
.fire-intro-rule{height:1px;background:var(--border-strong)}
.fire-intro-legend{display:flex;gap:20px;font-family:var(--font-mono);font-size:11px;color:var(--ink-3)}
.fire-intro-legend span{display:flex;align-items:center;gap:7px}
.fire-intro-legend i{width:9px;height:9px;border-radius:2px;display:block;background:var(--accent)}
.fire-intro-legend i.drawdown{background:var(--cat-games)}
.fire-intro-what{padding:48px 0}
.fire-intro-sec-head{display:flex;align-items:baseline;gap:14px;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:18px}
.fire-intro-sec-head h2{font-family:var(--font-mono);font-size:12.5px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;margin:0;color:var(--ink-3)}
.fire-intro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.fire-intro-card{background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius-md);padding:24px}
.fire-intro-card h3{font-size:18px;font-weight:600;margin:0 0 10px;color:var(--accent)}
.fire-intro-card p{margin:0;font-size:14.5px;line-height:1.6;color:var(--ink-2)}
.fire-intro-disclaimer{margin:26px 0 0;font-family:var(--font-mono);font-size:11.5px;color:var(--ink-muted)}
.fire-intro-disclaimer a{color:var(--ink-2);text-decoration:underline;text-underline-offset:3px}
@media (max-width:1100px){
  .fire-intro-hero{grid-template-columns:1fr;gap:36px;padding:48px 0 40px;align-items:start}
}
@media (max-width:720px){
  .fire-intro-top{flex-wrap:wrap;gap:10px}
  .fire-intro-hero{padding:36px 0 32px}
  .fire-intro-grid{grid-template-columns:1fr}
  .fire-intro-what{padding:36px 0}
}
`;
