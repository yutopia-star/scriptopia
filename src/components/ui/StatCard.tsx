import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  color?: string;
}

export function StatCard({ label, value, icon, trend, color = 'text-foreground' }: StatCardProps) {
  return (
    <div className="group relative border-l border-border pl-4 py-1 transition-all duration-300 hover:border-accent">
      <div className="flex items-center justify-between">
        {icon && (
          <div className={`text-muted-foreground ${color ?? ''}`}>
            {icon}
          </div>
        )}
        {trend && (
          <span className="font-mono text-2xs uppercase tracking-wider text-success">{trend}</span>
        )}
      </div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
