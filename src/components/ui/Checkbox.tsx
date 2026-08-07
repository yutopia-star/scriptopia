import { type ReactNode } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  error?: string | null;
  id?: string;
}

export function Checkbox({ checked, onChange, label, error, id }: CheckboxProps) {
  const inputId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center  border transition-all duration-200 ${
            checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-surface hover:border-primary/50'
          }`}
        >
          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="text-sm text-foreground select-none">{label}</span>
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </label>
      {error && <p className="mt-1.5 pl-7 text-xs text-error">{error}</p>}
    </div>
  );
}
