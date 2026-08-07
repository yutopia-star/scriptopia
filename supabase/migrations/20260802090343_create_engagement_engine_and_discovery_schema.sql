/*
# Phase 6 — Engagement Engine, Analytics & Producer Discovery

Creates the full database schema for the engagement engine, analytics platform,
and producer discovery system. All engagement metrics are derived from authentic
reader behaviour — no subjective scores or rankings are ever generated.
*/

-- ============================================================
-- 1. ENGAGEMENT REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS engagement_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  screenplay_version_id uuid NOT NULL REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_level text NOT NULL DEFAULT 'low' CHECK (confidence_level IN ('low', 'medium', 'high')),
  confidence_reasons text[] NOT NULL DEFAULT '{}'::text[],
  reader_count integer NOT NULL DEFAULT 0,
  completed_reviews integer NOT NULL DEFAULT 0,
  abandoned_reads integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screenplay_version_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_reports_screenplay ON engagement_reports(screenplay_id);
CREATE INDEX IF NOT EXISTS idx_engagement_reports_confidence ON engagement_reports(confidence_level);

ALTER TABLE engagement_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_engagement_reports" ON engagement_reports;
CREATE POLICY "select_own_engagement_reports" ON engagement_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM screenplays WHERE screenplays.id = engagement_reports.screenplay_id AND screenplays.writer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'industry' AND user_roles.is_active = true AND user_roles.verification_status = 'verified')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "insert_engagement_reports" ON engagement_reports;
CREATE POLICY "insert_engagement_reports" ON engagement_reports FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_engagement_reports" ON engagement_reports;
CREATE POLICY "update_engagement_reports" ON engagement_reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. ENGAGEMENT METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_version_id uuid NOT NULL REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metric_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screenplay_version_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_version ON engagement_metrics(screenplay_version_id);

ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_metrics" ON engagement_metrics;
CREATE POLICY "select_engagement_metrics" ON engagement_metrics FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_engagement_metrics" ON engagement_metrics;
CREATE POLICY "insert_engagement_metrics" ON engagement_metrics FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_engagement_metrics" ON engagement_metrics;
CREATE POLICY "update_engagement_metrics" ON engagement_metrics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. COMMENT THEMES
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_version_id uuid NOT NULL REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  theme_name text NOT NULL CHECK (theme_name IN ('opening', 'dialogue', 'characters', 'pacing', 'structure', 'formatting', 'ending', 'general')),
  ai_summary text,
  comment_count integer NOT NULL DEFAULT 0,
  sentiment_score numeric DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screenplay_version_id, theme_name)
);

CREATE INDEX IF NOT EXISTS idx_comment_themes_version ON comment_themes(screenplay_version_id);

ALTER TABLE comment_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_comment_themes" ON comment_themes;
CREATE POLICY "select_comment_themes" ON comment_themes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_comment_themes" ON comment_themes;
CREATE POLICY "insert_comment_themes" ON comment_themes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_comment_themes" ON comment_themes;
CREATE POLICY "update_comment_themes" ON comment_themes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. READER COMMENT THEMES (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS reader_comment_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_decision_id uuid NOT NULL REFERENCES reader_decisions(id) ON DELETE CASCADE,
  comment_theme_id uuid NOT NULL REFERENCES comment_themes(id) ON DELETE CASCADE,
  relevance_score numeric DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reader_decision_id, comment_theme_id)
);

ALTER TABLE reader_comment_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reader_comment_themes" ON reader_comment_themes;
CREATE POLICY "select_reader_comment_themes" ON reader_comment_themes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_reader_comment_themes" ON reader_comment_themes;
CREATE POLICY "insert_reader_comment_themes" ON reader_comment_themes FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- 5. AI SUMMARIES
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_version_id uuid NOT NULL REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  summary_type text NOT NULL CHECK (summary_type IN ('overall', 'themes', 'pacing', 'dialogue', 'exposition', 'formatting', 'genre_consistency', 'revision_suggestions')),
  summary_text text NOT NULL,
  derived_label text NOT NULL DEFAULT 'Derived from reader feedback — not a quality judgment.',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (screenplay_version_id, summary_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_version ON ai_summaries(screenplay_version_id);

ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_summaries" ON ai_summaries;
CREATE POLICY "select_ai_summaries" ON ai_summaries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_ai_summaries" ON ai_summaries;
CREATE POLICY "insert_ai_summaries" ON ai_summaries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ai_summaries" ON ai_summaries;
CREATE POLICY "update_ai_summaries" ON ai_summaries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. REVISION COMPARISONS (cached)
-- ============================================================
CREATE TABLE IF NOT EXISTS revision_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  version_a_id uuid NOT NULL REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  version_b_id uuid NOT NULL REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  comparison_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_a_id, version_b_id)
);

ALTER TABLE revision_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_revision_comparisons" ON revision_comparisons;
CREATE POLICY "select_revision_comparisons" ON revision_comparisons FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM screenplays WHERE screenplays.id = revision_comparisons.screenplay_id AND screenplays.writer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin' AND user_roles.is_active = true)
  );

DROP POLICY IF EXISTS "insert_revision_comparisons" ON revision_comparisons;
CREATE POLICY "insert_revision_comparisons" ON revision_comparisons FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_revision_comparisons" ON revision_comparisons;
CREATE POLICY "update_revision_comparisons" ON revision_comparisons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. PLATFORM DISCOVERY CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_discovery_config (
  id integer PRIMARY KEY DEFAULT 1,
  min_readers integer NOT NULL DEFAULT 3,
  min_completed_reviews integer NOT NULL DEFAULT 2,
  min_confidence_level text NOT NULL DEFAULT 'medium' CHECK (min_confidence_level IN ('low', 'medium', 'high')),
  auto_validate_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO platform_discovery_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_discovery_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_discovery_config" ON platform_discovery_config;
CREATE POLICY "select_discovery_config" ON platform_discovery_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_discovery_config" ON platform_discovery_config;
CREATE POLICY "update_discovery_config" ON platform_discovery_config FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. PRODUCER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS producer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  genres text[] NOT NULL DEFAULT '{}'::text[],
  formats text[] NOT NULL DEFAULT '{}'::text[],
  countries text[] NOT NULL DEFAULT '{}'::text[],
  languages text[] NOT NULL DEFAULT '{}'::text[],
  budget_ranges text[] NOT NULL DEFAULT '{}'::text[],
  commercial boolean NOT NULL DEFAULT true,
  independent boolean NOT NULL DEFAULT true,
  arthouse boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE producer_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_preferences" ON producer_preferences;
CREATE POLICY "select_own_preferences" ON producer_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_preferences" ON producer_preferences;
CREATE POLICY "insert_own_preferences" ON producer_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_preferences" ON producer_preferences;
CREATE POLICY "update_own_preferences" ON producer_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_preferences" ON producer_preferences;
CREATE POLICY "delete_own_preferences" ON producer_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 9. PRODUCER MATCHES (cached)
-- ============================================================
CREATE TABLE IF NOT EXISTS producer_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  match_percentage numeric NOT NULL DEFAULT 0 CHECK (match_percentage >= 0 AND match_percentage <= 100),
  match_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, screenplay_id)
);

CREATE INDEX IF NOT EXISTS idx_producer_matches_user ON producer_matches(user_id);

ALTER TABLE producer_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_matches" ON producer_matches;
CREATE POLICY "select_own_matches" ON producer_matches FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_matches" ON producer_matches;
CREATE POLICY "insert_own_matches" ON producer_matches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_matches" ON producer_matches;
CREATE POLICY "update_own_matches" ON producer_matches FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_matches" ON producer_matches;
CREATE POLICY "delete_own_matches" ON producer_matches FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 10. WATCHLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_watchlists" ON watchlists;
CREATE POLICY "select_own_watchlists" ON watchlists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_watchlists" ON watchlists;
CREATE POLICY "insert_own_watchlists" ON watchlists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_watchlists" ON watchlists;
CREATE POLICY "update_own_watchlists" ON watchlists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_watchlists" ON watchlists;
CREATE POLICY "delete_own_watchlists" ON watchlists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 11. WATCHLIST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, screenplay_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_list ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_screenplay ON watchlist_items(screenplay_id);

ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_watchlist_items" ON watchlist_items;
CREATE POLICY "select_own_watchlist_items" ON watchlist_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_watchlist_items" ON watchlist_items;
CREATE POLICY "insert_own_watchlist_items" ON watchlist_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_watchlist_items" ON watchlist_items;
CREATE POLICY "delete_own_watchlist_items" ON watchlist_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );

-- ============================================================
-- 12. RECENTLY VIEWED SCREENPLAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS recently_viewed_screenplays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  screenplay_id uuid NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, screenplay_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed_screenplays(user_id);

ALTER TABLE recently_viewed_screenplays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recently_viewed" ON recently_viewed_screenplays;
CREATE POLICY "select_own_recently_viewed" ON recently_viewed_screenplays FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_recently_viewed" ON recently_viewed_screenplays;
CREATE POLICY "insert_own_recently_viewed" ON recently_viewed_screenplays FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_recently_viewed" ON recently_viewed_screenplays;
CREATE POLICY "update_own_recently_viewed" ON recently_viewed_screenplays FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_recently_viewed" ON recently_viewed_screenplays;
CREATE POLICY "delete_own_recently_viewed" ON recently_viewed_screenplays FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 13. INTRODUCTION REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS introduction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  writer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screenplay_id uuid REFERENCES screenplays(id) ON DELETE SET NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intro_requests_industry ON introduction_requests(industry_user_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_writer ON introduction_requests(writer_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_status ON introduction_requests(status);

ALTER TABLE introduction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_intro_requests" ON introduction_requests;
CREATE POLICY "select_own_intro_requests" ON introduction_requests FOR SELECT
  TO authenticated USING (auth.uid() = industry_user_id OR auth.uid() = writer_id);

DROP POLICY IF EXISTS "insert_own_intro_requests" ON introduction_requests;
CREATE POLICY "insert_own_intro_requests" ON introduction_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = industry_user_id);

DROP POLICY IF EXISTS "update_own_intro_requests" ON introduction_requests;
CREATE POLICY "update_own_intro_requests" ON introduction_requests FOR UPDATE
  TO authenticated USING (auth.uid() = industry_user_id OR auth.uid() = writer_id) WITH CHECK (auth.uid() = industry_user_id OR auth.uid() = writer_id);

-- ============================================================
-- 14. EXPORT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type text NOT NULL CHECK (export_type IN ('engagement_report', 'reader_comments', 'revision_comparison', 'analytics_summary', 'watchlist', 'comparison_report')),
  screenplay_id uuid REFERENCES screenplays(id) ON DELETE SET NULL,
  file_format text NOT NULL DEFAULT 'pdf' CHECK (file_format IN ('pdf', 'csv')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_history_user ON export_history(user_id);

ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_exports" ON export_history;
CREATE POLICY "select_own_exports" ON export_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_exports" ON export_history;
CREATE POLICY "insert_own_exports" ON export_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 15. SCREENPLAY DISCOVERY METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS screenplay_discovery_metrics (
  screenplay_id uuid PRIMARY KEY REFERENCES screenplays(id) ON DELETE CASCADE,
  version_id uuid REFERENCES screenplay_versions(id) ON DELETE CASCADE,
  reader_count integer NOT NULL DEFAULT 0,
  completed_reviews integer NOT NULL DEFAULT 0,
  completion_rate numeric NOT NULL DEFAULT 0,
  recommendation_rate numeric NOT NULL DEFAULT 0,
  retention_page3 numeric NOT NULL DEFAULT 0,
  retention_page10 numeric NOT NULL DEFAULT 0,
  retention_page15 numeric NOT NULL DEFAULT 0,
  retention_page45 numeric NOT NULL DEFAULT 0,
  retention_final numeric NOT NULL DEFAULT 0,
  avg_reading_time_ms bigint NOT NULL DEFAULT 0,
  avg_reading_speed numeric NOT NULL DEFAULT 0,
  confidence_level text NOT NULL DEFAULT 'low' CHECK (confidence_level IN ('low', 'medium', 'high')),
  trending_score numeric NOT NULL DEFAULT 0,
  industry_views integer NOT NULL DEFAULT 0,
  is_discoverable boolean NOT NULL DEFAULT false,
  last_review_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discovery_metrics_discoverable ON screenplay_discovery_metrics(is_discoverable);
CREATE INDEX IF NOT EXISTS idx_discovery_metrics_confidence ON screenplay_discovery_metrics(confidence_level);
CREATE INDEX IF NOT EXISTS idx_discovery_metrics_trending ON screenplay_discovery_metrics(trending_score DESC);

ALTER TABLE screenplay_discovery_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_discovery_metrics" ON screenplay_discovery_metrics;
CREATE POLICY "select_discovery_metrics" ON screenplay_discovery_metrics FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_discovery_metrics" ON screenplay_discovery_metrics;
CREATE POLICY "insert_discovery_metrics" ON screenplay_discovery_metrics FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_discovery_metrics" ON screenplay_discovery_metrics;
CREATE POLICY "update_discovery_metrics" ON screenplay_discovery_metrics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 16. CONFIDENCE CALCULATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_confidence_level(
  p_reader_count integer,
  p_completed_reviews integer,
  p_consistency_score numeric DEFAULT 0
) RETURNS text AS $$
DECLARE
  v_score numeric := 0;
BEGIN
  v_score := v_score + LEAST(p_reader_count::numeric / 10.0, 1.0) * 40;
  v_score := v_score + LEAST(p_completed_reviews::numeric / 8.0, 1.0) * 35;
  v_score := v_score + LEAST(p_consistency_score, 1.0) * 25;

  IF v_score >= 70 THEN
    RETURN 'high';
  ELSIF v_score >= 40 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 17. GENERATE ENGAGEMENT REPORT FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_engagement_report(
  p_screenplay_id uuid,
  p_version_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_reader_count integer := 0;
  v_completed integer := 0;
  v_abandoned integer := 0;
  v_returned_later integer := 0;
  v_completion_rate numeric := 0;
  v_recommendation_yes integer := 0;
  v_recommendation_no integer := 0;
  v_recommendation_unsure integer := 0;
  v_recommendation_rate numeric := 0;
  v_retention_p3 numeric := 0;
  v_retention_p10 numeric := 0;
  v_retention_p15 numeric := 0;
  v_retention_p45 numeric := 0;
  v_retention_final numeric := 0;
  v_avg_reading_time_ms bigint := 0;
  v_avg_reading_speed numeric := 0;
  v_avg_sessions_per_reader numeric := 0;
  v_avg_abandonment_page numeric := 0;
  v_avg_completion_time_ms bigint := 0;
  v_return_frequency numeric := 0;
  v_persistence_score numeric := 0;
  v_selectivity_score numeric := 0;
  v_confidence text := 'low';
  v_confidence_reasons text[] := '{}'::text[];
  v_report jsonb;
  v_total_reading_time_ms bigint := 0;
  v_industry_readers integer := 0;
  v_selective_readers integer := 0;
  v_persistent_readers integer := 0;
  v_page_count integer := 0;
BEGIN
  SELECT count(*) INTO v_reader_count FROM reader_assignments ra
    WHERE ra.screenplay_id = p_screenplay_id AND ra.status IN ('completed', 'abandoned');

  SELECT count(*) INTO v_completed FROM reader_assignments ra
    WHERE ra.screenplay_id = p_screenplay_id AND ra.status = 'completed';

  SELECT count(*) INTO v_abandoned FROM reader_assignments ra
    WHERE ra.screenplay_id = p_screenplay_id AND ra.status = 'abandoned';

  SELECT count(*) INTO v_returned_later FROM reader_assignments ra
    WHERE ra.screenplay_id = p_screenplay_id AND ra.returned_later = true;

  IF v_reader_count > 0 THEN
    v_completion_rate := round((v_completed::numeric / v_reader_count) * 100, 1);
    v_return_frequency := round((v_returned_later::numeric / v_reader_count) * 100, 1);
  END IF;

  SELECT count(*) INTO v_recommendation_yes FROM reader_decisions rdr
    JOIN reader_assignments ra ON ra.id = rdr.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rdr.recommendation = true;

  SELECT count(*) INTO v_recommendation_no FROM reader_decisions rdr
    JOIN reader_assignments ra ON ra.id = rdr.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rdr.recommendation = false;

  SELECT count(*) INTO v_recommendation_unsure FROM reader_decisions rdr
    JOIN reader_assignments ra ON ra.id = rdr.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rdr.recommendation IS NULL AND rdr.decision = 'finished';

  IF v_completed > 0 THEN
    v_recommendation_rate := round((v_recommendation_yes::numeric / v_completed) * 100, 1);
  END IF;

  SELECT count(*) INTO v_retention_p3 FROM retention_milestones rm
    JOIN reader_assignments ra ON ra.id = rm.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rm.milestone_page = 3;

  SELECT count(*) INTO v_retention_p10 FROM retention_milestones rm
    JOIN reader_assignments ra ON ra.id = rm.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rm.milestone_page = 10;

  SELECT count(*) INTO v_retention_p15 FROM retention_milestones rm
    JOIN reader_assignments ra ON ra.id = rm.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rm.milestone_page = 15;

  SELECT count(*) INTO v_retention_p45 FROM retention_milestones rm
    JOIN reader_assignments ra ON ra.id = rm.assignment_id
    WHERE ra.screenplay_id = p_screenplay_id AND rm.milestone_page = 45;

  v_retention_final := v_completed;

  SELECT COALESCE(sum(total_reading_time_ms), 0) INTO v_total_reading_time_ms
  FROM reader_assignments WHERE screenplay_id = p_screenplay_id AND status IN ('completed', 'abandoned');

  IF v_reader_count > 0 THEN
    v_avg_reading_time_ms := v_total_reading_time_ms / v_reader_count;
  END IF;

  SELECT COALESCE(avg(session_count), 0) INTO v_avg_sessions_per_reader
  FROM reader_assignments WHERE screenplay_id = p_screenplay_id AND status IN ('completed', 'abandoned');

  SELECT COALESCE(avg(current_page), 0) INTO v_avg_abandonment_page
  FROM reader_assignments WHERE screenplay_id = p_screenplay_id AND status = 'abandoned';

  SELECT COALESCE(avg(total_reading_time_ms), 0) INTO v_avg_completion_time_ms
  FROM reader_assignments WHERE screenplay_id = p_screenplay_id AND status = 'completed';

  SELECT COALESCE(page_count, 0) INTO v_page_count FROM screenplays WHERE id = p_screenplay_id;

  IF v_avg_reading_time_ms > 0 AND v_page_count > 0 THEN
    v_avg_reading_speed := round(v_page_count::numeric / (v_avg_reading_time_ms / 60000.0), 2);
  END IF;

  SELECT COALESCE(avg(persistence_score), 0), COALESCE(avg(selectivity_score), 0)
  INTO v_persistence_score, v_selectivity_score
  FROM behaviour_profiles bp
  JOIN reader_assignments ra ON ra.reader_id = bp.reader_id
  WHERE ra.screenplay_id = p_screenplay_id;

  SELECT count(DISTINCT ra.reader_id) INTO v_industry_readers FROM reader_assignments ra
    JOIN user_roles ur ON ur.user_id = ra.reader_id AND ur.role = 'industry'
    WHERE ra.screenplay_id = p_screenplay_id;

  SELECT count(DISTINCT bp.reader_id) INTO v_selective_readers FROM behaviour_profiles bp
    JOIN reader_assignments ra ON ra.reader_id = bp.reader_id
    WHERE ra.screenplay_id = p_screenplay_id AND bp.selectivity_score >= 0.7;

  SELECT count(DISTINCT bp.reader_id) INTO v_persistent_readers FROM behaviour_profiles bp
    JOIN reader_assignments ra ON ra.reader_id = bp.reader_id
    WHERE ra.screenplay_id = p_screenplay_id AND bp.persistence_score >= 0.7;

  v_confidence := calculate_confidence_level(v_reader_count, v_completed, (v_persistence_score + v_selectivity_score) / 2.0);

  IF v_reader_count < 3 THEN
    v_confidence_reasons := array_append(v_confidence_reasons, 'Fewer than 3 readers have been assigned');
  END IF;
  IF v_completed < 2 THEN
    v_confidence_reasons := array_append(v_confidence_reasons, 'Fewer than 2 completed reviews');
  END IF;
  IF v_confidence = 'high' THEN
    v_confidence_reasons := array_append(v_confidence_reasons, 'Sufficient reader count and consistent behaviour patterns');
  ELSIF v_confidence = 'medium' THEN
    v_confidence_reasons := array_append(v_confidence_reasons, 'Moderate reader engagement with some consistency');
  ELSE
    v_confidence_reasons := array_append(v_confidence_reasons, 'Insufficient data for high confidence');
  END IF;

  v_report := jsonb_build_object(
    'overview', jsonb_build_object(
      'reader_count', v_reader_count,
      'completed_reviews', v_completed,
      'abandoned_reads', v_abandoned,
      'completion_rate', v_completion_rate,
      'recommendation_rate', v_recommendation_rate
    ),
    'reader_activity', jsonb_build_object(
      'total_readers', v_reader_count,
      'completed_reviews', v_completed,
      'abandoned_reads', v_abandoned,
      'returned_later', v_returned_later,
      'industry_readers', v_industry_readers,
      'selective_readers', v_selective_readers,
      'persistent_readers', v_persistent_readers
    ),
    'retention', jsonb_build_object(
      'page3', jsonb_build_object('count', v_retention_p3, 'percentage', CASE WHEN v_reader_count > 0 THEN round(v_retention_p3::numeric / v_reader_count * 100, 1) ELSE 0 END),
      'page10', jsonb_build_object('count', v_retention_p10, 'percentage', CASE WHEN v_reader_count > 0 THEN round(v_retention_p10::numeric / v_reader_count * 100, 1) ELSE 0 END),
      'page15', jsonb_build_object('count', v_retention_p15, 'percentage', CASE WHEN v_reader_count > 0 THEN round(v_retention_p15::numeric / v_reader_count * 100, 1) ELSE 0 END),
      'page45', jsonb_build_object('count', v_retention_p45, 'percentage', CASE WHEN v_reader_count > 0 THEN round(v_retention_p45::numeric / v_reader_count * 100, 1) ELSE 0 END),
      'final', jsonb_build_object('count', v_retention_final, 'percentage', CASE WHEN v_reader_count > 0 THEN round(v_retention_final::numeric / v_reader_count * 100, 1) ELSE 0 END)
    ),
    'completion', jsonb_build_object(
      'rate', v_completion_rate,
      'count', v_completed,
      'avg_completion_time_ms', v_avg_completion_time_ms
    ),
    'recommendations', jsonb_build_object(
      'yes', v_recommendation_yes,
      'no', v_recommendation_no,
      'unsure', v_recommendation_unsure,
      'rate', v_recommendation_rate
    ),
    'reader_behaviour', jsonb_build_object(
      'avg_reading_time_ms', v_avg_reading_time_ms,
      'avg_reading_speed', v_avg_reading_speed,
      'avg_sessions_per_reader', round(v_avg_sessions_per_reader, 1),
      'return_later_pct', v_return_frequency,
      'avg_abandonment_page', round(v_avg_abandonment_page, 1),
      'avg_completion_time_ms', v_avg_completion_time_ms,
      'recommendation_pct', v_recommendation_rate,
      'persistence_score', round(v_persistence_score, 2),
      'selectivity_score', round(v_selectivity_score, 2)
    ),
    'confidence', jsonb_build_object(
      'level', v_confidence,
      'reasons', to_jsonb(v_confidence_reasons),
      'reader_count', v_reader_count,
      'completed_reviews', v_completed
    ),
    'sample_size', v_reader_count,
    'statistical_confidence', CASE
      WHEN v_reader_count >= 10 THEN 'high'
      WHEN v_reader_count >= 5 THEN 'medium'
      ELSE 'low'
    END
  );

  RETURN v_report;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 18. UPDATE SCREENPLAY DISCOVERY METRICS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_discovery_metrics(
  p_screenplay_id uuid
) RETURNS void AS $$
DECLARE
  v_version_id uuid;
  v_report jsonb;
  v_config record;
  v_confidence_level text;
  v_is_discoverable boolean := false;
  v_trending numeric := 0;
  v_industry_views integer := 0;
  v_last_review timestamptz;
BEGIN
  SELECT id INTO v_version_id FROM screenplay_versions
  WHERE screenplay_id = p_screenplay_id AND is_active = true LIMIT 1;

  IF v_version_id IS NULL THEN RETURN; END IF;

  v_report := generate_engagement_report(p_screenplay_id, v_version_id);
  v_confidence_level := v_report->'confidence'->>'level';

  SELECT * INTO v_config FROM platform_discovery_config WHERE id = 1;

  v_is_discoverable := (
    (v_report->'overview'->>'reader_count')::integer >= v_config.min_readers AND
    (v_report->'overview'->>'completed_reviews')::integer >= v_config.min_completed_reviews AND
    CASE v_config.min_confidence_level
      WHEN 'high' THEN v_confidence_level = 'high'
      WHEN 'medium' THEN v_confidence_level IN ('medium', 'high')
      ELSE true
    END
  );

  SELECT count(*) INTO v_industry_views FROM recently_viewed_screenplays rv
  JOIN user_roles ur ON ur.user_id = rv.user_id AND ur.role = 'industry'
  WHERE rv.screenplay_id = p_screenplay_id;

  SELECT COALESCE(count(*), 0) INTO v_trending
  FROM reader_decisions rdr
  JOIN reader_assignments ra ON ra.id = rdr.assignment_id
  WHERE ra.screenplay_id = p_screenplay_id
  AND rdr.created_at > now() - interval '7 days';

  SELECT max(rdr.created_at) INTO v_last_review
  FROM reader_decisions rdr
  JOIN reader_assignments ra ON ra.id = rdr.assignment_id
  WHERE ra.screenplay_id = p_screenplay_id;

  INSERT INTO screenplay_discovery_metrics (
    screenplay_id, version_id,
    reader_count, completed_reviews, completion_rate, recommendation_rate,
    retention_page3, retention_page10, retention_page15, retention_page45, retention_final,
    avg_reading_time_ms, avg_reading_speed,
    confidence_level, trending_score, industry_views, is_discoverable,
    last_review_at, computed_at
  ) VALUES (
    p_screenplay_id, v_version_id,
    (v_report->'overview'->>'reader_count')::integer,
    (v_report->'overview'->>'completed_reviews')::integer,
    (v_report->'overview'->>'completion_rate')::numeric,
    (v_report->'overview'->>'recommendation_rate')::numeric,
    (v_report->'retention'->'page3'->>'percentage')::numeric,
    (v_report->'retention'->'page10'->>'percentage')::numeric,
    (v_report->'retention'->'page15'->>'percentage')::numeric,
    (v_report->'retention'->'page45'->>'percentage')::numeric,
    (v_report->'retention'->'final'->>'percentage')::numeric,
    (v_report->'reader_behaviour'->>'avg_reading_time_ms')::bigint,
    (v_report->'reader_behaviour'->>'avg_reading_speed')::numeric,
    v_confidence_level,
    v_trending,
    v_industry_views,
    v_is_discoverable,
    v_last_review,
    now()
  ) ON CONFLICT (screenplay_id) DO UPDATE SET
    version_id = EXCLUDED.version_id,
    reader_count = EXCLUDED.reader_count,
    completed_reviews = EXCLUDED.completed_reviews,
    completion_rate = EXCLUDED.completion_rate,
    recommendation_rate = EXCLUDED.recommendation_rate,
    retention_page3 = EXCLUDED.retention_page3,
    retention_page10 = EXCLUDED.retention_page10,
    retention_page15 = EXCLUDED.retention_page15,
    retention_page45 = EXCLUDED.retention_page45,
    retention_final = EXCLUDED.retention_final,
    avg_reading_time_ms = EXCLUDED.avg_reading_time_ms,
    avg_reading_speed = EXCLUDED.avg_reading_speed,
    confidence_level = EXCLUDED.confidence_level,
    trending_score = EXCLUDED.trending_score,
    industry_views = EXCLUDED.industry_views,
    is_discoverable = EXCLUDED.is_discoverable,
    last_review_at = EXCLUDED.last_review_at,
    computed_at = now();

  INSERT INTO engagement_reports (screenplay_id, screenplay_version_id, report_data, confidence_level, confidence_reasons, reader_count, completed_reviews, abandoned_reads, computed_at)
  VALUES (
    p_screenplay_id, v_version_id, v_report, v_confidence_level,
    ARRAY(SELECT jsonb_array_elements_text(v_report->'confidence'->'reasons')),
    (v_report->'overview'->>'reader_count')::integer,
    (v_report->'overview'->>'completed_reviews')::integer,
    (v_report->'overview'->>'abandoned_reads')::integer,
    now()
  ) ON CONFLICT (screenplay_version_id) DO UPDATE SET
    report_data = EXCLUDED.report_data,
    confidence_level = EXCLUDED.confidence_level,
    confidence_reasons = EXCLUDED.confidence_reasons,
    reader_count = EXCLUDED.reader_count,
    completed_reviews = EXCLUDED.completed_reviews,
    abandoned_reads = EXCLUDED.abandoned_reads,
    computed_at = now();

  IF v_is_discoverable AND v_config.auto_validate_enabled THEN
    UPDATE screenplays SET status = 'validated' WHERE id = p_screenplay_id AND status = 'in_review';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 19. COMPUTE PRODUCER MATCH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION compute_producer_match(
  p_user_id uuid,
  p_screenplay_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_prefs record;
  v_screenplay record;
  v_match numeric := 0;
  v_factors jsonb := '{}'::jsonb;
  v_genre_match boolean := false;
  v_format_match boolean := false;
  v_country_match boolean := false;
  v_language_match boolean := false;
  v_budget_match boolean := false;
  v_total_criteria integer := 0;
  v_matched_criteria integer := 0;
BEGIN
  SELECT * INTO v_prefs FROM producer_preferences WHERE user_id = p_user_id;
  SELECT * INTO v_screenplay FROM screenplays WHERE id = p_screenplay_id;

  IF v_prefs IS NULL OR v_screenplay IS NULL THEN
    RETURN jsonb_build_object('percentage', 0, 'factors', '{}'::jsonb);
  END IF;

  IF array_length(v_prefs.genres, 1) > 0 THEN
    v_total_criteria := v_total_criteria + 1;
    v_genre_match := v_screenplay.genre = ANY(v_prefs.genres);
    IF v_genre_match THEN v_matched_criteria := v_matched_criteria + 1; END IF;
  END IF;

  IF array_length(v_prefs.formats, 1) > 0 THEN
    v_total_criteria := v_total_criteria + 1;
    v_format_match := v_screenplay.format = ANY(v_prefs.formats);
    IF v_format_match THEN v_matched_criteria := v_matched_criteria + 1; END IF;
  END IF;

  IF array_length(v_prefs.countries, 1) > 0 THEN
    v_total_criteria := v_total_criteria + 1;
    v_country_match := v_screenplay.country = ANY(v_prefs.countries);
    IF v_country_match THEN v_matched_criteria := v_matched_criteria + 1; END IF;
  END IF;

  IF array_length(v_prefs.languages, 1) > 0 THEN
    v_total_criteria := v_total_criteria + 1;
    v_language_match := v_screenplay.language = ANY(v_prefs.languages);
    IF v_language_match THEN v_matched_criteria := v_matched_criteria + 1; END IF;
  END IF;

  IF array_length(v_prefs.budget_ranges, 1) > 0 THEN
    v_total_criteria := v_total_criteria + 1;
    v_budget_match := v_screenplay.estimated_budget = ANY(v_prefs.budget_ranges);
    IF v_budget_match THEN v_matched_criteria := v_matched_criteria + 1; END IF;
  END IF;

  IF v_total_criteria > 0 THEN
    v_match := round((v_matched_criteria::numeric / v_total_criteria) * 100, 0);
  ELSE
    v_match := 50;
  END IF;

  v_factors := jsonb_build_object(
    'genre', v_genre_match,
    'format', v_format_match,
    'country', v_country_match,
    'language', v_language_match,
    'budget', v_budget_match,
    'matched', v_matched_criteria,
    'total', v_total_criteria
  );

  INSERT INTO producer_matches (user_id, screenplay_id, match_percentage, match_factors, computed_at)
  VALUES (p_user_id, p_screenplay_id, v_match, v_factors, now())
  ON CONFLICT (user_id, screenplay_id) DO UPDATE SET
    match_percentage = EXCLUDED.match_percentage,
    match_factors = EXCLUDED.match_factors,
    computed_at = now();

  RETURN jsonb_build_object('percentage', v_match, 'factors', v_factors);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 20. TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_update_discovery_metrics()
RETURNS trigger AS $$
BEGIN
  PERFORM update_discovery_metrics(NEW.screenplay_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_discovery_on_complete ON reader_assignments;
CREATE TRIGGER trg_update_discovery_on_complete
  AFTER UPDATE OF status ON reader_assignments
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'abandoned') AND OLD.status NOT IN ('completed', 'abandoned'))
  EXECUTE FUNCTION trigger_update_discovery_metrics();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_engagement_reports_updated_at ON engagement_reports;
CREATE TRIGGER trg_engagement_reports_updated_at BEFORE UPDATE ON engagement_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_watchlists_updated_at ON watchlists;
CREATE TRIGGER trg_watchlists_updated_at BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_intro_requests_updated_at ON introduction_requests;
CREATE TRIGGER trg_intro_requests_updated_at BEFORE UPDATE ON introduction_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_producer_preferences_updated_at ON producer_preferences;
CREATE TRIGGER trg_producer_preferences_updated_at BEFORE UPDATE ON producer_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
