import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger';
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

function variantStyle(variant: ButtonVariant, hovered: boolean): React.CSSProperties {
  switch (variant) {
    case 'primary':
      // Filter handles primary's hover via base.css; just keep base colours.
      return {
        background: 'var(--accent)',
        color: 'var(--accent-contrast)',
        border: '1px solid var(--accent)',
      };
    case 'soft':
      return {
        background: hovered ? 'var(--accent-tint)' : 'var(--accent-soft)',
        color: 'var(--accent-ink)',
        border: '1px solid transparent',
      };
    case 'outline':
      return {
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        color: 'var(--ink-2)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
      };
    case 'ghost':
      return {
        background: hovered ? 'var(--surface-2)' : 'transparent',
        color: hovered ? 'var(--ink)' : 'var(--ink-3)',
        border: '1px solid transparent',
      };
    case 'danger':
      return {
        background: hovered ? 'oklch(0.50 0.18 25)' : 'var(--negative)',
        color: 'oklch(0.995 0.005 80)',
        border: '1px solid var(--negative)',
        boxShadow:
          '0 1px 0 oklch(1 0 0 / 0.2) inset, 0 1px 2px oklch(0.20 0.04 260 / 0.18)',
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
  disabled,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const effectiveHover = hovered && !disabled;
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    letterSpacing: 'var(--tracking-normal)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition:
      'background-color 140ms ease, color 140ms ease, border-color 140ms ease, opacity 140ms ease, filter 140ms ease',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.55 : 1,
    ...sizeStyles[size],
    ...variantStyle(variant, effectiveHover),
    ...style,
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      onMouseEnter={e => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      onFocus={e => {
        setHovered(true);
        onFocus?.(e);
      }}
      onBlur={e => {
        setHovered(false);
        onBlur?.(e);
      }}
      style={base}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
