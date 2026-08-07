interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

const VARIANT_STYLES: Record<string, string> = {
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  error: 'text-error bg-error/10 border-error/20',
  info: 'text-secondary-foreground bg-secondary border-border',
  neutral: 'text-muted-foreground bg-muted border-border',
};

export function StatusBadge({ status, variant = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${VARIANT_STYLES[variant]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
