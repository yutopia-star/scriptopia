import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Copy, Eye, EyeOff,
  Save, Globe, History, X, RotateCcw, FileText,
} from 'lucide-react';
import { fetchPageWithVersions, savePageVersion, restorePageVersion } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { CmsPage, PageVersion, ContentBlock, BlockType } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';

const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: 'hero', label: 'Hero Section' },
  { type: 'rich_text', label: 'Rich Text' },
  { type: 'feature_grid', label: 'Feature Grid' },
  { type: 'stats', label: 'Statistics' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'cta_banner', label: 'CTA Banner' },
  { type: 'faq_accordion', label: 'FAQ Accordion' },
  { type: 'pricing_table', label: 'Pricing Table' },
  { type: 'philosophy', label: 'Philosophy' },
  { type: 'how_it_works', label: 'How It Works' },
  { type: 'contact_form', label: 'Contact Form' },
  { type: 'divider', label: 'Divider' },
  { type: 'spacer', label: 'Spacer' },
];

export function AdminPageEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);

  useEffect(() => {
    if (!pageId) return;
    fetchPageWithVersions(pageId).then((result) => {
      if (!result) { navigate('/admin/pages'); return; }
      setPage(result.page);
      setVersions(result.versions);
      const current = result.versions.find((v) => v.is_current) || result.versions[0];
      setBlocks(current?.blocks || []);
      setLoading(false);
    });
  }, [pageId, navigate]);

  function addBlock(type: BlockType) {
    const defaultData: Record<string, unknown> = {};
    if (type === 'hero') defaultData.headline = 'New Headline';
    if (type === 'rich_text') defaultData.title = 'Section Title';
    if (type === 'feature_grid') defaultData.cards = [];
    if (type === 'how_it_works') defaultData.steps = [];
    if (type === 'cta_banner') defaultData.title = 'Call to Action';
    if (type === 'philosophy') defaultData.title = 'Philosophy';
    if (type === 'stats') defaultData.title = 'Statistics';
    if (type === 'testimonials') defaultData.title = 'Testimonials';
    if (type === 'faq_accordion') defaultData.title = 'FAQ';
    if (type === 'pricing_table') defaultData.title = 'Pricing';
    if (type === 'spacer') defaultData.height = 48;

    setBlocks([...blocks, { type, data: defaultData, hidden: false }]);
    setEditingBlock(blocks.length);
    setShowAddBlock(false);
  }

  function removeBlock(index: number) {
    setBlocks(blocks.filter((_, i) => i !== index));
    setEditingBlock(null);
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  }

  function duplicateBlock(index: number) {
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, { ...blocks[index], data: { ...blocks[index].data } });
    setBlocks(newBlocks);
  }

  function toggleBlockHidden(index: number) {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], hidden: !newBlocks[index].hidden };
    setBlocks(newBlocks);
  }

  function updateBlockData(index: number, data: Record<string, unknown>) {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], data: { ...newBlocks[index].data, ...data } };
    setBlocks(newBlocks);
  }

  async function handleSave(publish: boolean) {
    if (!pageId) return;
    setSaving(true);
    try {
      await savePageVersion(pageId, blocks, publish);
      const result = await fetchPageWithVersions(pageId);
      if (result) {
        setVersions(result.versions);
        const current = result.versions.find((v) => v.is_current) || result.versions[0];
        setBlocks(current?.blocks || []);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!pageId || !confirm('Restore this version? A new version will be created.')) return;
    await restorePageVersion(versionId, pageId);
    const result = await fetchPageWithVersions(pageId);
    if (result) {
      setVersions(result.versions);
      const current = result.versions.find((v) => v.is_current) || result.versions[0];
      setBlocks(current?.blocks || []);
    }
    setShowHistory(false);
  }

  async function updatePageSettings(updates: Partial<CmsPage>) {
    if (!pageId) return;
    await supabase.from('pages').update(updates).eq('id', pageId);
    setPage(page ? { ...page, ...updates } : null);
  }

  if (loading || !page) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Pages"
        title={page.title}
        description={`/${page.slug}`}
        backTo="/admin/pages"
        backLabel="Back to Pages"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}><History className="h-4 w-4" /> History</Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>Settings</Button>
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}><Save className="h-4 w-4" /> Save Draft</Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving} loading={saving}><Globe className="h-4 w-4" /> Publish</Button>
          </>
        }
      />

      {/* Blocks list */}
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <Card key={i} className={block.hidden ? 'border-dashed opacity-60' : ''}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center  bg-secondary font-mono text-2xs font-semibold text-secondary-foreground">{i + 1}</span>
                  <span className="text-sm font-medium text-foreground">{BLOCK_TYPES.find((b) => b.type === block.type)?.label || block.type}</span>
                  {block.hidden && <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">(hidden)</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => toggleBlockHidden(i)} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover">{block.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button onClick={() => duplicateBlock(i)} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => removeBlock(i)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {editingBlock === i && (
                <div className="mt-4 border-t border-border pt-4">
                  <BlockEditor block={block} onChange={(data) => updateBlockData(i, data)} />
                  <button onClick={() => setEditingBlock(null)} className="mt-3 inline-flex h-8 items-center gap-1.5  border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover">
                    <X className="h-3.5 w-3.5" /> Done
                  </button>
                </div>
              )}

              {editingBlock !== i && (
                <button onClick={() => setEditingBlock(i)} className="mt-2 text-xs font-medium text-primary hover:underline">
                  Edit content
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {blocks.length === 0 && (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No content blocks yet"
          description="Add your first content block to start building this page."
          tone="guiding"
        />
      )}

      <button
        onClick={() => setShowAddBlock(true)}
        className="mt-4 flex w-full items-center justify-center gap-2  border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Add Content Block
      </button>

      {/* Add block modal */}
      <Modal open={showAddBlock} onClose={() => setShowAddBlock(false)} title="Add Content Block" maxWidth="max-w-lg">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BLOCK_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className=" border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-surface-hover"
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal page={page} onClose={() => setShowSettings(false)} onSave={updatePageSettings} />
      )}

      {/* History modal */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Version History" maxWidth="max-w-lg">
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between  rounded-xl border border-border bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Version {v.version_number}</p>
                <p className="font-mono text-2xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString()}
                  {v.is_current && ' — Current'}
                  {v.is_published && !v.is_current && ' — Published'}
                </p>
              </div>
              {!v.is_current && (
                <Button size="sm" variant="outline" onClick={() => handleRestore(v.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function SettingsModal({ page, onClose, onSave }: { page: CmsPage; onClose: () => void; onSave: (updates: Partial<CmsPage>) => void }) {
  const [form, setForm] = useState({
    title: page.title,
    slug: page.slug,
    template: page.template,
    status: page.status,
    nav_label: page.nav_label || '',
    nav_visible: page.nav_visible,
    footer_visible: page.footer_visible,
    seo_title: page.seo_title || '',
    meta_description: page.meta_description || '',
    canonical_url: page.canonical_url || '',
    og_image_url: page.og_image_url || '',
    robots_index: page.robots_index,
    page_icon: page.page_icon || '',
  });

  return (
    <Modal open={true} onClose={onClose} title="Page Settings & SEO" maxWidth="max-w-lg">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        <Input label="Page Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="URL Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Template</label>
            <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value as CmsPage['template'] })} className="input-field">
              <option value="landing">Landing Page</option>
              <option value="standard">Standard Content</option>
              <option value="marketing">Marketing Page</option>
              <option value="contact">Contact Page</option>
              <option value="legal">Legal Page</option>
              <option value="blank">Custom Blank</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CmsPage['status'] })} className="input-field">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <Input label="Navigation Label" value={form.nav_label} onChange={(e) => setForm({ ...form, nav_label: e.target.value })} placeholder="How It Works" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.nav_visible} onChange={(e) => setForm({ ...form, nav_visible: e.target.checked })} className="h-4 w-4 rounded border-input" />
            Show in header nav
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.footer_visible} onChange={(e) => setForm({ ...form, footer_visible: e.target.checked })} className="h-4 w-4 rounded border-input" />
            Show in footer
          </label>
        </div>
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium text-foreground">SEO</p>
          <div className="space-y-3">
            <Input label="SEO Title" value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
            <Textarea label="Meta Description" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={2} />
            <Input label="Canonical URL" value={form.canonical_url} onChange={(e) => setForm({ ...form, canonical_url: e.target.value })} />
            <Input label="Open Graph Image URL" value={form.og_image_url} onChange={(e) => setForm({ ...form, og_image_url: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.robots_index} onChange={(e) => setForm({ ...form, robots_index: e.target.checked })} className="h-4 w-4 rounded border-input" />
              Allow search engine indexing
            </label>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onSave(form); onClose(); }}>Save Settings</Button>
      </div>
    </Modal>
  );
}

function BlockEditor({ block, onChange }: { block: ContentBlock; onChange: (data: Record<string, unknown>) => void }) {
  const data = block.data;

  if (block.type === 'hero') {
    return (
      <div className="space-y-3">
        <Field label="Headline"><input defaultValue={data.headline as string} onChange={(e) => onChange({ headline: e.target.value })} className="input-field" /></Field>
        <Field label="Subheadline"><textarea defaultValue={data.subheadline as string} onChange={(e) => onChange({ subheadline: e.target.value })} rows={2} className="input-field resize-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary CTA Label"><input defaultValue={data.primary_cta_label as string} onChange={(e) => onChange({ primary_cta_label: e.target.value })} className="input-field" /></Field>
          <Field label="Primary CTA URL"><input defaultValue={data.primary_cta_url as string} onChange={(e) => onChange({ primary_cta_url: e.target.value })} className="input-field" /></Field>
          <Field label="Secondary CTA Label"><input defaultValue={data.secondary_cta_label as string} onChange={(e) => onChange({ secondary_cta_label: e.target.value })} className="input-field" /></Field>
          <Field label="Secondary CTA URL"><input defaultValue={data.secondary_cta_url as string} onChange={(e) => onChange({ secondary_cta_url: e.target.value })} className="input-field" /></Field>
        </div>
      </div>
    );
  }

  if (block.type === 'rich_text') {
    return (
      <div className="space-y-3">
        <Field label="Title"><input defaultValue={data.title as string} onChange={(e) => onChange({ title: e.target.value })} className="input-field" /></Field>
        <Field label="Body"><textarea defaultValue={data.body as string} onChange={(e) => onChange({ body: e.target.value })} rows={5} className="input-field resize-none" /></Field>
      </div>
    );
  }

  if (block.type === 'cta_banner') {
    return (
      <div className="space-y-3">
        <Field label="Title"><input defaultValue={data.title as string} onChange={(e) => onChange({ title: e.target.value })} className="input-field" /></Field>
        <Field label="Subtitle"><textarea defaultValue={data.subtitle as string} onChange={(e) => onChange({ subtitle: e.target.value })} rows={2} className="input-field resize-none" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary CTA Label"><input defaultValue={data.primary_cta_label as string} onChange={(e) => onChange({ primary_cta_label: e.target.value })} className="input-field" /></Field>
          <Field label="Primary CTA URL"><input defaultValue={data.primary_cta_url as string} onChange={(e) => onChange({ primary_cta_url: e.target.value })} className="input-field" /></Field>
          <Field label="Secondary CTA Label"><input defaultValue={data.secondary_cta_label as string} onChange={(e) => onChange({ secondary_cta_label: e.target.value })} className="input-field" /></Field>
          <Field label="Secondary CTA URL"><input defaultValue={data.secondary_cta_url as string} onChange={(e) => onChange({ secondary_cta_url: e.target.value })} className="input-field" /></Field>
        </div>
      </div>
    );
  }

  if (block.type === 'philosophy') {
    return (
      <div className="space-y-3">
        <Field label="Title"><input defaultValue={data.title as string} onChange={(e) => onChange({ title: e.target.value })} className="input-field" /></Field>
        <Field label="Body"><textarea defaultValue={data.body as string} onChange={(e) => onChange({ body: e.target.value })} rows={5} className="input-field resize-none" /></Field>
        <Field label="Not Items (comma-separated)"><input defaultValue={(data.not_items as string[])?.join(', ')} onChange={(e) => onChange({ not_items: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="input-field" /></Field>
      </div>
    );
  }

  if (block.type === 'feature_grid') {
    const cards = (data.cards as Array<{ icon: string; title: string; description: string }>) || [];
    return (
      <div className="space-y-3">
        <Field label="Title"><input defaultValue={data.title as string} onChange={(e) => onChange({ title: e.target.value })} className="input-field" /></Field>
        <Field label="Subtitle"><input defaultValue={data.subtitle as string} onChange={(e) => onChange({ subtitle: e.target.value })} className="input-field" /></Field>
        <div className="space-y-2">
          {cards.map((card, i) => (
            <div key={i} className="flex gap-2  rounded-xl border border-border bg-background p-3">
              <input defaultValue={card.icon} onChange={(e) => { const c = [...cards]; c[i] = { ...c[i], icon: e.target.value }; onChange({ cards: c }); }} className="input-field w-28" placeholder="Icon" />
              <input defaultValue={card.title} onChange={(e) => { const c = [...cards]; c[i] = { ...c[i], title: e.target.value }; onChange({ cards: c }); }} className="input-field w-32" placeholder="Title" />
              <input defaultValue={card.description} onChange={(e) => { const c = [...cards]; c[i] = { ...c[i], description: e.target.value }; onChange({ cards: c }); }} className="input-field flex-1" placeholder="Description" />
              <button onClick={() => onChange({ cards: cards.filter((_, idx) => idx !== i) })} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ cards: [...cards, { icon: 'FileText', title: 'New Feature', description: 'Description' }] })} className="text-sm text-primary hover:underline">+ Add card</button>
        </div>
      </div>
    );
  }

  if (block.type === 'how_it_works') {
    const steps = (data.steps as Array<{ title: string; description: string }>) || [];
    return (
      <div className="space-y-3">
        <Field label="Title"><input defaultValue={data.title as string} onChange={(e) => onChange({ title: e.target.value })} className="input-field" /></Field>
        <Field label="Subtitle"><input defaultValue={data.subtitle as string} onChange={(e) => onChange({ subtitle: e.target.value })} className="input-field" /></Field>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2  rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 items-center justify-center  bg-secondary font-mono text-2xs font-semibold text-secondary-foreground">{i + 1}</span>
              <input defaultValue={step.title} onChange={(e) => { const s = [...steps]; s[i] = { ...s[i], title: e.target.value }; onChange({ steps: s }); }} className="input-field w-40" placeholder="Step title" />
              <input defaultValue={step.description} onChange={(e) => { const s = [...steps]; s[i] = { ...s[i], description: e.target.value }; onChange({ steps: s }); }} className="input-field flex-1" placeholder="Description" />
              <button onClick={() => onChange({ steps: steps.filter((_, idx) => idx !== i) })} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ steps: [...steps, { title: 'New Step', description: 'Description' }] })} className="text-sm text-primary hover:underline">+ Add step</button>
        </div>
      </div>
    );
  }

  if (block.type === 'stats' || block.type === 'testimonials' || block.type === 'faq_accordion' || block.type === 'pricing_table' || block.type === 'contact_form') {
    return (
      <div className="space-y-3">
        <Field label="Title"><input defaultValue={data.title as string} onChange={(e) => onChange({ title: e.target.value })} className="input-field" /></Field>
        <Field label="Subtitle"><input defaultValue={data.subtitle as string} onChange={(e) => onChange({ subtitle: e.target.value })} className="input-field" /></Field>
        <p className="text-xs text-muted-foreground">This block pulls content from the CMS content management sections (testimonials, statistics, pricing, FAQ).</p>
      </div>
    );
  }

  if (block.type === 'spacer') {
    return <Field label="Height (px)"><input type="number" defaultValue={data.height as number} onChange={(e) => onChange({ height: parseInt(e.target.value, 10) || 48 })} className="input-field w-32" /></Field>;
  }

  return <p className="text-sm text-muted-foreground">No editor available for this block type.</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
