import { type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface AlertProps {
  children: ReactNode;
  variant?: 'info' | 'warning' | 'error' | 'success';
}

export function Alert({ children, variant = 'info' }: AlertProps) {
  const styles = {
    info: 'text-secondary-foreground border-border bg-secondary/40',
    warning: 'text-warning border-warning/30 bg-warning/5',
    error: 'text-error border-error/30 bg-error/5',
    success: 'text-success border-success/30 bg-success/5',
  };
  return (
    <div className={`flex items-start gap-2.5 border-l-2 px-3.5 py-3 text-sm ${styles[variant]}`}>
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
