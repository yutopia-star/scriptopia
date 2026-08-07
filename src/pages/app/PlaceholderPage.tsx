import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  actionLabel?: string;
  actionTo?: string;
}

export function PlaceholderPage({ title, description, icon, actionLabel, actionTo }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader label="Coming Soon" title={title} description={description} backTo="/app" backLabel="Back to Dashboard" />
      <div className="mt-8">
        <EmptyState
          icon={icon}
          title="Coming Soon"
          description={description}
          action={actionLabel && actionTo ? <Link to={actionTo}><Button size="sm">{actionLabel}</Button></Link> : undefined}
          tone="guiding"
        />
      </div>
    </div>
  );
}
