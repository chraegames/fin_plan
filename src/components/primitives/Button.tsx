import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 28, padding: '0 10px', fontSize: 12, gap: 6 },
  md: { height: 34, padding: '0 14px', fontSize: 13, gap: 8 },
  lg: { height: 42, padding: '0 20px', fontSize: 14, gap: 10 },
};

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent)',
        color: 'oklch(0.995 0.005 80)',
        border: '1px solid var(--accent-2)',
        boxShadow:
          '0 1px 0 oklch(1 0 0 / 0.2) inset, 0 1px 2px oklch(0.40 0.04 60 / 0.18)',
      };
    case 'soft':
      return {
        background: 'var(--accent-soft)',
        color: 'var(--accent-ink)',
        border: '1px solid transparent',
      };
    case 'outline':
      return {
        background: 'var(--surface)',
        color: 'var(--ink-2)',
        border: '1px solid var(--border)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--ink-3)',
        border: '1px solid transparent',
      };
  }
}

export function Button({
  variant = 'outline',
  size = 'md',
  leading,
  trailing,
  children,
  style,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    letterSpacing: 'var(--tracking-normal)',
    cursor: 'pointer',
    transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease, opacity 120ms ease',
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...variantStyle(variant),
    ...style,
  };
  return (
    <button {...rest} style={base}>
      {leading}
      {children}
      {trailing}
    </button>
  );
}
