import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label?: string;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Search...',
  error,
  required,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}{required && <span className="text-error"> *</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`input-field flex items-center justify-between text-left ${error ? 'input-field-error' : ''} ${!value ? 'text-muted-foreground' : ''}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-w-md  border border-border bg-surface shadow-elevated animate-scale-in">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full  bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center justify-between  px-3 py-2 text-sm transition-colors hover:bg-surface-hover ${opt === value ? 'text-primary' : 'text-foreground'}`}
                >
                  {opt}
                  {opt === value && <Check className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
