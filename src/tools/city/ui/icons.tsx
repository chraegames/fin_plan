// Hand-drawn SVG glyphs for the game UI. Stroke-based, 24×24, currentColor,
// so they read at small sizes on coloured tiles. No icon font, no assets.

import type { CSSProperties } from 'react';

export type CityIconName =
  | 'house'
  | 'shop'
  | 'factory'
  | 'dezone'
  | 'road'
  | 'avenue'
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
  | 'quake'
  | 'pipe'
  | 'nuclear'
  | 'hydro'
  | 'treatment'
  | 'landfill'
  | 'incinerator'
  | 'recycling'
  | 'bus'
  | 'fireHq'
  | 'policeHq'
  | 'library'
  | 'cityHall'
  | 'stadium'
  | 'landmark'
  | 'plaza'
  | 'lock'
  | 'flag'
  | 'chart'
  | 'gear'
  | 'sun'
  | 'moon'
  | 'bin'
  | 'info'
  | 'eye'
  | 'target'
  | 'arrow'
  | 'smile'
  | 'policy';

const P: Record<CityIconName, string> = {
  house: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  shop: 'M4 9.5 5.5 5h13L20 9.5M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5.5 12v7.5h13V12M9 19.5v-4.5h6v4.5',
  factory: 'M3 20V9l5 3V9l5 3V9l5 3v8H3zM6 6V3h3v3M15 15h2M10 15h2M6 15h2',
  dezone: 'M4 20h16M6.5 15.5 12 10l4 4-4.5 4.5H8zM12 10l3-3 4 4-3 3',
  road: 'M4 20 9 4h6l5 16M12 6v3M12 11.5v3M12 17v3',
  avenue: 'M3 20 8 4h8l5 16M10.5 5v15M13.5 5v15',
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
  pipe: 'M3 9h6v6H3zM9 12h6M15 9h6v6h-6zM6 9V4M18 15v5',
  nuclear: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 3a9 9 0 0 1 7.8 4.5l-4.3 2.5M4.2 7.5A9 9 0 0 1 12 3M4.2 7.5l4.3 2.5M12 21a9 9 0 0 1-7.8-4.5M12 21v-5M19.8 16.5A9 9 0 0 1 12 21',
  hydro: 'M3 20h18M4 20V9h16v11M8 9V5h8v4M7 14h2M11 14h2M15 14h2M3 6c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  treatment: 'M4 20h16M6 20v-6a6 6 0 0 1 12 0v6M6 14h12M12 3v5M9 5l3 3 3-3',
  landfill: 'M3 20h18M5 20c1-5 3-8 6-8s5 3 6 8M13 12c1-3 3-4 5-4s3 2 3 5M8 12l1-4M15 9l1-2',
  incinerator: 'M4 20V10h10v10H4zM4 20h16M16 20V4h3v16M8 14c1-2 2-2 2-4 1 1 2 2 2 4a2 2 0 0 1-4 0z',
  recycling: 'M12 4l3 5h-6zM5.5 15.5 8 11l3 5M18.5 15.5 16 11l-3 5M8 20h8M6 16l2 4M18 16l-2 4',
  bus: 'M5 4h14v13H5zM5 9h14M5 17v3h3v-3M16 17v3h3v-3M8 13h.5M15.5 13h.5',
  fireHq: 'M4 20h16M6 20V9l6-5 6 5v11M12 11c1.5 2 3 3 3 5a3 3 0 0 1-6 0c0-1 .5-2 1.5-3 0 1 .5 1.5 1.5 2 0-2 0-3 0-4z',
  policeHq: 'M4 20h16M6 20V8h12v12M12 3 6 8h12zM10 20v-4h4v4M9 12h2M13 12h2',
  library: 'M3 20h18M5 20V8h14v12M4 8l8-4 8 4M7 8v12M11 8v12M15 8v12M19 8v12',
  cityHall: 'M3 20h18M5 20V10h14v10M4 10h16M12 3a4 4 0 0 1 4 4v3H8V7a4 4 0 0 1 4-4zM12 3v-1M8 20v-5h3v5M13 20v-5h3v5',
  stadium: 'M3 12a9 5 0 0 0 18 0 9 5 0 0 0-18 0zM3 12v3a9 5 0 0 0 18 0v-3M7 12a5 2.5 0 0 0 10 0 5 2.5 0 0 0-10 0',
  landmark: 'M12 2v3M9 20 11 5h2l2 15M6 20h12M7.5 14h9M8.5 10h7',
  plaza: 'M3 21h18M6 21v-3h12v3M12 5v13M9 8l3-3 3 3M6 12h12',
  lock: 'M6 11h12v9H6zM9 11V7a3 3 0 0 1 6 0v4M12 15v2',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  chart: 'M4 20h16M4 16l4-5 4 3 4-6 4 2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  bin: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2M9 9.5h.5M14.5 9.5h.5',
  policy: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6M9 8h2',
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
