import { useState } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}

export default function NumericInput({ value, onChange, className, placeholder, step, min, max }: Props) {
  const [raw, setRaw] = useState(String(value));
  // Track the last `value` prop we synced from. When the parent's value
  // changes between renders, adopt it — but only if the user isn't mid-edit
  // (raw is empty, "-", or NaN). This is the React 19 derived-state pattern:
  // compute the sync during render, never inside an effect.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    const parsed = Number(raw);
    const editing = raw === '' || raw === '-' || isNaN(parsed);
    if (!editing && parsed !== value) {
      setRaw(String(value));
    }
  }

  return (
    <input
      type="number"
      value={raw}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      className={className}
      onFocus={e => e.target.select()}
      onChange={e => {
        const text = e.target.value;
        setRaw(text);
        if (text === '' || text === '-') {
          onChange(0);
        } else {
          const n = Number(text);
          if (!isNaN(n)) onChange(n);
        }
      }}
      onBlur={() => setRaw(String(value))}
    />
  );
}
