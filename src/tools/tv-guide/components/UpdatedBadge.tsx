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
    <a href={`${GUIDE_HOME}#changelog`} className="tvg-updated" title="See what changed">
      <i aria-hidden="true" />
      <span>
        Updated for {GUIDE_YEAR} · reviewed <time dateTime={GUIDE_REVIEWED}>{longDate(GUIDE_REVIEWED)}</time>
      </span>
    </a>
  );
}
