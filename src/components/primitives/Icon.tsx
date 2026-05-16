export type IconName =
  | 'plus'
  | 'download'
  | 'upload'
  | 'chevron'
  | 'caret'
  | 'grid'
  | 'edit'
  | 'arrow'
  | 'arrowDown'
  | 'arrowUp'
  | 'close'
  | 'warning'
  | 'check'
  | 'info'
  | 'sparkle'
  | 'spark'
  | 'dollar'
  | 'calendar'
  | 'bank'
  | 'flame'
  | 'trend-down'
  | 'trend-up'
  | 'sun'
  | 'moon';

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 14 }: IconProps) {
  const p = {
    stroke: 'currentColor',
    strokeWidth: 1.6,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const s = size;
  const box = '0 0 16 16';
  switch (name) {
    case 'plus':
      return <svg width={s} height={s} viewBox={box}><path d="M8 3v10M3 8h10" {...p} /></svg>;
    case 'download':
      return <svg width={s} height={s} viewBox={box}><path d="M8 2.5v8m0 0L4.5 7M8 10.5 11.5 7M3 13.5h10" {...p} /></svg>;
    case 'upload':
      return <svg width={s} height={s} viewBox={box}><path d="M8 13.5v-8m0 0L4.5 9M8 5.5 11.5 9M3 2.5h10" {...p} /></svg>;
    case 'chevron':
      return <svg width={s} height={s} viewBox={box}><path d="m4 6 4 4 4-4" {...p} /></svg>;
    case 'caret':
      return <svg width={s} height={s} viewBox={box}><path d="m6 4 4 4-4 4" {...p} /></svg>;
    case 'grid':
      return (
        <svg width={s} height={s} viewBox={box}>
          <rect x="2.5" y="2.5" width="4" height="4" rx="0.5" {...p} />
          <rect x="9.5" y="2.5" width="4" height="4" rx="0.5" {...p} />
          <rect x="2.5" y="9.5" width="4" height="4" rx="0.5" {...p} />
          <rect x="9.5" y="9.5" width="4" height="4" rx="0.5" {...p} />
        </svg>
      );
    case 'edit':
      return <svg width={s} height={s} viewBox={box}><path d="M10.5 3 13 5.5 5 13.5H2.5V11z" {...p} /></svg>;
    case 'arrow':
      return <svg width={s} height={s} viewBox={box}><path d="M3 8h10m-4-4 4 4-4 4" {...p} /></svg>;
    case 'arrowDown':
      return <svg width={s} height={s} viewBox={box}><path d="M8 3v10m-4-4 4 4 4-4" {...p} /></svg>;
    case 'arrowUp':
      return <svg width={s} height={s} viewBox={box}><path d="M8 13V3m-4 4 4-4 4 4" {...p} /></svg>;
    case 'close':
      return <svg width={s} height={s} viewBox={box}><path d="m4 4 8 8M12 4l-8 8" {...p} /></svg>;
    case 'warning':
      return <svg width={s} height={s} viewBox={box}><path d="M8 2 14 13H2z M8 7v3 M8 12v.5" {...p} /></svg>;
    case 'check':
      return <svg width={s} height={s} viewBox={box}><path d="m3 8 3 3 7-7" {...p} /></svg>;
    case 'info':
      return (
        <svg width={s} height={s} viewBox={box}>
          <circle cx="8" cy="8" r="6" {...p} />
          <path d="M8 7v4 M8 5v.5" {...p} />
        </svg>
      );
    case 'sparkle':
      return <svg width={s} height={s} viewBox={box}><path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M13 3l-2 2M5 11l-2 2" {...p} /></svg>;
    case 'spark':
      return <svg width={s} height={s} viewBox={box}><path d="M2 12 5 8 8 11 14 4" {...p} /></svg>;
    case 'dollar':
      return <svg width={s} height={s} viewBox={box}><path d="M8 2v12 M11 5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H5" {...p} /></svg>;
    case 'calendar':
      return (
        <svg width={s} height={s} viewBox={box}>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1" {...p} />
          <path d="M2.5 6.5h11 M5 2v3 M11 2v3" {...p} />
        </svg>
      );
    case 'bank':
      return <svg width={s} height={s} viewBox={box}><path d="m2 6 6-3 6 3 M3 6v7 M13 6v7 M2 13.5h12 M5.5 8v3 M8 8v3 M10.5 8v3" {...p} /></svg>;
    case 'flame':
      return <svg width={s} height={s} viewBox={box}><path d="M8 14c-2.5 0-4-1.8-4-3.8 0-1.5 1-2.5 1.6-3 .3.7.9 1 1.4.8.8-.4-.7-1.7-.4-3.6.2-1.2 1.4-2.4 2.4-2.4-.6 1.6.4 2.4 1 2.7 1.5.7 2 1.8 2 3.2C12 12.2 10.5 14 8 14z" {...p} /></svg>;
    case 'trend-down':
      return <svg width={s} height={s} viewBox={box}><path d="m2 4 5 5 3-3 4 4 M14 10v3h-3" {...p} /></svg>;
    case 'trend-up':
      return <svg width={s} height={s} viewBox={box}><path d="m2 12 5-5 3 3 4-4 M11 6h3v3" {...p} /></svg>;
    case 'sun':
      return (
        <svg width={s} height={s} viewBox={box}>
          <circle cx="8" cy="8" r="3" {...p} />
          <path d="M8 1v2 M8 13v2 M1 8h2 M13 8h2 M3 3l1.5 1.5 M11.5 11.5 13 13 M13 3l-1.5 1.5 M4.5 11.5 3 13" {...p} />
        </svg>
      );
    case 'moon':
      return <svg width={s} height={s} viewBox={box}><path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" {...p} /></svg>;
    default:
      return null;
  }
}
