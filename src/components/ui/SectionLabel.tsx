import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function SectionLabel({ children, icon, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{children}</span>
    </div>
  );
}
