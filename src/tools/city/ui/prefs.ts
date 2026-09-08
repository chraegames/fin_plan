// View preferences kept per browser (day/night, problem icons, checklist).

import { CITY_PREFS_KEY, safeSetItem } from '../../../utils/persistence';

export interface CityPrefs {
  dayCycle: boolean;
  markers: boolean;
  /** Seed of the city whose getting-started checklist was dismissed (or -1). */
  onboardingDoneSeed: number;
}

export const DEFAULT_PREFS: CityPrefs = { dayCycle: true, markers: true, onboardingDoneSeed: -1 };

export function loadPrefs(): CityPrefs {
  try {
    const raw = localStorage.getItem(CITY_PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const o = JSON.parse(raw) as Partial<CityPrefs>;
    return {
      dayCycle: typeof o.dayCycle === 'boolean' ? o.dayCycle : DEFAULT_PREFS.dayCycle,
      markers: typeof o.markers === 'boolean' ? o.markers : DEFAULT_PREFS.markers,
      onboardingDoneSeed: typeof o.onboardingDoneSeed === 'number' ? o.onboardingDoneSeed : -1,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: CityPrefs): void {
  safeSetItem(CITY_PREFS_KEY, JSON.stringify(p));
}
