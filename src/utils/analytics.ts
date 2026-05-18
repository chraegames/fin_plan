declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function track(name: string, data?: Record<string, unknown>): void {
  try {
    window.umami?.track(name, data);
  } catch {
    // Ignore — analytics must never break the app.
  }
}
