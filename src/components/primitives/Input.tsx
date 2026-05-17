import { useCallback, useState, type InputHTMLAttributes } from 'react';

// ─── Shared focus-buffered input behaviour ──────────────────────────────
// All three numeric inputs share the same pattern:
//   - while focused: show the raw text the user is typing, with no
//     auto-formatting and no clamping (so backspace / mid-edit work)
//   - while blurred: show a formatted display derived from the canonical
//     `value` prop
//   - on every keystroke: try to parse and call `onChange` so the chart /
//     simulation updates live
//   - on blur: clamp / canonicalize and call `onChange` once more with
//     the clean value
// External value changes (e.g. another field updating it) sync into the
// raw buffer only when the field isn't focused.

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (next: number) => void;
  width?: number | string;
  align?: 'left' | 'right';
  showPrefix?: boolean;
  /** Allow negative values. Defaults to false. */
  allowNegative?: boolean;
  /** Render with a red border to flag a missing or invalid value. */
  error?: boolean;
}

function formatMoney(value: number): string {
  if (value === 0) return '';
  return Math.round(value).toLocaleString('en-US');
}

export function MoneyInput({
  value,
  onChange,
  width = '100%',
  align = 'right',
  showPrefix = true,
  allowNegative = false,
  error = false,
  ...rest
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(() => (value === 0 ? '' : String(Math.round(value))));
  const [lastSeenValue, setLastSeenValue] = useState(value);

  // Sync our buffer if the canonical value moves while we're not editing.
  if (!focused && value !== lastSeenValue) {
    setLastSeenValue(value);
    setRaw(value === 0 ? '' : String(Math.round(value)));
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pattern = allowNegative ? /[^0-9.-]/g : /[^0-9.]/g;
      const next = e.target.value.replace(pattern, '');
      setRaw(next);
      // Live-update the canonical value too, so the chart reflects edits
      // as they happen. Empty / partial strings parse to 0.
      const parsed = next === '' || next === '-' ? 0 : parseFloat(next);
      if (Number.isFinite(parsed) && parsed !== value) {
        onChange(allowNegative ? parsed : Math.max(0, parsed));
      }
    },
    [onChange, value, allowNegative],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = raw === '' || raw === '-' ? 0 : parseFloat(raw);
    const clean = Number.isFinite(parsed) ? (allowNegative ? parsed : Math.max(0, parsed)) : 0;
    if (clean !== value) onChange(clean);
    setRaw(clean === 0 ? '' : String(Math.round(clean)));
    setLastSeenValue(clean);
  }, [raw, value, onChange, allowNegative]);

  const display = focused ? raw : formatMoney(value);

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 32,
        padding: '0 10px',
        background: error ? 'var(--negative-soft)' : 'var(--surface-2)',
        border: `1px solid ${error ? 'var(--negative)' : 'var(--border-soft)'}`,
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
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
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
  /** Inclusive lower bound applied on blur. Doesn't restrict typing. */
  min?: number;
  /** Inclusive upper bound applied on blur. Doesn't restrict typing. */
  max?: number;
  width?: number | string;
  /** Render with a red border to flag a missing or invalid value. */
  error?: boolean;
}

export function YearInput({ value, onChange, min, max, width = 90, error = false, ...rest }: YearInputProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(() => String(value));
  const [lastSeenValue, setLastSeenValue] = useState(value);

  if (!focused && value !== lastSeenValue) {
    setLastSeenValue(value);
    setRaw(String(value));
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow up to 4 digits while typing; no clamping yet — clamping
      // mid-keystroke wipes the field, which made backspace unusable.
      const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      setRaw(next);
      // Mirror to the canonical value if it's parseable, otherwise leave
      // the old value alone so the rest of the app isn't seeing NaN.
      if (next.length > 0) {
        const parsed = Number(next);
        if (Number.isFinite(parsed) && parsed !== value) onChange(parsed);
      }
    },
    [onChange, value],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = raw === '' ? value : Number(raw);
    let clean = Number.isFinite(parsed) ? parsed : value;
    if (min != null) clean = Math.max(min, clean);
    if (max != null) clean = Math.min(max, clean);
    if (clean !== value) onChange(clean);
    setRaw(String(clean));
    setLastSeenValue(clean);
  }, [raw, value, min, max, onChange]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={focused ? raw : String(value)}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      style={{
        width,
        height: 32,
        padding: '0 8px',
        textAlign: 'center',
        background: error ? 'var(--negative-soft)' : 'var(--surface-2)',
        border: `1px solid ${error ? 'var(--negative)' : 'var(--border-soft)'}`,
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
  /** Allow negative percentages. Defaults to false. */
  allowNegative?: boolean;
}

function formatPercent(value: number): string {
  // Show enough precision to round-trip 0.075 → "7.5", but drop trailing .0
  const pct = value * 100;
  const s = pct.toFixed(2);
  return s.replace(/\.?0+$/, '');
}

export function PercentInput({
  value,
  onChange,
  width = 90,
  allowNegative = false,
  ...rest
}: PercentInputProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(() => formatPercent(value));
  const [lastSeenValue, setLastSeenValue] = useState(value);

  if (!focused && value !== lastSeenValue) {
    setLastSeenValue(value);
    setRaw(formatPercent(value));
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pattern = allowNegative ? /[^0-9.-]/g : /[^0-9.]/g;
      const next = e.target.value.replace(pattern, '');
      setRaw(next);
      if (next === '' || next === '-' || next === '.') return; // keep value, allow typing
      const parsed = parseFloat(next);
      if (Number.isFinite(parsed)) {
        const fraction = (allowNegative ? parsed : Math.max(0, parsed)) / 100;
        if (fraction !== value) onChange(fraction);
      }
    },
    [onChange, value, allowNegative],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = raw === '' || raw === '-' || raw === '.' ? 0 : parseFloat(raw);
    const pct = Number.isFinite(parsed) ? (allowNegative ? parsed : Math.max(0, parsed)) : 0;
    const fraction = pct / 100;
    if (fraction !== value) onChange(fraction);
    setRaw(formatPercent(fraction));
    setLastSeenValue(fraction);
  }, [raw, value, onChange, allowNegative]);

  const display = focused ? raw : formatPercent(value);

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
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
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
