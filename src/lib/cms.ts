import { supabase } from '@/lib/supabase';
import type {
  CmsPage, PageVersion, NavItem, Testimonial, SiteStat,
  PricingPlan, FaqEntry, SiteSettings, ContactEnquiry, ContentBlock,
} from '@/types/database';

export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  return data as SiteSettings | null;
}

export async function fetchPageBySlug(slug: string): Promise<{ page: CmsPage; version: PageVersion } | null> {
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!page) return null;

  const { data: version } = await supabase
    .from('page_versions')
    .select('*')
    .eq('page_id', page.id)
    .eq('is_current', true)
    .maybeSingle();
  if (!version) return null;

  return { page: page as CmsPage, version: version as PageVersion };
}

export async function fetchAllPages(): Promise<CmsPage[]> {
  const { data } = await supabase
    .from('pages')
    .select('*')
    .order('updated_at', { ascending: false });
  return (data ?? []) as CmsPage[];
}

export async function fetchPageWithVersions(pageId: string): Promise<{ page: CmsPage; versions: PageVersion[] } | null> {
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .maybeSingle();
  if (!page) return null;

  const { data: versions } = await supabase
    .from('page_versions')
    .select('*')
    .eq('page_id', pageId)
    .order('version_number', { ascending: false });

  return { page: page as CmsPage, versions: (versions ?? []) as PageVersion[] };
}

export async function fetchNavigation(location?: 'header' | 'footer'): Promise<Array<NavItem & { page_slug: string | null }>> {
  let query = supabase.from('navigation').select('*, pages(slug)');
  if (location) query = query.eq('location', location);
  const { data } = await query.order('sort_order', { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    location: row.location,
    page_id: row.page_id,
    external_url: row.external_url,
    sort_order: row.sort_order,
    is_visible: row.is_visible,
    created_at: row.created_at,
    updated_at: row.updated_at,
    page_slug: row.pages?.slug ?? null,
  }));
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as Testimonial[];
}

export async function fetchAllTestimonials(): Promise<Testimonial[]> {
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as Testimonial[];
}

export async function fetchStats(): Promise<SiteStat[]> {
  const { data } = await supabase
    .from('site_statistics')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as SiteStat[];
}

export async function fetchAllStats(): Promise<SiteStat[]> {
  const { data } = await supabase
    .from('site_statistics')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as SiteStat[];
}

export async function fetchPricingPlans(): Promise<PricingPlan[]> {
  const { data } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as PricingPlan[];
}

export async function fetchAllPricingPlans(): Promise<PricingPlan[]> {
  const { data } = await supabase
    .from('pricing_plans')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as PricingPlan[];
}

export async function fetchFaqEntries(): Promise<FaqEntry[]> {
  const { data } = await supabase
    .from('faq_entries')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as FaqEntry[];
}

export async function fetchAllFaqEntries(): Promise<FaqEntry[]> {
  const { data } = await supabase
    .from('faq_entries')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as FaqEntry[];
}

export async function fetchContactEnquiries(): Promise<ContactEnquiry[]> {
  const { data } = await supabase
    .from('contact_enquiries')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as ContactEnquiry[];
}

export async function submitContactEnquiry(enquiry: {
  name: string;
  email: string;
  subject: string;
  message: string;
  enquiry_type: string;
}): Promise<boolean> {
  const { error } = await supabase.from('contact_enquiries').insert(enquiry);
  return !error;
}

export async function savePageVersion(pageId: string, blocks: ContentBlock[], publish: boolean): Promise<PageVersion | null> {
  const { count } = await supabase
    .from('page_versions')
    .select('*', { count: 'exact', head: true })
    .eq('page_id', pageId);
  const nextVersion = (count ?? 0) + 1;

  if (publish) {
    await supabase
      .from('page_versions')
      .update({ is_current: false })
      .eq('page_id', pageId)
      .eq('is_current', true);
  }

  const { data, error } = await supabase
    .from('page_versions')
    .insert({
      page_id: pageId,
      version_number: nextVersion,
      blocks: JSON.parse(JSON.stringify(blocks)),
      is_published: publish,
      is_current: publish,
      published_at: publish ? new Date().toISOString() : null,
    })
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PageVersion | null;
}

export async function restorePageVersion(versionId: string, pageId: string): Promise<void> {
  const { data: version } = await supabase
    .from('page_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle();
  if (!version) return;

  await supabase
    .from('page_versions')
    .update({ is_current: false })
    .eq('page_id', pageId)
    .eq('is_current', true);

  const { count } = await supabase
    .from('page_versions')
    .select('*', { count: 'exact', head: true })
    .eq('page_id', pageId);
  const nextVersion = (count ?? 0) + 1;

  await supabase.from('page_versions').insert({
    page_id: pageId,
    version_number: nextVersion,
    blocks: version.blocks,
    is_published: true,
    is_current: true,
    published_at: new Date().toISOString(),
  });
}
