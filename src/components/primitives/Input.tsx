import { useCallback, type InputHTMLAttributes } from 'react';

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (next: number) => void;
  width?: number | string;
  align?: 'left' | 'right';
  showPrefix?: boolean;
}

export function MoneyInput({
  value,
  onChange,
  width = '100%',
  align = 'right',
  showPrefix = true,
  ...rest
}: MoneyInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.-]/g, '');
      const num = raw === '' || raw === '-' ? 0 : Number(raw);
      onChange(Number.isFinite(num) ? num : 0);
    },
    [onChange],
  );
  const display = value === 0 ? '' : Math.round(value).toLocaleString('en-US');
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 32,
        padding: '0 10px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 13,
        color: 'var(--ink)',
        width,
        boxSizing: 'border-box',
      }}
    >
      {showPrefix && <span style={{ color: 'var(--ink-muted)' }}>$</span>}
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={rest.placeholder ?? '0'}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: align,
          background: 'transparent',
          fontFamily: 'inherit',
          fontVariantNumeric: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
        }}
      />
    </label>
  );
}

interface YearInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  width?: number | string;
}

export function YearInput({ value, onChange, min, max, width = 90, ...rest }: YearInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (raw === '') return onChange(value);
      const num = Number(raw);
      if (!Number.isFinite(num)) return;
      let clamped = num;
      if (min != null) clamped = Math.max(min, clamped);
      if (max != null) clamped = Math.min(max, clamped);
      onChange(clamped);
    },
    [onChange, value, min, max],
  );
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={String(value)}
      onChange={handleChange}
      style={{
        width,
        height: 32,
        padding: '0 8px',
        textAlign: 'center',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 13,
        color: 'var(--ink)',
        boxSizing: 'border-box',
      }}
    />
  );
}

interface PercentInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Stored as a fraction (0.07 = 7%); user types percent. */
  value: number;
  onChange: (next: number) => void;
  width?: number | string;
}

export function PercentInput({ value, onChange, width = 90, ...rest }: PercentInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.-]/g, '');
      const num = raw === '' || raw === '-' ? 0 : Number(raw);
      if (!Number.isFinite(num)) return;
      onChange(num / 100);
    },
    [onChange],
  );
  const display = (value * 100).toFixed(1).replace(/\.0$/, '');
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 32,
        padding: '0 10px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 13,
        color: 'var(--ink)',
        width,
        boxSizing: 'border-box',
      }}
    >
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'right',
          background: 'transparent',
          fontFamily: 'inherit',
          fontVariantNumeric: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
        }}
      />
      <span style={{ color: 'var(--ink-muted)' }}>%</span>
    </label>
  );
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (next: string) => void;
}

export function TextInput({ onChange, style, ...rest }: TextInputProps) {
  return (
    <input
      {...rest}
      onChange={e => onChange?.(e.target.value)}
      style={{
        height: 32,
        padding: '0 10px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--ink)',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}
