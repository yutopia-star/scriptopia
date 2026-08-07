import { useState, useEffect } from 'react';
import { Flag, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFeatureFlags, toggleFeatureFlag, logAction, type FeatureFlag } from '@/lib/admin';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';

const CATEGORIES: Record<string, string> = {
  reader: 'Reader Features',
  writer: 'Writer Features',
  industry: 'Industry Features',
  platform: 'Platform Features',
  future: 'Future Features',
};

export function AdminFeatureFlags() {
  const { profile } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const f = await fetchFeatureFlags();
    setFlags(f);
    setLoading(false);
  }

  async function handleToggle(key: string, enabled: boolean) {
    await toggleFeatureFlag(key, enabled);
    if (profile) await logAction(profile.id, `Toggled feature flag ${key} to ${enabled}`, 'feature_flag', { key, enabled });
    await load();
  }

  if (loading) {
    return (
      <div>
        <PageHeader label="Settings" title="Feature Flags" description="Enable or disable platform features. Changes apply immediately." />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 " />)}
        </div>
      </div>
    );
  }

  const categories = [...new Set(flags.map((f) => f.category))];

  return (
    <div>
      <PageHeader
        label="Settings"
        title="Feature Flags"
        description="Enable or disable platform features. Changes apply immediately."
      />

      <div className="space-y-6">
        {categories.map((cat) => (
          <Card key={cat}>
            <CardHeader
              title={CATEGORIES[cat] ?? cat}
              subtitle={`Features in the ${CATEGORIES[cat] ?? cat} category`}
              icon={<Flag className="h-5 w-5" />}
            />
            <div className="mt-4 space-y-2 p-5 pt-0">
              {flags.filter((f) => f.category === cat).map((flag) => (
                <div key={flag.id} className="flex items-center justify-between  rounded-xl border border-border bg-background p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{flag.feature_name}</p>
                    {flag.description && <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={flag.is_enabled ? 'Enabled' : 'Disabled'} variant={flag.is_enabled ? 'success' : 'neutral'} />
                    <button onClick={() => handleToggle(flag.feature_key, !flag.is_enabled)} className="flex items-center gap-2 transition-opacity hover:opacity-80">
                      {flag.is_enabled ? (
                        <ToggleRight className="h-8 w-8 text-success" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
