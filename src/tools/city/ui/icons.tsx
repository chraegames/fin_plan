// Hand-drawn SVG glyphs for the game UI. Stroke-based, 24×24, currentColor,
// so they read at small sizes on coloured tiles. No icon font, no assets.

import type { CSSProperties } from 'react';

export type CityIconName =
  | 'house'
  | 'shop'
  | 'factory'
  | 'dezone'
  | 'road'
  | 'pylon'
  | 'coal'
  | 'gas'
  | 'wind'
  | 'solar'
  | 'pump'
  | 'tower'
  | 'firestation'
  | 'police'
  | 'clinic'
  | 'hospital'
  | 'school'
  | 'highschool'
  | 'university'
  | 'park'
  | 'parkL'
  | 'bulldoze'
  | 'flame'
  | 'inspect'
  | 'calendar'
  | 'coins'
  | 'people'
  | 'jobs'
  | 'pause'
  | 'play'
  | 'layers'
  | 'budget'
  | 'plus'
  | 'close'
  | 'bulb'
  | 'warning'
  | 'siren'
  | 'densityLow'
  | 'densityMed'
  | 'densityHigh'
  | 'paint'
  | 'check'
  | 'dice'
  | 'tornado'
  | 'quake';

const P: Record<CityIconName, string> = {
  house: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  shop: 'M4 9.5 5.5 5h13L20 9.5M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5.5 12v7.5h13V12M9 19.5v-4.5h6v4.5',
  factory: 'M3 20V9l5 3V9l5 3V9l5 3v8H3zM6 6V3h3v3M15 15h2M10 15h2M6 15h2',
  dezone: 'M4 20h16M6.5 15.5 12 10l4 4-4.5 4.5H8zM12 10l3-3 4 4-3 3',
  road: 'M4 20 9 4h6l5 16M12 6v3M12 11.5v3M12 17v3',
  pylon: 'M8 21 11 4h2l3 17M5 9h14M6.5 13h11M9.5 9l-1 4M14.5 9l1 4M4 3l2 2M20 3l-2 2',
  coal: 'M3 20V11l4-2v11M7 20V13l4-2v9M11 20v-8l4-2v10M15 20V9h4v11M3 20h18M9 4v3M13 5v2M17 3v4',
  gas: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-9z',
  wind: 'M12 21V11M12 11l-6-4M12 11l6-4M12 11v-8M9 21h6',
  solar: 'M4 10h16l2 8H2zM8 10l-1 8M16 10l1 8M3 14h18M12 3v2M7 4.5l1 1.5M17 4.5l-1 1.5',
  pump: 'M12 3c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 9.5 9 7 12 3zM4 20h16',
  tower: 'M7 4h10l-1 7H8zM8 11l-2 9M16 11l2 9M9 17h6M12 11v9',
  firestation: 'M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 .5 1.5 1.5 2.5 3 3 0-3 0-5 0-8zM5 21h14',
  police: 'M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6zM9.5 12l2 2 3.5-4',
  clinic: 'M12 5v14M5 12h14',
  hospital: 'M4 20V6h16v14M4 20h16M12 9v6M9 12h6M9 20v-3h6v3',
  school: 'M3 19h18M5 19v-8l7-4 7 4v8M12 19v-6M9 19v-4h6v4M12 3v4',
  highschool: 'M4 19h16M6 19V9h12v10M9 19v-4h6v4M8 12h2M14 12h2M12 3l-6 4h12z',
  university: 'M3 10 12 5l9 5-9 5zM6 12v5c2 2 10 2 12 0v-5M21 10v5',
  park: 'M12 21v-5M6 16h12l-3-4h1l-4-5-4 5h1zM8 16l-2-3',
  parkL: 'M8 21v-4M16 21v-4M4 17h8l-2-3h1l-3-4-3 4h1zM12 17h8l-2-3h1l-3-4-3 4h1z',
  bulldoze: 'M3 17h4l2-3h6v3h4M3 17l1 3h15l1-3M15 14V9l4 2v3M5 12l4-2M4 8l3 3',
  flame: 'M12 3c1 3 6 5 6 11a6 6 0 0 1-12 0c0-3 2-4 3-6 0 3 1 4 3 5 0-4 0-7 0-10z',
  inspect: 'M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM14.5 14.5 20 20',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  coins: 'M12 3a8 3 0 0 0 0 6 8 3 0 0 0 0-6zM4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 10v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4M4 14v3c0 1.7 3.6 3 8 3s8-1.3 8-3v-3',
  people: 'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3 2.5-5 6-5s6 2 6 5M16 11a3 3 0 1 0 0-6M21 19c0-2.5-1.5-4-4-4.5',
  jobs: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16M12 12v3',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 4l12 8-12 8z',
  layers: 'M12 4 3 9l9 5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  budget: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.5.5 1 1.5 1 2.5h6c0-1 .5-2 1-2.5A6 6 0 0 0 12 3z',
  warning: 'M12 3 2 21h20zM12 9v5M12 17v1',
  siren: 'M7 20v-7a5 5 0 0 1 10 0v7M4 20h16M12 4v2M5 7l1.5 1.5M19 7l-1.5 1.5M9 20v-6M15 20v-6',
  densityLow: 'M4 20V13h5v7M15 20v-5h5v5M4 20h16',
  densityMed: 'M4 20V10h5v10M11 20V7h5v13M18 20v-6h2v6M4 20h16',
  densityHigh: 'M4 20V9h4v11M10 20V3h5v17M17 20V7h3v13M4 20h16',
  paint: 'M4 20c2-4 2-6 5-6s3 2 3 4c0 1-1 2-3 2zM10 14l8-8 2 2-8 8',
  check: 'M5 12l4 4 10-10',
  dice: 'M5 5h14v14H5zM9 9h.5M15 9h.5M12 12h.5M9 15h.5M15 15h.5',
  tornado: 'M4 6h16M6 10h12M8 14h8M10 18h4M12 21v1',
  quake: 'M3 12h4l2-6 3 12 3-9 2 5h4',
};

interface CityIconProps {
  name: CityIconName;
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export function CityIcon({ name, size = 22, style, className }: CityIconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}>
      <path d={P[name]} />
    </svg>
  );
}
