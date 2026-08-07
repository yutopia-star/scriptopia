/*
# WhittleScript — Phase 3B: Writer Workspace Schema

1. Purpose
   Screenplay management for writers: upload, revisions, status lifecycle,
   submission credits, and activity tracking. Designed so reader assignment,
   reading sessions, reviews, and engagement analytics can plug in later
   without refactoring.

2. New Tables
   - platform_settings: singleton config (max upload size, credits per
     submission, etc). Editable from admin.
   - screenplays: top-level screenplay entity owned by a writer.
   - screenplay_versions: individual drafts/revisions of a screenplay. Only
     one is active at a time for reader review. Stores PDF path, page count,
     draft number, and metadata.
   - submission_credits: per-user credit balance. One row per user.
   - credit_transactions: ledger of credit earned/spent.
   - screenplay_activity: event timeline per screenplay and per writer.
   - screenplay_status_history: audit trail of status transitions.

3. Enums
   - screenplay_format: 'feature' | 'tv_pilot' | 'short_film'
   - screenplay_status: 'draft' | 'submitted' | 'awaiting_assignment' |
     'in_review' | 'validated' | 'producer_visible' | 'archived' | 'hidden'

4. Security
   - RLS on every table.
   - screenplays: owner-scoped CRUD (auth.uid = writer_id).
   - screenplay_versions: owner-scoped via screenplay join.
   - submission_credits: owner-scoped SELECT/UPDATE.
   - credit_transactions: owner-scoped SELECT, INSERT by owner.
   - screenplay_activity: owner-scoped SELECT, INSERT by owner.
   - screenplay_status_history: owner-scoped SELECT, INSERT by owner.
   - platform_settings: readable by all authenticated, writable by
     authenticated (admin-managed).

5. Future Integration Points
   - screenplay_versions.id will be referenced by reader_assignments,
     reading_sessions, reviews, and engagement_events in later phases.
   - screenplay_status transitions will be driven by the engagement engine
     and reader assignment system.
   - credit_transactions supports both earning (from reviews) and spending
     (from submissions).
*/

-- ---- Enums ----
DO $$ BEGIN
  CREATE TYPE screenplay_format AS ENUM ('feature', 'tv_pilot', 'short_film');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE screenplay_status AS ENUM (
    'draft', 'submitted', 'awaiting_assignment', 'in_review',
    'validated', 'producer_visible', 'archived', 'hidden'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- platform_settings (singleton) ----
CREATE TABLE IF NOT EXISTS platform_settings (
  id integer PRIMARY KEY DEFAULT 1,
  max_upload_size_mb integer NOT NULL DEFAULT 50,
  credits_per_new_user integer NOT NULL DEFAULT 3,
  credits_per_submission integer NOT NULL DEFAULT 1,
  credits_per_review integer NOT NULL DEFAULT 1,
  supported_formats text[] NOT NULL DEFAULT ARRAY['pdf'],
  supported_languages text[] NOT NULL DEFAULT ARRAY['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Mandarin', 'Hindi', 'Arabic', 'Other'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_read" ON platform_settings;
CREATE POLICY "platform_settings_read" ON platform_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "platform_settings_update" ON platform_settings;
CREATE POLICY "platform_settings_update" ON platform_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ---- screenplays ----
CREATE TABLE IF NOT EXISTS screenplays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  logline text,
  genre text NOT NULL DEFAULT 'Drama',
  format screenplay_format NOT NULL DEFAULT 'feature',
  estimated_budget text,
  language text NOT NULL DEFAULT 'English',
  country text NOT NULL DEFAULT 'United States',
  draft_number integer NOT NULL DEFAULT 1,
  status screenplay_status NOT NULL DEFAULT 'draft',
  page_count integer,
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE screenplays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "screenplays_select_own" ON screenplays;
CREATE POLICY "screenplays_select_own" ON screenplays FOR SELECT
  TO authenticated USING (auth.uid() = writer_id AND is_deleted = false);

DROP POLICY IF EXISTS "screenplays_insert_own" ON screenplays;
CREATE POLICY "screenplays_insert_own" ON screenplays FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = writer_id);

DROP POLICY IF EXISTS "screenplays_update_own" ON screenplays;
CREATE POLICY "screenplays_update_own" ON screenplays FOR UPDATE
  TO authenticated USING (auth.uid() = writer_id) WITH CHECK (auth.uid() = writer_id);

DROP POLICY IF EXISTS "screenplays_delete_own" ON screenplays;
CREATE POLICY "screenplays_delete_own" ON screenplays FOR DELETE
  TO authenticated USING (auth.uid() = writer_id);

CREATE INDEX IF NOT EXISTS idx_screenplays_writer ON screenplays(writer_id);
CREATE INDEX IF NOT EXISTS idx_screenplays_status ON screenplays(status);

-- ---- screenplay_versions ----
CREATE TABLE IF NOT EXISTS screenplay_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  draft_number integer NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  page_count integer,
  is_active boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  UNIQUE (screenplay_id, draft_number)
);

ALTER TABLE screenplay_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "versions_select_own" ON screenplay_versions;
CREATE POLICY "versions_select_own" ON screenplay_versions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid() AND s.is_deleted = false)
  );

DROP POLICY IF EXISTS "versions_insert_own" ON screenplay_versions;
CREATE POLICY "versions_insert_own" ON screenplay_versions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid())
  );

DROP POLICY IF EXISTS "versions_update_own" ON screenplay_versions;
CREATE POLICY "versions_update_own" ON screenplay_versions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid())
  );

DROP POLICY IF EXISTS "versions_delete_own" ON screenplay_versions;
CREATE POLICY "versions_delete_own" ON screenplay_versions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_versions_screenplay ON screenplay_versions(screenplay_id);
CREATE INDEX IF NOT EXISTS idx_versions_active ON screenplay_versions(screenplay_id, is_active);

-- ---- submission_credits ----
CREATE TABLE IF NOT EXISTS submission_credits (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE submission_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credits_select_own" ON submission_credits;
CREATE POLICY "credits_select_own" ON submission_credits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "credits_insert_own" ON submission_credits;
CREATE POLICY "credits_insert_own" ON submission_credits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "credits_update_own" ON submission_credits;
CREATE POLICY "credits_update_own" ON submission_credits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- credit_transactions ----
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL DEFAULT 'earned',
  reason text,
  screenplay_id uuid REFERENCES screenplays(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_select_own" ON credit_transactions;
CREATE POLICY "ct_select_own" ON credit_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ct_insert_own" ON credit_transactions;
CREATE POLICY "ct_insert_own" ON credit_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ct_user ON credit_transactions(user_id, created_at DESC);

-- ---- screenplay_activity ----
CREATE TABLE IF NOT EXISTS screenplay_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  screenplay_id uuid REFERENCES screenplays(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE screenplay_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select_own" ON screenplay_activity;
CREATE POLICY "activity_select_own" ON screenplay_activity FOR SELECT
  TO authenticated USING (auth.uid() = writer_id);

DROP POLICY IF EXISTS "activity_insert_own" ON screenplay_activity;
CREATE POLICY "activity_insert_own" ON screenplay_activity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = writer_id);

CREATE INDEX IF NOT EXISTS idx_activity_writer ON screenplay_activity(writer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_screenplay ON screenplay_activity(screenplay_id);

-- ---- screenplay_status_history ----
CREATE TABLE IF NOT EXISTS screenplay_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  from_status screenplay_status,
  to_status screenplay_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

ALTER TABLE screenplay_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sh_select_own" ON screenplay_status_history;
CREATE POLICY "sh_select_own" ON screenplay_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid())
  );

DROP POLICY IF EXISTS "sh_insert_own" ON screenplay_status_history;
CREATE POLICY "sh_insert_own" ON screenplay_status_history FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM screenplays s WHERE s.id = screenplay_id AND s.writer_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_sh_screenplay ON screenplay_status_history(screenplay_id, changed_at DESC);

-- ---- Triggers ----
DROP TRIGGER IF EXISTS screenplays_touch ON screenplays;
CREATE TRIGGER screenplays_touch BEFORE UPDATE ON screenplays
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS credits_touch ON submission_credits;
CREATE TRIGGER credits_touch BEFORE UPDATE ON submission_credits
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS platform_settings_touch ON platform_settings;
CREATE TRIGGER platform_settings_touch BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Auto-create submission_credits when a profile is inserted
CREATE OR REPLACE FUNCTION create_default_credits()
RETURNS trigger AS $$
BEGIN
  INSERT INTO submission_credits (user_id, balance)
  VALUES (NEW.id, (SELECT credits_per_new_user FROM platform_settings WHERE id = 1))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_create_credits ON profiles;
CREATE TRIGGER profiles_create_credits AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_credits();

-- ---- Seed platform_settings ----
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---- Seed submission_credits for existing test accounts ----
INSERT INTO submission_credits (user_id, balance)
SELECT p.id, 3
FROM profiles p
WHERE p.active_role = 'writer'
  AND p.id NOT IN (SELECT user_id FROM submission_credits)
ON CONFLICT (user_id) DO NOTHING;

-- ---- Seed credit_transactions for existing test accounts ----
INSERT INTO credit_transactions (user_id, amount, type, reason)
SELECT user_id, 3, 'earned', 'New account bonus'
FROM submission_credits
WHERE user_id NOT IN (SELECT user_id FROM credit_transactions)
ON CONFLICT DO NOTHING;
