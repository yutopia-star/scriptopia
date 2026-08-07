/*
# WhittleScript — Phase 3A: Notifications, User Settings, Achievements

1. Purpose
   Support the authenticated member experience: notifications, per-user
   settings (notifications, privacy, appearance), reader achievements, and
   role enrollment tracking for "add additional roles" from settings.

2. New Tables
   - notifications: per-user notifications with type, read/unread/archived
     state, title, body, and optional link.
   - user_settings: per-user settings singleton. Controls email/in-app/
     marketing notification preferences, privacy visibility, industry
     introduction consent, review reminders, and producer contact requests.
   - achievements: catalog of reader achievements (name, description, icon,
     threshold type and value).
   - user_achievements: earned achievements per user (earned_at timestamp).
   - role_enrollments: tracks when a user enrolled in each role, supporting
     the "add additional roles" feature. This is separate from user_roles
     so we can track enrollment metadata without conflating it with the
     active-role flag.

3. Security
   - RLS on every table.
   - notifications: owner-scoped CRUD (auth.uid = user_id).
   - user_settings: owner-scoped SELECT/INSERT/UPDATE. No DELETE.
   - achievements: readable by all authenticated (catalog). No INSERT/UPDATE/
     DELETE from the client — managed by the server/edge functions.
   - user_achievements: owner can SELECT. INSERT/UPDATE/DELETE restricted to
     authenticated (server-side awarding).
   - role_enrollments: owner-scoped CRUD.

4. Notes
   - user_settings has a single row per user (PK = user_id).
   - notifications support types: system, account, reviews, screenplays,
     industry_requests, announcements.
   - Default user_settings row is created via trigger when a profile is
     inserted (or lazily by the frontend).
*/

-- ---- notifications ----
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, is_archived);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- ---- user_settings ----
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  in_app_notifications boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false,
  review_reminders boolean NOT NULL DEFAULT true,
  producer_contact_requests boolean NOT NULL DEFAULT true,
  profile_visibility text NOT NULL DEFAULT 'public',
  allow_industry_introductions boolean NOT NULL DEFAULT true,
  theme_preference text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON user_settings;
CREATE POLICY "settings_select_own" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_insert_own" ON user_settings;
CREATE POLICY "settings_insert_own" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_update_own" ON user_settings;
CREATE POLICY "settings_update_own" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- achievements ----
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Award',
  threshold_type text NOT NULL DEFAULT 'reviews_count',
  threshold_value integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_read" ON achievements;
CREATE POLICY "achievements_read" ON achievements FOR SELECT
  TO authenticated USING (true);

-- ---- user_achievements ----
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ua_select_own" ON user_achievements;
CREATE POLICY "ua_select_own" ON user_achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ua_insert_own" ON user_achievements;
CREATE POLICY "ua_insert_own" ON user_achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ua_delete_own" ON user_achievements;
CREATE POLICY "ua_delete_own" ON user_achievements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- role_enrollments ----
CREATE TABLE IF NOT EXISTS role_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE role_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "re_select_own" ON role_enrollments;
CREATE POLICY "re_select_own" ON role_enrollments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "re_insert_own" ON role_enrollments;
CREATE POLICY "re_insert_own" ON role_enrollments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "re_delete_own" ON role_enrollments;
CREATE POLICY "re_delete_own" ON role_enrollments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- Triggers ----
DROP TRIGGER IF EXISTS notif_touch ON notifications;
CREATE TRIGGER notif_touch BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS settings_touch ON user_settings;
CREATE TRIGGER settings_touch BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Auto-create user_settings when a profile is inserted
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_create_settings ON profiles;
CREATE TRIGGER profiles_create_settings AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();

-- ---- Seed achievements ----
INSERT INTO achievements (name, description, icon, threshold_type, threshold_value, sort_order) VALUES
('First Review', 'Complete your first screenplay review', 'Award', 'reviews_count', 1, 1),
('Getting Started', 'Complete 5 screenplay reviews', 'Award', 'reviews_count', 5, 2),
('Dedicated Reader', 'Complete 10 screenplay reviews', 'Award', 'reviews_count', 10, 3),
('Seasoned Reviewer', 'Complete 25 screenplay reviews', 'Award', 'reviews_count', 25, 4),
('Master Reviewer', 'Complete 50 screenplay reviews', 'Award', 'reviews_count', 50, 5),
('Streak Keeper', 'Maintain a 7-day reading streak', 'Flame', 'reading_streak', 7, 6),
('Unstoppable', 'Maintain a 30-day reading streak', 'Flame', 'reading_streak', 30, 7),
('Trusted Voice', 'Reach a reputation score of 100', 'Star', 'reputation_score', 100, 8),
('Respected Critic', 'Reach a reputation score of 500', 'Star', 'reputation_score', 500, 9)
ON CONFLICT DO NOTHING;

-- ---- Seed role enrollments for existing test accounts ----
INSERT INTO role_enrollments (user_id, role)
SELECT u.id, p.active_role
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email IN ('writer@test.com', 'reader@test.com', 'industry@test.com', 'admin@test.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- ---- Seed user_settings for existing test accounts ----
INSERT INTO user_settings (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- ---- Seed sample notifications for test accounts ----
INSERT INTO notifications (user_id, type, title, body, link)
SELECT id, 'system', 'Welcome to WhittleScript', 'Your account is set up and ready to go. Explore your dashboard to get started.', '/app'
FROM profiles
WHERE email IN ('writer@test.com', 'reader@test.com', 'industry@test.com', 'admin@test.com')
ON CONFLICT DO NOTHING;
