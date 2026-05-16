interface LogoProps {
  size?: number;
}

export function Logo({ size = 22 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="10" fill="var(--accent)" />
      <path
        d="M11 5 C 7.5 8 7.5 11.5 11 14.5 C 14.5 11.5 14.5 8 11 5 Z"
        fill="oklch(0.995 0.005 80)"
        opacity="0.95"
      />
    </svg>
  );
}
