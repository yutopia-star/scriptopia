import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';

interface DashboardWidgetProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: { label: string; to: string };
  children: ReactNode;
  className?: string;
}

export function DashboardWidget({ title, subtitle, icon, action, children, className = '' }: DashboardWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={action && (
          <Link to={action.to} className="flex items-center gap-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            {action.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      />
      <div className="mt-4">{children}</div>
    </Card>
  );
}
