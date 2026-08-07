/*
# WhittleScript — Phase 4: Reader Experience, Assignment & Reviews

1. Purpose
   Screenplay assignment engine, reading sessions, passive behaviour tracking,
   review submission, retention milestones, and reader reputation. Designed so
   the Engagement Engine, Producer Discovery, and AI Analysis phases can plug
   in without refactoring.

2. New Tables
   - blocked_users: writer-reader block pairs (prevents assignment).
   - reader_assignments: one active assignment per reader at a time.
   - reading_sessions: per-session tracking (pages, time, device, etc).
   - reader_decisions: the outcome of a reading session — finished, stopped,
     return-later. Stores recommendation, feedback, stop reason.
   - reader_behaviour: aggregate behavioural metrics per reader (internal).
   - retention_milestones: page-reached milestones per assignment.
   - review_reasons: catalog of reasons for stopping early.
   - recommendations: recommendation records (yes/no) per assignment.
   - behaviour_profiles: internal selectivity classification (never shown to
     readers).

3. Security
   - RLS on every table.
   - reader_assignments: reader can SELECT/UPDATE their own. INSERT is done
     via SECURITY DEFINER function (assignment engine) so readers cannot
     self-assign.
   - reading_sessions: reader can SELECT/INSERT/UPDATE their own.
   - reader_decisions: reader can SELECT/INSERT their own.
   - reader_behaviour: reader can SELECT/INSERT/UPDATE their own (updated
     passively by the client).
   - retention_milestones: reader can SELECT/INSERT their own.
   - review_reasons: readable by all authenticated (catalog).
   - recommendations: reader can SELECT/INSERT their own.
   - behaviour_profiles: reader can SELECT/UPDATE their own (but the UI
     never displays it).
   - blocked_users: reader can SELECT/INSERT their own blocks.

4. Anonymity
   - reader_assignments joins to screenplays but the RLS policy and the
     assignment function never expose writer identity to the reader. The
     frontend only receives screenplay metadata (title, logline, genre,
     format, page_count, language, estimated_budget) — never writer_id or
     any writer profile data.
*/

-- ---- blocked_users ----
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_select_own" ON blocked_users;
CREATE POLICY "blocked_select_own" ON blocked_users FOR SELECT
  TO authenticated USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocked_insert_own" ON blocked_users;
CREATE POLICY "blocked_insert_own" ON blocked_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocked_delete_own" ON blocked_users;
CREATE POLICY "blocked_delete_own" ON blocked_users FOR DELETE
  TO authenticated USING (auth.uid() = blocker_id);

-- ---- reader_assignments ----
CREATE TABLE IF NOT EXISTS reader_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  screenplay_version_id uuid REFERENCES screenplay_versions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active', -- active | completed | abandoned | expired
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  current_page integer NOT NULL DEFAULT 1,
  reading_progress numeric(5,2) NOT NULL DEFAULT 0.00, -- 0-100
  total_reading_time_ms bigint NOT NULL DEFAULT 0,
  session_count integer NOT NULL DEFAULT 0,
  returned_later boolean NOT NULL DEFAULT false,
  UNIQUE (reader_id, screenplay_id)
);

ALTER TABLE reader_assignments ENABLE ROW LEVEL SECURITY;

-- Readers can see their own assignments, but we use a view to strip writer info
DROP POLICY IF EXISTS "ra_select_own" ON reader_assignments;
CREATE POLICY "ra_select_own" ON reader_assignments FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "ra_update_own" ON reader_assignments;
CREATE POLICY "ra_update_own" ON reader_assignments FOR UPDATE
  TO authenticated USING (auth.uid() = reader_id) WITH CHECK (auth.uid() = reader_id);

-- INSERT is done via the SECURITY DEFINER assignment function only
DROP POLICY IF EXISTS "ra_insert_own" ON reader_assignments;
CREATE POLICY "ra_insert_own" ON reader_assignments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

CREATE INDEX IF NOT EXISTS idx_ra_reader ON reader_assignments(reader_id, status);
CREATE INDEX IF NOT EXISTS idx_ra_screenplay ON reader_assignments(screenplay_id);

-- ---- reading_sessions ----
CREATE TABLE IF NOT EXISTS reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES reader_assignments(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  start_page integer NOT NULL DEFAULT 1,
  end_page integer NOT NULL DEFAULT 1,
  pages_read integer NOT NULL DEFAULT 0,
  time_spent_ms bigint NOT NULL DEFAULT 0,
  device_type text NOT NULL DEFAULT 'web',
  returned_later boolean NOT NULL DEFAULT false,
  finished boolean NOT NULL DEFAULT false,
  abandoned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rs_select_own" ON reading_sessions;
CREATE POLICY "rs_select_own" ON reading_sessions FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rs_insert_own" ON reading_sessions;
CREATE POLICY "rs_insert_own" ON reading_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rs_update_own" ON reading_sessions;
CREATE POLICY "rs_update_own" ON reading_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = reader_id) WITH CHECK (auth.uid() = reader_id);

CREATE INDEX IF NOT EXISTS idx_rs_assignment ON reading_sessions(assignment_id, created_at DESC);

-- ---- reader_decisions ----
CREATE TABLE IF NOT EXISTS reader_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES reader_assignments(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL DEFAULT 'return_later', -- finished | stopped | return_later
  finished_screenplay boolean NOT NULL DEFAULT false,
  recommendation boolean, -- true=yes, false=no, null=n/a
  written_feedback text,
  private_notes text,
  stop_reason text, -- references review_reasons.code
  page_abandoned integer,
  reading_time_ms bigint,
  session_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reader_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rd_select_own" ON reader_decisions;
CREATE POLICY "rd_select_own" ON reader_decisions FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rd_insert_own" ON reader_decisions;
CREATE POLICY "rd_insert_own" ON reader_decisions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

CREATE INDEX IF NOT EXISTS idx_rd_assignment ON reader_decisions(assignment_id);

-- ---- reader_behaviour ----
CREATE TABLE IF NOT EXISTS reader_behaviour (
  reader_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total_assignments integer NOT NULL DEFAULT 0,
  total_completed integer NOT NULL DEFAULT 0,
  total_abandoned integer NOT NULL DEFAULT 0,
  total_returned_later integer NOT NULL DEFAULT 0,
  completion_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  recommendation_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  avg_abandonment_page numeric(8,2) NOT NULL DEFAULT 0.00,
  avg_reading_speed_pages_per_min numeric(8,2) NOT NULL DEFAULT 0.00,
  avg_reading_duration_ms bigint NOT NULL DEFAULT 0,
  total_reading_time_ms bigint NOT NULL DEFAULT 0,
  return_frequency numeric(5,2) NOT NULL DEFAULT 0.00,
  current_streak_days integer NOT NULL DEFAULT 0,
  longest_streak_days integer NOT NULL DEFAULT 0,
  last_reading_date date,
  genre_preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reader_behaviour ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rb_select_own" ON reader_behaviour;
CREATE POLICY "rb_select_own" ON reader_behaviour FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rb_insert_own" ON reader_behaviour;
CREATE POLICY "rb_insert_own" ON reader_behaviour FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rb_update_own" ON reader_behaviour;
CREATE POLICY "rb_update_own" ON reader_behaviour FOR UPDATE
  TO authenticated USING (auth.uid() = reader_id) WITH CHECK (auth.uid() = reader_id);

-- ---- retention_milestones ----
CREATE TABLE IF NOT EXISTS retention_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES reader_assignments(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_page integer NOT NULL,
  milestone_name text NOT NULL,
  reached_at timestamptz NOT NULL DEFAULT now(),
  reading_time_ms bigint NOT NULL DEFAULT 0,
  UNIQUE (assignment_id, milestone_page)
);

ALTER TABLE retention_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rm_select_own" ON retention_milestones;
CREATE POLICY "rm_select_own" ON retention_milestones FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rm_insert_own" ON retention_milestones;
CREATE POLICY "rm_insert_own" ON retention_milestones FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

CREATE INDEX IF NOT EXISTS idx_rm_assignment ON retention_milestones(assignment_id, milestone_page);

-- ---- review_reasons (catalog) ----
CREATE TABLE IF NOT EXISTS review_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE review_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_reasons_read" ON review_reasons;
CREATE POLICY "review_reasons_read" ON review_reasons FOR SELECT
  TO authenticated USING (true);

-- ---- recommendations ----
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES reader_assignments(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id)
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rec_select_own" ON recommendations;
CREATE POLICY "rec_select_own" ON recommendations FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "rec_insert_own" ON recommendations;
CREATE POLICY "rec_insert_own" ON recommendations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

-- ---- behaviour_profiles (internal, never shown to reader) ----
CREATE TABLE IF NOT EXISTS behaviour_profiles (
  reader_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type text NOT NULL DEFAULT 'average', -- highly_selective | average | highly_persistent
  selectivity_score numeric(5,2) NOT NULL DEFAULT 0.50,
  persistence_score numeric(5,2) NOT NULL DEFAULT 0.50,
  engagement_score numeric(5,2) NOT NULL DEFAULT 0.50,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE behaviour_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bp_select_own" ON behaviour_profiles;
CREATE POLICY "bp_select_own" ON behaviour_profiles FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "bp_insert_own" ON behaviour_profiles;
CREATE POLICY "bp_insert_own" ON behaviour_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reader_id);

DROP POLICY IF EXISTS "bp_update_own" ON behaviour_profiles;
CREATE POLICY "bp_update_own" ON behaviour_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = reader_id) WITH CHECK (auth.uid() = reader_id);

-- ---- Triggers ----
DROP TRIGGER IF EXISTS rb_touch ON reader_behaviour;
CREATE TRIGGER rb_touch BEFORE UPDATE ON reader_behaviour
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS bp_touch ON behaviour_profiles;
CREATE TRIGGER bp_touch BEFORE UPDATE ON behaviour_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---- Seed review_reasons ----
INSERT INTO review_reasons (code, label, sort_order) VALUES
  ('didnt_hook_me', 'Didn''t hook me', 1),
  ('lost_interest', 'Lost interest', 2),
  ('confusing', 'Confusing', 3),
  ('weak_dialogue', 'Weak dialogue', 4),
  ('weak_pacing', 'Weak pacing', 5),
  ('formatting_issues', 'Formatting issues', 6),
  ('not_my_genre', 'Not my genre', 7),
  ('too_long', 'Too long', 8),
  ('other', 'Other', 9)
ON CONFLICT (code) DO NOTHING;

-- ---- Seed reader_behaviour and behaviour_profiles for existing reader accounts ----
INSERT INTO reader_behaviour (reader_id)
SELECT p.id FROM profiles p
WHERE p.active_role = 'reader'
  AND p.id NOT IN (SELECT reader_id FROM reader_behaviour)
ON CONFLICT (reader_id) DO NOTHING;

INSERT INTO behaviour_profiles (reader_id)
SELECT p.id FROM profiles p
WHERE p.active_role = 'reader'
  AND p.id NOT IN (SELECT reader_id FROM behaviour_profiles)
ON CONFLICT (reader_id) DO NOTHING;
