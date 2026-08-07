import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Copy, Archive, Trash2, Globe, FileText } from 'lucide-react';
import { fetchAllPages } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { CmsPage } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS_VARIANT: Record<string, 'success' | 'neutral' | 'warning' | 'info'> = {
  published: 'success',
  draft: 'neutral',
  hidden: 'warning',
  archived: 'info',
};

export function AdminPages() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setPages(await fetchAllPages());
    setLoading(false);
  }

  const filtered = pages.filter((p) =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  async function updateStatus(page: CmsPage, status: string) {
    await supabase.from('pages').update({ status }).eq('id', page.id);
    load();
  }

  async function duplicatePage(page: CmsPage) {
    const newSlug = `${page.slug}-copy-${Date.now().toString(36)}`;
    await supabase.from('pages').insert({
      slug: newSlug,
      title: `${page.title} (Copy)`,
      template: page.template,
      status: 'draft',
      nav_label: page.nav_label,
      seo_title: page.seo_title,
      meta_description: page.meta_description,
    });
    load();
  }

  async function archivePage(page: CmsPage) {
    await updateStatus(page, 'archived');
  }

  async function deletePage(page: CmsPage) {
    if (!confirm(`Delete "${page.title}"? This is a soft delete — the page will be archived.`)) return;
    await updateStatus(page, 'archived');
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Pages"
        description="Create, edit, and manage all website pages."
        actions={
          <Link to="/admin/pages/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New Page</Button>
          </Link>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 " />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No pages found"
          description="Create your first page to get started."
          action={
            <Link to="/admin/pages/new">
              <Button size="sm"><Plus className="h-4 w-4" /> New Page</Button>
            </Link>
          }
        />
      ) : (
        <Table
          data={filtered}
          rowKey={(p) => p.id}
          columns={[
            {
              key: 'title',
              header: 'Page Name',
              render: (p) => (
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{p.title}</span>
                </div>
              ),
            },
            {
              key: 'slug',
              header: 'URL',
              render: (p) => (
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-2xs text-muted-foreground">/{p.slug}</code>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (p) => (
                <StatusBadge status={p.status} variant={STATUS_VARIANT[p.status] ?? 'neutral'} />
              ),
            },
            {
              key: 'nav',
              header: 'Nav',
              render: (p) =>
                p.nav_visible ? (
                  <StatusBadge status="Visible" variant="success" />
                ) : (
                  <StatusBadge status="Hidden" variant="neutral" />
                ),
            },
            {
              key: 'updated',
              header: 'Updated',
              render: (p) => (
                <span className="font-mono text-2xs text-muted-foreground">
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'text-right',
              render: (p) => (
                <div className="flex items-center justify-end gap-1">
                  <Link to={`/${p.slug === 'home' ? '' : p.slug}`} target="_blank" className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Preview">
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link to={`/admin/pages/${p.id}/edit`} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Edit">
                    <Edit className="h-4 w-4" />
                  </Link>
                  {p.status === 'published' ? (
                    <button onClick={() => updateStatus(p, 'hidden')} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Unpublish">
                      <Globe className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => updateStatus(p, 'published')} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Publish">
                      <Globe className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => duplicatePage(p)} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => archivePage(p)} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>
                  <button onClick={() => deletePage(p)} className=" p-1.5 text-error transition-colors hover:bg-error/10" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
