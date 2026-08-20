import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { livePages } from '../src/site/manifest';

// The Vite input map is generated from the manifest, so a live entry without a
// matching index.html would only fail at build time. Catch it in tests instead.
describe('live pages have an html entry on disk', () => {
  for (const p of livePages()) {
    it(p.path, () => {
      expect(existsSync(resolve(__dirname, '..', p.path.slice(1), 'index.html'))).toBe(true);
    });
  }
});
