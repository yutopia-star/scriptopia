import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

const TEMPLATES = [
  { value: 'landing', label: 'Landing Page', desc: 'Marketing landing page with hero, features, CTAs' },
  { value: 'standard', label: 'Standard Content', desc: 'General content page with rich text blocks' },
  { value: 'marketing', label: 'Marketing Page', desc: 'Promotional page with pricing and features' },
  { value: 'contact', label: 'Contact Page', desc: 'Page with a contact form' },
  { value: 'legal', label: 'Legal Page', desc: 'Terms, privacy, or legal content' },
  { value: 'blank', label: 'Custom Blank', desc: 'Empty page for custom content' },
];

export function AdminNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    slug: '',
    template: 'standard',
    nav_label: '',
    seo_title: '',
    meta_description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.slug) { setError('Title and slug are required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from('pages').insert({
        title: form.title,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        template: form.template,
        status: 'draft',
        nav_label: form.nav_label || null,
        seo_title: form.seo_title || null,
        meta_description: form.meta_description || null,
      }).select('*').maybeSingle();

      if (insertError) throw insertError;
      if (data) navigate(`/admin/pages/${data.id}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create page.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        label="Pages"
        title="Create New Page"
        description="Create a new page without writing code. You can add content blocks after creation."
        backTo="/admin/pages"
        backLabel="Back to Pages"
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader title="Basic Information" subtitle="Title and URL for this page" icon={<Feather className="h-5 w-5" />} />
            <div className="mt-4 space-y-4 p-5 pt-0">
              <Input
                label="Page Title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="My New Page"
              />
              <Input
                label="URL Slug"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="my-new-page"
                hint={`This will be the URL: /${form.slug || 'my-new-page'}`}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Page Template" subtitle="Choose a starting point" icon={<Feather className="h-5 w-5" />} />
            <div className="mt-4 grid gap-2 p-5 pt-0 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, template: t.value })}
                  className={` border p-4 text-left transition-all ${form.template === t.value ? 'border-primary ring-2 ring-primary/20 ' : 'border-border hover:border-primary/30 hover:bg-surface-hover'}`}
                >
                  <div className="flex items-center gap-2">
                    <Feather className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="SEO & Navigation" subtitle="Optional fields for search and navigation" icon={<Feather className="h-5 w-5" />} />
            <div className="mt-4 space-y-4 p-5 pt-0">
              <Input
                label="Navigation Label (optional)"
                value={form.nav_label}
                onChange={(e) => setForm({ ...form, nav_label: e.target.value })}
                placeholder="How it appears in the nav bar"
              />
              <Input
                label="SEO Title (optional)"
                value={form.seo_title}
                onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                placeholder="Title for search engines"
              />
              <Textarea
                label="Meta Description (optional)"
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                rows={2}
                placeholder="Description for search engines"
              />
            </div>
          </Card>

          {error && (
            <div className=" bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={saving} loading={saving}>
              {saving ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
