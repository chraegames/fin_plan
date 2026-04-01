import { useState, useEffect } from 'react';

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

  useEffect(() => {
    // Sync from parent only when not actively editing
    setRaw(prev => {
      const parsed = Number(prev);
      if (prev === '' || prev === '-' || isNaN(parsed)) return prev;
      if (parsed !== value) return String(value);
      return prev;
    });
  }, [value]);

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
