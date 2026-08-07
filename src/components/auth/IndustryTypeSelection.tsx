import { Building2, UserRound, Check } from 'lucide-react';
import type { IndustryAccountType } from '@/types/database';
import { INDUSTRY_TYPE_LABELS, INDUSTRY_TYPE_DESCRIPTIONS } from '@/lib/constants';

interface IndustryTypeData {
  type: IndustryAccountType;
  label: string;
  description: string;
  icon: typeof Building2;
}

const TYPE_CARDS: IndustryTypeData[] = [
  { type: 'company', label: INDUSTRY_TYPE_LABELS.company, description: INDUSTRY_TYPE_DESCRIPTIONS.company, icon: Building2 },
  { type: 'independent', label: INDUSTRY_TYPE_LABELS.independent, description: INDUSTRY_TYPE_DESCRIPTIONS.independent, icon: UserRound },
];

interface IndustryTypeSelectionProps {
  selectedType: IndustryAccountType | null;
  onSelect: (type: IndustryAccountType) => void;
}

export function IndustryTypeSelection({ selectedType, onSelect }: IndustryTypeSelectionProps) {
  return (
    <div className="grid gap-3">
      {TYPE_CARDS.map(({ type, label, description, icon: Icon }) => {
        const isSelected = selectedType === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
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
