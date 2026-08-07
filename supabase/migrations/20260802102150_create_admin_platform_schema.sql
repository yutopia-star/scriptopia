/*
# Phase 7 — Administration, Platform Management & CMS

## Overview
Creates the database schema for the full administration platform. All platform
configuration, feature flags, moderation, forms, notifications, audit logs,
theme settings, and system settings are database-backed — no code changes needed
to operate the platform.

## New Tables

1. `platform_config` — Central configuration (reviews required, max submissions,
   milestone pages, upload limits, discovery thresholds, AI/human weighting,
   industry verification requirements). Single-row table like platform_discovery_config.
2. `feature_flags` — Feature on/off toggles for AI Insights, Revision History,
   Reader Reputation, Submission Credits, Producer Discovery, Industry Verification,
   Notifications, Marketplace, Competitions, Achievements, Watchlists, Contact Requests.
3. `moderation_reports` — Report-based moderation. Reports can be filed against
   screenplays, reviews, comments, or users. No approval queues.
4. `admin_announcements` — Site announcements, maintenance messages, system alerts.
   Supports scheduling and audience targeting.
5. `audit_logs` — Immutable record of administrator actions. Never editable.
6. `form_configs` — Customisable form field configurations for registration,
   industry registration, screenplay upload, contact, introduction requests,
   and verification forms.
7. `theme_settings` — Centralised theme values (colours, typography, status colours,
   chart colours). Single-row table.
8. `system_settings` — Platform-wide settings (platform name, logo, favicon,
   support email, maintenance mode, registration settings, etc.). Single-row table.

## Security
- All tables have RLS enabled.
- Admin-only access via user_roles check (role = 'admin', is_active = true).
- Audit logs are insert-only (no update/delete policies).
- All other tables allow admin CRUD.

## Important Notes
1. All configuration is database-backed — no hard-coded settings.
2. Feature flags use a simple boolean toggle per feature name.
3. Moderation is report-driven — no approval queues.
4. Audit logs are append-only and never editable.
5. Theme and system settings are single-row tables enforced by CHECK constraint.
*/

-- ============================================================
-- 1. PLATFORM CONFIG (central configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_config (
  id integer PRIMARY KEY DEFAULT 1,
  reviews_required_per_submission integer NOT NULL DEFAULT 3,
  max_active_submissions integer NOT NULL DEFAULT 5,
  reader_milestone_pages integer[] NOT NULL DEFAULT '{3,10,15,45}'::integer[],
  max_upload_size_mb integer NOT NULL DEFAULT 10,
  supported_file_types text[] NOT NULL DEFAULT '{pdf}'::text[],
  min_readers_for_discovery integer NOT NULL DEFAULT 3,
  min_completed_reviews_for_discovery integer NOT NULL DEFAULT 2,
  min_confidence_level text NOT NULL DEFAULT 'medium' CHECK (min_confidence_level IN ('low','medium','high')),
  human_weighting numeric NOT NULL DEFAULT 0.7 CHECK (human_weighting >= 0 AND human_weighting <= 1),
  ai_weighting numeric NOT NULL DEFAULT 0.3 CHECK (ai_weighting >= 0 AND ai_weighting <= 1),
  industry_verification_required boolean NOT NULL DEFAULT true,
  industry_min_reviews_for_verification integer NOT NULL DEFAULT 5,
  auto_validate_screenplays boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO platform_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_platform_config" ON platform_config;
CREATE POLICY "select_platform_config" ON platform_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_platform_config" ON platform_config;
CREATE POLICY "update_platform_config" ON platform_config FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- ============================================================
-- 2. FEATURE FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_feature_flags" ON feature_flags;
CREATE POLICY "select_feature_flags" ON feature_flags FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_feature_flags" ON feature_flags;
CREATE POLICY "insert_feature_flags" ON feature_flags FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "update_feature_flags" ON feature_flags;
CREATE POLICY "update_feature_flags" ON feature_flags FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "delete_feature_flags" ON feature_flags;
CREATE POLICY "delete_feature_flags" ON feature_flags FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- Seed default feature flags
INSERT INTO feature_flags (feature_key, feature_name, description, is_enabled, category) VALUES
  ('ai_insights', 'AI Insights', 'AI-generated summaries from reader feedback', true, 'reader'),
  ('revision_history', 'Revision History', 'Track and compare screenplay revisions', true, 'writer'),
  ('reader_reputation', 'Reader Reputation', 'Behaviour-based reader profiling', true, 'reader'),
  ('submission_credits', 'Submission Credits', 'Earn upload credits through reading', true, 'reader'),
  ('producer_discovery', 'Producer Discovery', 'Industry members can discover screenplays', true, 'industry'),
  ('industry_verification', 'Industry Verification', 'Verify industry professional accounts', true, 'industry'),
  ('notifications', 'Notifications', 'In-app notification system', true, 'platform'),
  ('marketplace', 'Marketplace', 'Buy and sell screenplays', false, 'future'),
  ('competitions', 'Competitions', 'Screenwriting competitions', false, 'future'),
  ('achievements', 'Achievements', 'Reader achievement badges', true, 'reader'),
  ('watchlists', 'Watchlists', 'Industry watchlists for saving screenplays', true, 'industry'),
  ('contact_requests', 'Contact Requests', 'Introduction requests between industry and writers', true, 'industry')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- 3. MODERATION REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('screenplay','review','comment','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed','archived')),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_mod_reports_target ON moderation_reports(target_type, target_id);

ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_mod_reports" ON moderation_reports;
CREATE POLICY "select_mod_reports" ON moderation_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
    OR auth.uid() = reporter_id
  );

DROP POLICY IF EXISTS "insert_mod_reports" ON moderation_reports;
CREATE POLICY "insert_mod_reports" ON moderation_reports FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_mod_reports" ON moderation_reports;
CREATE POLICY "update_mod_reports" ON moderation_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- ============================================================
-- 4. ADMIN ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement','maintenance','alert','notification')),
  audience text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone','writers','readers','industry','admins')),
  is_active boolean NOT NULL DEFAULT true,
  is_dismissible boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  expires_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON admin_announcements(is_active);

ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_announcements" ON admin_announcements;
CREATE POLICY "select_announcements" ON admin_announcements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_announcements" ON admin_announcements;
CREATE POLICY "insert_announcements" ON admin_announcements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "update_announcements" ON admin_announcements;
CREATE POLICY "update_announcements" ON admin_announcements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "delete_announcements" ON admin_announcements;
CREATE POLICY "delete_announcements" ON admin_announcements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- ============================================================
-- 5. AUDIT LOGS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('login','settings','theme','role_change','moderation','content','feature_flag','configuration','user_management','screenplay_management','backup','security')),
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- No UPDATE or DELETE policies — audit logs are append-only.

-- ============================================================
-- 6. FORM CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS form_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key text NOT NULL UNIQUE,
  form_name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE form_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_form_configs" ON form_configs;
CREATE POLICY "select_form_configs" ON form_configs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_form_configs" ON form_configs;
CREATE POLICY "insert_form_configs" ON form_configs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "update_form_configs" ON form_configs;
CREATE POLICY "update_form_configs" ON form_configs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- Seed default form configs
INSERT INTO form_configs (form_key, form_name, fields) VALUES
  ('registration', 'User Registration', '[{"name":"username","label":"Username","type":"text","required":true,"enabled":true,"order":1},{"name":"email","label":"Email","type":"email","required":true,"enabled":true,"order":2},{"name":"password","label":"Password","type":"password","required":true,"enabled":true,"order":3},{"name":"role","label":"Account Type","type":"select","required":true,"enabled":true,"order":4}]'),
  ('industry_registration', 'Industry Registration', '[{"name":"username","label":"Username","type":"text","required":true,"enabled":true,"order":1},{"name":"email","label":"Email","type":"email","required":true,"enabled":true,"order":2},{"name":"password","label":"Password","type":"password","required":true,"enabled":true,"order":3},{"name":"account_type","label":"Account Type","type":"select","required":true,"enabled":true,"order":4},{"name":"company_name","label":"Company Name","type":"text","required":false,"enabled":true,"order":5},{"name":"job_title","label":"Job Title","type":"text","required":true,"enabled":true,"order":6}]'),
  ('screenplay_upload', 'Screenplay Upload', '[{"name":"title","label":"Title","type":"text","required":true,"enabled":true,"order":1},{"name":"logline","label":"Logline","type":"textarea","required":true,"enabled":true,"order":2},{"name":"genre","label":"Genre","type":"select","required":true,"enabled":true,"order":3},{"name":"format","label":"Format","type":"select","required":true,"enabled":true,"order":4},{"name":"country","label":"Country","type":"select","required":true,"enabled":true,"order":5},{"name":"language","label":"Language","type":"text","required":true,"enabled":true,"order":6},{"name":"estimated_budget","label":"Estimated Budget","type":"select","required":false,"enabled":true,"order":7},{"name":"file","label":"Screenplay File","type":"file","required":true,"enabled":true,"order":8}]'),
  ('contact', 'Contact Form', '[{"name":"name","label":"Name","type":"text","required":true,"enabled":true,"order":1},{"name":"email","label":"Email","type":"email","required":true,"enabled":true,"order":2},{"name":"subject","label":"Subject","type":"text","required":true,"enabled":true,"order":3},{"name":"message","label":"Message","type":"textarea","required":true,"enabled":true,"order":4}]'),
  ('introduction_request', 'Introduction Request', '[{"name":"message","label":"Message","type":"textarea","required":false,"enabled":true,"order":1}]'),
  ('verification', 'Industry Verification', '[{"name":"full_name","label":"Full Name","type":"text","required":true,"enabled":true,"order":1},{"name":"company_name","label":"Company Name","type":"text","required":true,"enabled":true,"order":2},{"name":"job_title","label":"Job Title","type":"text","required":true,"enabled":true,"order":3},{"name":"website","label":"Company Website","type":"url","required":false,"enabled":true,"order":4},{"name":"proof_documents","label":"Proof of Industry Status","type":"file","required":true,"enabled":true,"order":5}]')
ON CONFLICT (form_key) DO NOTHING;

-- ============================================================
-- 7. THEME SETTINGS (single-row)
-- ============================================================
CREATE TABLE IF NOT EXISTS theme_settings (
  id integer PRIMARY KEY DEFAULT 1,
  primary_color text NOT NULL DEFAULT '#2563eb',
  secondary_color text NOT NULL DEFAULT '#64748b',
  accent_color text NOT NULL DEFAULT '#0ea5e9',
  background_color text NOT NULL DEFAULT '#ffffff',
  card_color text NOT NULL DEFAULT '#f8fafc',
  border_color text NOT NULL DEFAULT '#e2e8f0',
  button_radius text NOT NULL DEFAULT '8px',
  font_heading text NOT NULL DEFAULT 'Inter',
  font_body text NOT NULL DEFAULT 'Inter',
  status_success text NOT NULL DEFAULT '#22c55e',
  status_warning text NOT NULL DEFAULT '#f59e0b',
  status_error text NOT NULL DEFAULT '#ef4444',
  status_info text NOT NULL DEFAULT '#3b82f6',
  chart_color_1 text NOT NULL DEFAULT '#2563eb',
  chart_color_2 text NOT NULL DEFAULT '#0ea5e9',
  chart_color_3 text NOT NULL DEFAULT '#22c55e',
  chart_color_4 text NOT NULL DEFAULT '#f59e0b',
  chart_color_5 text NOT NULL DEFAULT '#8b5cf6',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO theme_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_theme_settings" ON theme_settings;
CREATE POLICY "select_theme_settings" ON theme_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_theme_settings" ON theme_settings;
CREATE POLICY "update_theme_settings" ON theme_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- ============================================================
-- 8. SYSTEM SETTINGS (single-row)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  platform_name text NOT NULL DEFAULT 'WhittleScript',
  logo_url text,
  favicon_url text,
  support_email text NOT NULL DEFAULT 'support@whittlescript.com',
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  allow_new_registrations boolean NOT NULL DEFAULT true,
  email_verification_required boolean NOT NULL DEFAULT false,
  industry_verification_required boolean NOT NULL DEFAULT true,
  default_theme_id integer NOT NULL DEFAULT 1,
  homepage_slug text NOT NULL DEFAULT 'home',
  terms_url text,
  privacy_url text,
  cookie_policy_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_system_settings" ON system_settings;
CREATE POLICY "select_system_settings" ON system_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_system_settings" ON system_settings;
CREATE POLICY "update_system_settings" ON system_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

-- ============================================================
-- 9. ADD is_deleted TO screenplays (if not exists)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'screenplays' AND column_name = 'is_deleted') THEN
    ALTER TABLE screenplays ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 10. ADD is_deleted TO profiles (if not exists)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_deleted') THEN
    ALTER TABLE profiles ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 11. ADD is_suspended TO profiles (if not exists)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_suspended') THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 12. ADD last_active_at TO profiles (if not exists)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_active_at') THEN
    ALTER TABLE profiles ADD COLUMN last_active_at timestamptz;
  END IF;
END $$;

-- ============================================================
-- 13. TRIGGERS for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_form_configs_updated_at ON form_configs;
CREATE TRIGGER trg_form_configs_updated_at BEFORE UPDATE ON form_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON admin_announcements;
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON admin_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mod_reports_updated_at ON moderation_reports;
CREATE TRIGGER trg_mod_reports_updated_at BEFORE UPDATE ON moderation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_platform_config_updated_at ON platform_config;
CREATE TRIGGER trg_platform_config_updated_at BEFORE UPDATE ON platform_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_theme_settings_updated_at ON theme_settings;
CREATE TRIGGER trg_theme_settings_updated_at BEFORE UPDATE ON theme_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 14. HELPER: Log audit action
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_action(
  p_admin_id uuid,
  p_action text,
  p_category text DEFAULT 'general',
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (admin_id, action, category, target_type, target_id, details)
  VALUES (p_admin_id, p_action, p_category, p_target_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql;
