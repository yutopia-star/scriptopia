/*
# WhittleScript — Public Website CMS Schema

1. Purpose
   Database-driven content management for the entire public website. Admins can
   create/edit/publish/hide pages, manage navigation, edit homepage sections,
   control SEO, and manage testimonials/stats/pricing/FAQ — all without
   touching code. Every page is rendered dynamically from stored content blocks.

2. Enums
   - page_status: 'draft' | 'published' | 'hidden' | 'archived'
   - page_template: 'landing' | 'standard' | 'marketing' | 'contact' | 'legal' | 'blank'
   - block_type: content block kinds (hero, rich_text, feature_grid, stats,
     testimonials, cta_banner, faq_accordion, pricing_table, philosophy,
     how_it_works, image, video, divider, spacer, contact_form)
   - nav_location: 'header' | 'footer'
   - enquiry_type: 'general' | 'support' | 'partnership' | 'media'

3. New Tables
   - site_settings: singleton row for global site config.
   - pages: every public page. slug, template, status, SEO, nav visibility.
   - page_versions: full version history of page content (JSONB blocks).
   - navigation: ordered header/footer links.
   - testimonials: reusable testimonial cards.
   - site_statistics: animated counter values.
   - pricing_plans: pricing cards with features and status.
   - faq_entries: FAQ questions/answers.
   - contact_enquiries: submissions from the contact form.

4. Security
   - RLS on every table.
   - Public content readable by anon + authenticated.
   - Contact enquiries: anon can INSERT; only authenticated can SELECT.
   - All writes restricted to authenticated.

5. Notes
   - Page content stored as JSONB array of block objects in page_versions.
   - Navigation sort_order is real to allow insert-between reordering.
*/

-- ---- Enums ----
DO $$ BEGIN
  CREATE TYPE page_status AS ENUM ('draft', 'published', 'hidden', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE page_template AS ENUM ('landing', 'standard', 'marketing', 'contact', 'legal', 'blank');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE block_type AS ENUM (
    'hero', 'rich_text', 'feature_grid', 'stats', 'testimonials',
    'cta_banner', 'faq_accordion', 'pricing_table', 'philosophy',
    'how_it_works', 'image', 'video', 'divider', 'spacer', 'contact_form'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE nav_location AS ENUM ('header', 'footer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enquiry_type AS ENUM ('general', 'support', 'partnership', 'media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- site_settings (singleton) ----
CREATE TABLE IF NOT EXISTS site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  site_name text NOT NULL DEFAULT 'WhittleScript',
  site_tagline text,
  default_seo_title text,
  default_meta_description text,
  default_og_image_url text,
  social_twitter text,
  social_linkedin text,
  social_instagram text,
  social_youtube text,
  newsletter_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_read" ON site_settings;
CREATE POLICY "site_settings_read" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_update" ON site_settings;
CREATE POLICY "site_settings_update" ON site_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ---- pages ----
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  template page_template NOT NULL DEFAULT 'standard',
  status page_status NOT NULL DEFAULT 'draft',
  nav_label text,
  nav_visible boolean NOT NULL DEFAULT true,
  footer_visible boolean NOT NULL DEFAULT false,
  seo_title text,
  meta_description text,
  canonical_url text,
  og_image_url text,
  robots_index boolean NOT NULL DEFAULT true,
  page_icon text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pages_read_published" ON pages;
CREATE POLICY "pages_read_published" ON pages FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "pages_read_all_admin" ON pages;
CREATE POLICY "pages_read_all_admin" ON pages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "pages_insert" ON pages;
CREATE POLICY "pages_insert" ON pages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pages_update" ON pages;
CREATE POLICY "pages_update" ON pages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pages_delete" ON pages;
CREATE POLICY "pages_delete" ON pages FOR DELETE
  TO authenticated USING (true);

-- ---- page_versions ----
CREATE TABLE IF NOT EXISTS page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (page_id, version_number)
);

ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_versions_read_published" ON page_versions;
CREATE POLICY "page_versions_read_published" ON page_versions FOR SELECT
  TO anon, authenticated USING (is_published = true OR is_current = true);

DROP POLICY IF EXISTS "page_versions_read_all" ON page_versions;
CREATE POLICY "page_versions_read_all" ON page_versions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "page_versions_insert" ON page_versions;
CREATE POLICY "page_versions_insert" ON page_versions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "page_versions_update" ON page_versions;
CREATE POLICY "page_versions_update" ON page_versions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "page_versions_delete" ON page_versions;
CREATE POLICY "page_versions_delete" ON page_versions FOR DELETE
  TO authenticated USING (true);

-- ---- navigation ----
CREATE TABLE IF NOT EXISTS navigation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  location nav_location NOT NULL DEFAULT 'header',
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  external_url text,
  sort_order real NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE navigation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nav_read" ON navigation;
CREATE POLICY "nav_read" ON navigation FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "nav_insert" ON navigation;
CREATE POLICY "nav_insert" ON navigation FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "nav_update" ON navigation;
CREATE POLICY "nav_update" ON navigation FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "nav_delete" ON navigation;
CREATE POLICY "nav_delete" ON navigation FOR DELETE
  TO authenticated USING (true);

-- ---- testimonials ----
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_role text,
  author_company text,
  avatar_url text,
  quote text NOT NULL,
  rating integer DEFAULT 5,
  sort_order real NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonials_read" ON testimonials;
CREATE POLICY "testimonials_read" ON testimonials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "testimonials_insert" ON testimonials;
CREATE POLICY "testimonials_insert" ON testimonials FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "testimonials_update" ON testimonials;
CREATE POLICY "testimonials_update" ON testimonials FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "testimonials_delete" ON testimonials;
CREATE POLICY "testimonials_delete" ON testimonials FOR DELETE
  TO authenticated USING (true);

-- ---- site_statistics ----
CREATE TABLE IF NOT EXISTS site_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  suffix text,
  icon text,
  sort_order real NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stats_read" ON site_statistics;
CREATE POLICY "stats_read" ON site_statistics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "stats_insert" ON site_statistics;
CREATE POLICY "stats_insert" ON site_statistics FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stats_update" ON site_statistics;
CREATE POLICY "stats_update" ON site_statistics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stats_delete" ON site_statistics;
CREATE POLICY "stats_delete" ON site_statistics FOR DELETE
  TO authenticated USING (true);

-- ---- pricing_plans ----
CREATE TABLE IF NOT EXISTS pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10, 2),
  price_yearly numeric(10, 2),
  currency text NOT NULL DEFAULT 'USD',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_label text NOT NULL DEFAULT 'Get Started',
  cta_url text NOT NULL DEFAULT '/create-account',
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  sort_order real NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_read" ON pricing_plans;
CREATE POLICY "pricing_read" ON pricing_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pricing_insert" ON pricing_plans;
CREATE POLICY "pricing_insert" ON pricing_plans FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pricing_update" ON pricing_plans;
CREATE POLICY "pricing_update" ON pricing_plans FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pricing_delete" ON pricing_plans;
CREATE POLICY "pricing_delete" ON pricing_plans FOR DELETE
  TO authenticated USING (true);

-- ---- faq_entries ----
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  sort_order real NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_read" ON faq_entries;
CREATE POLICY "faq_read" ON faq_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "faq_insert" ON faq_entries;
CREATE POLICY "faq_insert" ON faq_entries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "faq_update" ON faq_entries;
CREATE POLICY "faq_update" ON faq_entries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "faq_delete" ON faq_entries;
CREATE POLICY "faq_delete" ON faq_entries FOR DELETE
  TO authenticated USING (true);

-- ---- contact_enquiries ----
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  enquiry_type enquiry_type NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquiries_insert" ON contact_enquiries;
CREATE POLICY "enquiries_insert" ON contact_enquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "enquiries_read" ON contact_enquiries;
CREATE POLICY "enquiries_read" ON contact_enquiries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "enquiries_update" ON contact_enquiries;
CREATE POLICY "enquiries_update" ON contact_enquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "enquiries_delete" ON contact_enquiries;
CREATE POLICY "enquiries_delete" ON contact_enquiries FOR DELETE
  TO authenticated USING (true);

-- ---- Triggers ----
DROP TRIGGER IF EXISTS site_settings_touch ON site_settings;
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS pages_touch ON pages;
CREATE TRIGGER pages_touch BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS navigation_touch ON navigation;
CREATE TRIGGER navigation_touch BEFORE UPDATE ON navigation
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS testimonials_touch ON testimonials;
CREATE TRIGGER testimonials_touch BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS stats_touch ON site_statistics;
CREATE TRIGGER stats_touch BEFORE UPDATE ON site_statistics
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS pricing_touch ON pricing_plans;
CREATE TRIGGER pricing_touch BEFORE UPDATE ON pricing_plans
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS faq_touch ON faq_entries;
CREATE TRIGGER faq_touch BEFORE UPDATE ON faq_entries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS enquiries_touch ON contact_enquiries;
CREATE TRIGGER enquiries_touch BEFORE UPDATE ON contact_enquiries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---- Indexes ----
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_page_versions_page ON page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_current ON page_versions(page_id, is_current);
CREATE INDEX IF NOT EXISTS idx_nav_location ON navigation(location, sort_order);
