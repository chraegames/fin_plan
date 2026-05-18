declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, unknown>) => void;
    };
  }
}

const HOST = import.meta.env.VITE_UMAMI_HOST as string | undefined;
const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;

// Disabled on localhost, file://, and when the env vars aren't configured —
// so `npm run dev` and `vite preview` never touch the production Umami.
function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!HOST || !WEBSITE_ID) return false;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '') return false;
  return true;
}

export function initAnalytics(): void {
  if (!isEnabled()) return;
  if (document.querySelector('script[data-umami-injected]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = `https://${HOST}/script.js`;
  s.setAttribute('data-website-id', WEBSITE_ID!);
  s.setAttribute('data-umami-injected', '');
  document.head.appendChild(s);
}

export function track(name: string, data?: Record<string, unknown>): void {
  if (!isEnabled()) return;
  try {
    window.umami?.track(name, data);
  } catch {
    // Ignore — analytics must never break the app.
  }
}
