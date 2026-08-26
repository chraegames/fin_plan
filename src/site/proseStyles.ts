// Style constants shared by the prose primitives (kept out of Prose.tsx so
// that file exports components only, per react-refresh/only-export-components).

import type { CSSProperties } from 'react';

export const linkStyle: CSSProperties = {
  color: 'var(--accent-ink)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};
