import { useState } from 'react';
import { Button } from '../primitives/Button';
import { PopoverLabel } from '../primitives/Popover';
import { TextInput } from '../primitives/Input';

interface NameFormProps {
  initial: string;
  label: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}

export function NameForm({ initial, label, onCancel, onSubmit }: NameFormProps) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
      <PopoverLabel>{label}</PopoverLabel>
      <TextInput
        value={value}
        onChange={setValue}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) onSubmit(value.trim());
          else if (e.key === 'Escape') onCancel();
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!value.trim()}
          onClick={() => onSubmit(value.trim())}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
