// Colours for the 3D scene. Everything is generated — these are the only
// "assets". Values are linear-ish sRGB hex; three converts on upload.

export interface ScenePalette {
  background: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  sunIntensity: number;
  hemiIntensity: number;
  water: number;
  waterOpacity: number;
  grid: number;
  skyTop: number;
  skyHorizon: number;
  /** Multiplier on terrain / road colours (they are unlit). */
  groundTint: number;
}

export const LIGHT_PALETTE: ScenePalette = {
  background: 0xdfe6ec,
  fog: 0xdfe6ec,
  fogNear: 120,
  fogFar: 420,
  hemiSky: 0xcfe3ff,
  hemiGround: 0x8a7a5a,
  sun: 0xfff2dc,
  sunIntensity: 2.6,
  hemiIntensity: 1.5,
  water: 0x3f93c9,
  waterOpacity: 0.72,
  grid: 0x000000,
  skyTop: 0x4f9be0,
  skyHorizon: 0xdfe9f0,
  groundTint: 1,
};

export const DARK_PALETTE: ScenePalette = {
  background: 0x0f1216,
  fog: 0x0f1216,
  fogNear: 100,
  fogFar: 380,
  hemiSky: 0x5a6f96,
  hemiGround: 0x2a241c,
  sun: 0xd9e2ff,
  sunIntensity: 1.7,
  hemiIntensity: 1.1,
  water: 0x1d4a6e,
  waterOpacity: 0.78,
  grid: 0x000000,
  skyTop: 0x0b1020,
  skyHorizon: 0x3a3f5c,
  groundTint: 0.5,
};

/** Terrain vertex colour by land height in world units (0 = shore) and slope (|normal.xz|). Returns [r,g,b] 0..1. */
export function terrainColor(landH: number, slope: number, noise: number, out: number[]): number[] {
  let r: number;
  let g: number;
  let b: number;
  if (landH < 0) {
    // sea bed
    r = 0.33;
    g = 0.40;
    b = 0.33;
  } else {
    // lush lowland green → drier, paler upland, with a sandy shore blended in
    const t = Math.min(1, Math.max(0, (landH - 0.1) / 6));
    r = 0.36 + t * 0.26;
    g = 0.60 - t * 0.12;
    b = 0.24 + t * 0.06;
    const sand = 1 - Math.min(1, Math.max(0, (landH - 0.05) / 0.25));
    r += (0.80 - r) * sand;
    g += (0.74 - g) * sand;
    b += (0.54 - b) * sand;
  }
  const rock = Math.min(1, Math.max(0, (slope - 0.32) / 0.25));
  r += (0.52 - r) * rock;
  g += (0.49 - g) * rock;
  b += (0.44 - b) * rock;
  const n = 1 + (noise - 0.5) * 0.16;
  out[0] = r * n;
  out[1] = g * n;
  out[2] = b * n;
  return out;
}
