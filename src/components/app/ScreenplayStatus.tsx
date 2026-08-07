import type { ScreenplayStatus, ScreenplayFormat } from '@/types/database';
import { StatusBadge } from '@/components/ui/StatusBadge';

const STATUS_CONFIG: Record<ScreenplayStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted: { label: 'Submitted', variant: 'info' },
  awaiting_assignment: { label: 'Awaiting Assignment', variant: 'warning' },
  in_review: { label: 'In Review', variant: 'info' },
  validated: { label: 'Validated', variant: 'success' },
  producer_visible: { label: 'Producer Visible', variant: 'success' },
  archived: { label: 'Archived', variant: 'neutral' },
  hidden: { label: 'Hidden', variant: 'error' },
};

export function ScreenplayStatusBadge({ status }: { status: ScreenplayStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return <StatusBadge status={config.label} variant={config.variant} />;
}

export const SCREENPLAY_STATUSES = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));

export const FORMAT_LABELS: Record<ScreenplayFormat, string> = {
  feature: 'Feature Film',
  tv_pilot: 'Television Pilot',
  short_film: 'Short Film',
};

export const FORMAT_OPTIONS = Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label }));
