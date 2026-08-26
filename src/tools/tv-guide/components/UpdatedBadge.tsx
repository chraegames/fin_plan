// "Updated for 2026 · reviewed <date>" — pure; links to the changelog on the overview.

import { GUIDE_REVIEWED, GUIDE_YEAR } from '../data';
import { GUIDE_HOME } from '../pages';

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function UpdatedBadge() {
  return (
    <a
      href={`${GUIDE_HOME}#changelog`}
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: 'var(--ink-3)',
        textDecoration: 'none',
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border-soft)',
        background: 'var(--surface)',
      }}
      title="See what changed"
    >
      <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--positive)' }} aria-hidden="true" />
      <span>
        Updated for {GUIDE_YEAR} · reviewed <time dateTime={GUIDE_REVIEWED}>{longDate(GUIDE_REVIEWED)}</time>
      </span>
    </a>
  );
}
