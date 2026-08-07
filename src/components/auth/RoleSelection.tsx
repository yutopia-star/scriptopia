import { PenLine, BookOpen, Clapperboard, Check } from 'lucide-react';
import type { AppRole } from '@/types/database';
import { ROLE_DESCRIPTIONS } from '@/lib/constants';

interface RoleCardData {
  role: AppRole;
  label: string;
  description: string;
  icon: typeof PenLine;
}

const ROLE_CARDS: RoleCardData[] = [
  { role: 'writer', label: 'Writer', description: ROLE_DESCRIPTIONS.writer, icon: PenLine },
  { role: 'reader', label: 'Reader', description: ROLE_DESCRIPTIONS.reader, icon: BookOpen },
  { role: 'industry', label: 'Industry', description: ROLE_DESCRIPTIONS.industry, icon: Clapperboard },
];

interface RoleSelectionProps {
  selectedRole: AppRole | null;
  onSelect: (role: AppRole) => void;
}

export function RoleSelection({ selectedRole, onSelect }: RoleSelectionProps) {
  return (
    <div className="grid gap-3">
      {ROLE_CARDS.map(({ role, label, description, icon: Icon }) => {
        const isSelected = selectedRole === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onSelect(role)}
            className={`role-card group ${isSelected ? 'role-card-selected' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors duration-300 ${isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-secondary text-secondary-foreground group-hover:border-foreground/20'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
              {isSelected && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-accent text-accent-foreground animate-scale-in">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
