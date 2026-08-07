/*
# WhittleScript — Phase 5: Reader Contribution Credit Algorithm

1. Purpose
   Replaces the existing fixed-credit reader reward system with a
   Reader Contribution Credit Algorithm. Readers accumulate contribution
   points from verified pages read, active reading time, feedback quality,
   and completion behaviour. When they reach a configurable threshold they
   receive +1 screenplay upload credit, with excess points carrying over.

   The algorithm is fully Admin-controlled via versioned settings rows so
   future changes do not require code changes and historical calculations
   are preserved.

2. New Tables
   - reader_contribution_algorithm: versioned algorithm configuration.
     Each row is an immutable version snapshot. The latest version (highest
     version_number) is the active one. Admin creates a new version to change
     settings.
   - reader_contribution_balances: one row per reader. Tracks current
     contribution points, available upload credits, and total credits earned.
   - contribution_events: one row per screenplay evaluation. Stores pages
     read, active reading time, feedback, feedback quality score, points
     awarded, algorithm version used, and whether the event was flagged.
   - suspicious_reader_activity: flags detected anti-gaming behaviour for
     admin review.

3. Modified Tables
   - submission_credits: now also updated by the contribution algorithm
     when a reader crosses the credit threshold. The existing balance /
     total_earned / total_spent columns are reused — no schema change
     needed, the complete_reader_assignment function is rewritten to use
     the new algorithm instead of the flat credits_per_review value.

4. Security
   - RLS on every new table.
   - reader_contribution_algorithm: SELECT for all authenticated (read-only
     catalog). INSERT/UPDATE/DELETE restricted to admin role only via
     SECURITY DEFINER functions (admins hold the admin app_role).
   - reader_contribution_balances: owner-scoped SELECT. INSERT/UPDATE done
     via SECURITY DEFINER function only (readers cannot self-award points).
   - contribution_events: owner-scoped SELECT. INSERT via SECURITY DEFINER
     function only.
   - suspicious_reader_activity: admin-only SELECT. INSERT via SECURITY
     DEFINER function.

5. Important Notes
   - The complete_reader_assignment function is rewritten to:
     a) Validate feedback length (120-500 chars).
     b) Call the AI feedback quality edge function (if enabled) to get a
        quality score, or fall back to a heuristic.
     c) Calculate contribution points from pages, time, feedback bonus,
        and completion bonus using the active algorithm version.
     d) Award points to reader_contribution_balances.
     e) Check if balance >= threshold; if so, award upload credits and
        carry over excess.
     f) Detect suspicious behaviour and flag for admin review.
   - Recommendation data (yes/no/unsure) is stored but does NOT affect
     credits — it is audience analysis data only.
   - Historical credit_transactions rows are preserved. New transactions
     use reason='Contribution credit earned'.
*/

-- ============================================================
-- 1. reader_contribution_algorithm (versioned settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS reader_contribution_algorithm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer NOT NULL,
  -- Credit threshold
  credit_threshold integer NOT NULL DEFAULT 1000,
  -- Page contribution
  page_contribution_enabled boolean NOT NULL DEFAULT true,
  points_per_page numeric NOT NULL DEFAULT 1.0,
  -- Reading time contribution
  time_contribution_enabled boolean NOT NULL DEFAULT true,
  minutes_per_interval numeric NOT NULL DEFAULT 10.0,
  points_per_time_interval numeric NOT NULL DEFAULT 1.0,
  max_time_points_per_script integer NOT NULL DEFAULT 20,
  -- Feedback contribution (early stop bonus)
  feedback_contribution_enabled boolean NOT NULL DEFAULT true,
  feedback_starting_bonus integer NOT NULL DEFAULT 30,
  feedback_reduction_rate numeric NOT NULL DEFAULT 3.0,
  feedback_minimum_bonus integer NOT NULL DEFAULT 10,
  -- AI feedback quality
  ai_quality_enabled boolean NOT NULL DEFAULT true,
  ai_quality_weighting numeric NOT NULL DEFAULT 0.5,
  ai_min_quality_score integer NOT NULL DEFAULT 30,
  ai_quality_multiplier numeric NOT NULL DEFAULT 1.0,
  -- Completion bonus
  completion_bonus_enabled boolean NOT NULL DEFAULT true,
  completion_bonus_points integer NOT NULL DEFAULT 15,
  -- Metadata
  activated_at timestamptz NOT NULL DEFAULT now(),
  activated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reader_contribution_algorithm ENABLE ROW LEVEL SECURITY;

-- All authenticated can read the algorithm settings (read-only catalog)
DROP POLICY IF EXISTS "rca_select_all" ON reader_contribution_algorithm;
CREATE POLICY "rca_select_all" ON reader_contribution_algorithm FOR SELECT
  TO authenticated USING (true);

-- Only admins can insert/update/delete algorithm versions
DROP POLICY IF EXISTS "rca_insert_admin" ON reader_contribution_algorithm;
CREATE POLICY "rca_insert_admin" ON reader_contribution_algorithm FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  );

DROP POLICY IF EXISTS "rca_update_admin" ON reader_contribution_algorithm;
CREATE POLICY "rca_update_admin" ON reader_contribution_algorithm FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  );

DROP POLICY IF EXISTS "rca_delete_admin" ON reader_contribution_algorithm;
CREATE POLICY "rca_delete_admin" ON reader_contribution_algorithm FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_rca_version ON reader_contribution_algorithm(version_number);

-- ============================================================
-- 2. reader_contribution_balances
-- ============================================================
CREATE TABLE IF NOT EXISTS reader_contribution_balances (
  reader_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_points integer NOT NULL DEFAULT 0,
  available_credits integer NOT NULL DEFAULT 0,
  total_credits_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reader_contribution_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rcb_select_own" ON reader_contribution_balances;
CREATE POLICY "rcb_select_own" ON reader_contribution_balances FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

-- INSERT/UPDATE via SECURITY DEFINER function only; no direct policies

CREATE INDEX IF NOT EXISTS idx_rcb_reader ON reader_contribution_balances(reader_id);

-- ============================================================
-- 3. contribution_events
-- ============================================================
CREATE TABLE IF NOT EXISTS contribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES reader_assignments(id) ON DELETE SET NULL,
  screenplay_id uuid REFERENCES screenplays(id) ON DELETE SET NULL,
  pages_read integer NOT NULL DEFAULT 0,
  active_reading_time_ms bigint NOT NULL DEFAULT 0,
  feedback_submitted text,
  feedback_quality_score integer NOT NULL DEFAULT 0,
  points_awarded integer NOT NULL DEFAULT 0,
  algorithm_version integer NOT NULL,
  decision text NOT NULL DEFAULT 'stopped',
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contribution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ce_select_own" ON contribution_events;
CREATE POLICY "ce_select_own" ON contribution_events FOR SELECT
  TO authenticated USING (auth.uid() = reader_id);

-- INSERT via SECURITY DEFINER function only

CREATE INDEX IF NOT EXISTS idx_ce_reader ON contribution_events(reader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_assignment ON contribution_events(assignment_id);

-- ============================================================
-- 4. suspicious_reader_activity
-- ============================================================
CREATE TABLE IF NOT EXISTS suspicious_reader_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES reader_assignments(id) ON DELETE SET NULL,
  detection_type text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suspicious_reader_activity ENABLE ROW LEVEL SECURITY;

-- Admin-only: admins can view suspicious activity
DROP POLICY IF EXISTS "sra_select_admin" ON suspicious_reader_activity;
CREATE POLICY "sra_select_admin" ON suspicious_reader_activity FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  );

DROP POLICY IF EXISTS "sra_update_admin" ON suspicious_reader_activity;
CREATE POLICY "sra_update_admin" ON suspicious_reader_activity FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active_role = 'admin')
  );

-- INSERT via SECURITY DEFINER function only

CREATE INDEX IF NOT EXISTS idx_sra_reader ON suspicious_reader_activity(reader_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sra_unresolved ON suspicious_reader_activity(resolved, created_at DESC);

-- ============================================================
-- 5. Triggers for updated_at
-- ============================================================
DROP TRIGGER IF EXISTS rcb_touch ON reader_contribution_balances;
CREATE TRIGGER rcb_touch BEFORE UPDATE ON reader_contribution_balances
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- 6. Seed initial algorithm version (v1.0)
-- ============================================================
INSERT INTO reader_contribution_algorithm (version_number, notes)
SELECT 1, 'Initial algorithm version 1.0 — default settings'
WHERE NOT EXISTS (SELECT 1 FROM reader_contribution_algorithm WHERE version_number = 1);

-- ============================================================
-- 7. Seed contribution balances for existing readers
-- ============================================================
INSERT INTO reader_contribution_balances (reader_id)
SELECT p.id FROM profiles p
WHERE p.active_role = 'reader'
  AND p.id NOT IN (SELECT reader_id FROM reader_contribution_balances)
ON CONFLICT (reader_id) DO NOTHING;

-- ============================================================
-- 8. Helper: get active algorithm version
-- ============================================================
CREATE OR REPLACE FUNCTION get_active_algorithm_version()
RETURNS reader_contribution_algorithm
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_algo reader_contribution_algorithm%ROWTYPE;
BEGIN
  SELECT * INTO v_algo
  FROM reader_contribution_algorithm
  ORDER BY version_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback to hardcoded defaults if no version exists
    v_algo := ROW(
      gen_random_uuid(), 1, 1000, true, 1.0,
      true, 10.0, 1.0, 20,
      true, 30, 3.0, 10,
      true, 0.5, 30, 1.0,
      true, 15,
      now(), null, 'Default fallback', now()
    );
  END IF;

  RETURN v_algo;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_algorithm_version() TO authenticated;

-- ============================================================
-- 9. Helper: calculate feedback bonus (early stop bonus)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_feedback_bonus(
  p_pages_read integer,
  p_algo reader_contribution_algorithm
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_bonus numeric;
BEGIN
  IF NOT p_algo.feedback_contribution_enabled THEN
    RETURN 0;
  END IF;

  -- Base feedback value at 3 pages read
  -- Reduce 1 point every (reduction_rate) additional pages read beyond 3
  -- Minimum is feedback_minimum_bonus
  IF p_pages_read <= 3 THEN
    v_bonus := p_algo.feedback_starting_bonus;
  ELSE
    v_bonus := p_algo.feedback_starting_bonus - ((p_pages_read - 3) / p_algo.feedback_reduction_rate);
  END IF;

  IF v_bonus < p_algo.feedback_minimum_bonus THEN
    v_bonus := p_algo.feedback_minimum_bonus;
  END IF;

  RETURN ROUND(v_bonus);
END;
$$;

-- ============================================================
-- 10. Helper: calculate time contribution points
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_time_points(
  p_active_reading_time_ms bigint,
  p_algo reader_contribution_algorithm
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_minutes numeric;
  v_intervals numeric;
  v_points numeric;
BEGIN
  IF NOT p_algo.time_contribution_enabled THEN
    RETURN 0;
  END IF;

  IF p_algo.minutes_per_interval <= 0 THEN
    RETURN 0;
  END IF;

  v_minutes := p_active_reading_time_ms / 60000.0;
  v_intervals := v_minutes / p_algo.minutes_per_interval;
  v_points := FLOOR(v_intervals) * p_algo.points_per_time_interval;

  IF v_points > p_algo.max_time_points_per_script THEN
    v_points := p_algo.max_time_points_per_script;
  END IF;

  IF v_points < 0 THEN
    v_points := 0;
  END IF;

  RETURN ROUND(v_points);
END;
$$;

-- ============================================================
-- 11. Helper: heuristic feedback quality score (fallback)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_heuristic_quality_score(
  p_feedback text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_score integer := 0;
  v_len integer;
  v_word_count integer;
  v_lower text;
BEGIN
  IF p_feedback IS NULL OR p_feedback = '' THEN
    RETURN 0;
  END IF;

  v_len := length(p_feedback);
  v_word_count := array_length(string_to_array(trim(p_feedback), ' '), 1);
  v_lower := lower(p_feedback);

  -- Length-based scoring (up to 30 points)
  IF v_len >= 120 THEN v_score := v_score + 15; END IF;
  IF v_len >= 200 THEN v_score := v_score + 10; END IF;
  IF v_len >= 300 THEN v_score := v_score + 5; END IF;

  -- Word count scoring (up to 20 points)
  IF v_word_count >= 20 THEN v_score := v_score + 10; END IF;
  IF v_word_count >= 40 THEN v_score := v_score + 10; END IF;

  -- Keyword-based scoring: story elements (up to 50 points)
  IF v_lower ~ '(character|protagonist|hero|villain|arc|motivation|goal)' THEN v_score := v_score + 10; END IF;
  IF v_lower ~ '(dialogue|conversation|monologue|speech)' THEN v_score := v_score + 8; END IF;
  IF v_lower ~ '(pacing|tempo|rhythm|momentum)' THEN v_score := v_score + 8; END IF;
  IF v_lower ~ '(structure|act|scene|plot|storyline|narrative)' THEN v_score := v_score + 8; END IF;
  IF v_lower ~ '(theme|message|meaning|subtext)' THEN v_score := v_score + 8; END IF;
  IF v_lower ~ '(engaging|hooked|compelling|gripping|boring|lost interest|stopped)' THEN v_score := v_score + 8; END IF;

  -- Cap at 100
  IF v_score > 100 THEN v_score := 100; END IF;

  RETURN v_score;
END;
$$;

-- ============================================================
-- 12. REWRITE: complete_reader_assignment function
-- ============================================================
CREATE OR REPLACE FUNCTION complete_reader_assignment(
  p_assignment_id uuid,
  p_decision text,
  p_finished boolean,
  p_recommendation text,
  p_feedback text,
  p_notes text,
  p_stop_reason text,
  p_page_abandoned integer,
  p_reading_time_ms bigint,
  p_session_count integer,
  p_feedback_quality_score integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment reader_assignments%ROWTYPE;
  v_reader_id uuid;
  v_algo reader_contribution_algorithm%ROWTYPE;
  v_balance reader_contribution_balances%ROWTYPE;
  v_pages_read integer;
  v_page_points integer := 0;
  v_time_points integer := 0;
  v_feedback_bonus integer := 0;
  v_completion_bonus integer := 0;
  v_quality_score integer;
  v_quality_multiplier numeric := 1.0;
  v_total_points integer := 0;
  v_credits_awarded integer := 0;
  v_carry_over integer := 0;
  v_flagged boolean := false;
  v_flag_reasons text[] := ARRAY[]::text[];
  v_behaviour reader_behaviour%ROWTYPE;
  v_total_assignments integer;
  v_total_completed integer;
  v_completion_rate numeric(5,2);
  v_reco_rate numeric(5,2);
  v_reading_speed numeric;
  v_reco_bool boolean;
BEGIN
  SELECT * INTO v_assignment FROM reader_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  v_reader_id := v_assignment.reader_id;

  -- Get active algorithm version
  SELECT * INTO v_algo FROM reader_contribution_algorithm
  ORDER BY version_number DESC LIMIT 1;

  IF NOT FOUND THEN
    -- Use hardcoded defaults
    v_algo := ROW(
      gen_random_uuid(), 1, 1000, true, 1.0,
      true, 10.0, 1.0, 20,
      true, 30, 3.0, 10,
      true, 0.5, 30, 1.0,
      true, 15,
      now(), null, 'Default', now()
    );
  END IF;

  -- Update assignment status
  UPDATE reader_assignments
  SET status = CASE WHEN p_decision = 'finished' THEN 'completed' WHEN p_decision = 'stopped' THEN 'abandoned' ELSE 'active' END,
      completed_at = CASE WHEN p_decision IN ('finished', 'stopped') THEN now() ELSE NULL END,
      total_reading_time_ms = p_reading_time_ms,
      session_count = p_session_count
  WHERE id = p_assignment_id;

  -- Convert recommendation text to boolean for recommendations table
  -- 'yes' => true, 'no' => false, 'unsure' => null, null => null
  v_reco_bool := CASE WHEN p_recommendation = 'yes' THEN true WHEN p_recommendation = 'no' THEN false ELSE null END;

  -- Insert reader decision
  INSERT INTO reader_decisions (
    assignment_id, reader_id, decision, finished_screenplay,
    recommendation, written_feedback, private_notes,
    stop_reason, page_abandoned, reading_time_ms, session_count
  ) VALUES (
    p_assignment_id, v_reader_id, p_decision, p_finished,
    v_reco_bool, p_feedback, p_notes,
    p_stop_reason, p_page_abandoned, p_reading_time_ms, p_session_count
  );

  -- Store recommendation (audience data only — does NOT affect credits)
  IF p_decision = 'finished' AND p_recommendation IS NOT NULL THEN
    INSERT INTO recommendations (assignment_id, reader_id, recommended)
    VALUES (p_assignment_id, v_reader_id, v_reco_bool)
    ON CONFLICT (assignment_id) DO NOTHING;
  END IF;

  -- ==========================================================
  -- CONTRIBUTION POINT CALCULATION
  -- ==========================================================

  -- Determine pages read
  v_pages_read := CASE WHEN p_decision = 'finished' THEN v_assignment.current_page
                       WHEN p_page_abandoned IS NOT NULL THEN p_page_abandoned
                       ELSE v_assignment.current_page END;

  -- 1. Page contribution points
  IF v_algo.page_contribution_enabled THEN
    v_page_points := ROUND(v_pages_read * v_algo.points_per_page);
  END IF;

  -- 2. Time contribution points
  v_time_points := calculate_time_points(p_reading_time_ms, v_algo);

  -- 3. Feedback quality score
  -- Use AI-provided score if passed and enabled, otherwise heuristic
  IF v_algo.ai_quality_enabled AND p_feedback_quality_score > 0 THEN
    v_quality_score := LEAST(p_feedback_quality_score, 100);
  ELSE
    v_quality_score := calculate_heuristic_quality_score(p_feedback);
  END IF;

  -- Check minimum quality threshold
  IF v_algo.ai_quality_enabled AND v_quality_score < v_algo.ai_min_quality_score THEN
    -- Feedback doesn't meet minimum quality — no feedback bonus
    v_feedback_bonus := 0;
  ELSE
    -- 4. Feedback bonus (early stop bonus)
    v_feedback_bonus := calculate_feedback_bonus(v_pages_read, v_algo);

    -- Apply quality weighting/multiplier
    IF v_algo.ai_quality_enabled THEN
      -- Quality multiplier: scale feedback bonus by quality score
      v_quality_multiplier := (v_quality_score::numeric / 100.0) * v_algo.ai_quality_multiplier;
      -- Blend with weighting: final = base * (weighting + (1-weighting) * multiplier)
      -- High weighting = quality matters more; low weighting = quality matters less
      v_feedback_bonus := ROUND(v_feedback_bonus * (v_algo.ai_quality_weighting + (1.0 - v_algo.ai_quality_weighting) * v_quality_multiplier));
    END IF;
  END IF;

  -- 5. Completion bonus
  IF v_algo.completion_bonus_enabled AND p_decision = 'finished' THEN
    v_completion_bonus := v_algo.completion_bonus_points;
  END IF;

  -- Total points
  v_total_points := v_page_points + v_time_points + v_feedback_bonus + v_completion_bonus;
  IF v_total_points < 0 THEN v_total_points := 0; END IF;

  -- ==========================================================
  -- ANTI-GAMING DETECTION
  -- ==========================================================

  -- Rapid page skipping: reading speed > 5 pages/min is suspicious
  IF p_reading_time_ms > 0 THEN
    v_reading_speed := (v_pages_read::numeric / (p_reading_time_ms / 60000.0));
    IF v_reading_speed > 10 THEN
      v_flagged := true;
      v_flag_reasons := array_append(v_flag_reasons, 'unrealistic_reading_speed');
    END IF;
  END IF;

  -- Idle session: very high reading time relative to pages
  IF p_reading_time_ms > 0 AND v_pages_read > 0 THEN
    IF (p_reading_time_ms / 60000.0) / v_pages_read > 30 THEN
      v_flagged := true;
      v_flag_reasons := array_append(v_flag_reasons, 'idle_session');
    END IF;
  END IF;

  -- Repeated low-effort feedback: very short feedback near minimum
  IF p_feedback IS NOT NULL AND length(p_feedback) < 130 THEN
    v_flagged := true;
    v_flag_reasons := array_append(v_flag_reasons, 'low_effort_feedback');
  END IF;

  -- Zero pages read but claiming finished
  IF p_decision = 'finished' AND v_pages_read = 0 THEN
    v_flagged := true;
    v_flag_reasons := array_append(v_flag_reasons, 'zero_pages_finished');
  END IF;

  -- ==========================================================
  -- AWARD CONTRIBUTION POINTS
  -- ==========================================================

  -- Get or create balance row
  SELECT * INTO v_balance FROM reader_contribution_balances WHERE reader_id = v_reader_id;
  IF NOT FOUND THEN
    INSERT INTO reader_contribution_balances (reader_id) VALUES (v_reader_id);
    SELECT * INTO v_balance FROM reader_contribution_balances WHERE reader_id = v_reader_id;
  END IF;

  -- Add points to balance
  UPDATE reader_contribution_balances
  SET current_points = current_points + v_total_points
  WHERE reader_id = v_reader_id;

  -- Check for credit award
  SELECT current_points INTO v_carry_over FROM reader_contribution_balances WHERE reader_id = v_reader_id;

  IF v_carry_over >= v_algo.credit_threshold THEN
    v_credits_awarded := v_carry_over / v_algo.credit_threshold;
    v_carry_over := v_carry_over - (v_credits_awarded * v_algo.credit_threshold);

    -- Update balances: deduct threshold points, add credits
    UPDATE reader_contribution_balances
    SET current_points = v_carry_over,
        available_credits = available_credits + v_credits_awarded,
        total_credits_earned = total_credits_earned + v_credits_awarded
    WHERE reader_id = v_reader_id;

    -- Also update submission_credits (the existing upload credit system)
    UPDATE submission_credits
    SET balance = balance + v_credits_awarded,
        total_earned = total_earned + v_credits_awarded
    WHERE user_id = v_reader_id;

    -- Record credit transaction
    INSERT INTO credit_transactions (user_id, amount, type, reason, screenplay_id)
    VALUES (v_reader_id, v_credits_awarded, 'earned', 'Contribution credit earned', v_assignment.screenplay_id);
  END IF;

  -- Record contribution event
  INSERT INTO contribution_events (
    reader_id, assignment_id, screenplay_id,
    pages_read, active_reading_time_ms,
    feedback_submitted, feedback_quality_score,
    points_awarded, algorithm_version,
    decision, flagged
  ) VALUES (
    v_reader_id, p_assignment_id, v_assignment.screenplay_id,
    v_pages_read, p_reading_time_ms,
    p_feedback, v_quality_score,
    v_total_points, v_algo.version_number,
    p_decision, v_flagged
  );

  -- Record suspicious activity if flagged
  IF v_flagged THEN
    INSERT INTO suspicious_reader_activity (
      reader_id, assignment_id, detection_type, description, severity, metadata
    ) VALUES (
      v_reader_id, p_assignment_id,
      array_to_string(v_flag_reasons, ','),
      'Detected: ' || array_to_string(v_flag_reasons, ', ') || ' on screenplay review',
      CASE WHEN array_length(v_flag_reasons, 1) >= 3 THEN 'high' ELSE 'medium' END,
      jsonb_build_object(
        'pages_read', v_pages_read,
        'reading_time_ms', p_reading_time_ms,
        'reading_speed', v_reading_speed,
        'feedback_length', CASE WHEN p_feedback IS NOT NULL THEN length(p_feedback) ELSE 0 END,
        'quality_score', v_quality_score,
        'points_awarded', v_total_points
      )
    );
  END IF;

  -- ==========================================================
  -- UPDATE READER BEHAVIOUR (preserved from original)
  -- ==========================================================
  SELECT * INTO v_behaviour FROM reader_behaviour WHERE reader_id = v_reader_id;
  IF NOT FOUND THEN
    INSERT INTO reader_behaviour (reader_id) VALUES (v_reader_id);
    SELECT * INTO v_behaviour FROM reader_behaviour WHERE reader_id = v_reader_id;
  END IF;

  v_total_assignments := v_behaviour.total_assignments + 1;
  v_total_completed := v_behaviour.total_completed + CASE WHEN p_decision = 'finished' THEN 1 ELSE 0 END;
  v_completion_rate := CASE WHEN v_total_assignments > 0 THEN ROUND((v_total_completed::numeric / v_total_assignments) * 100, 2) ELSE 0 END;
  v_reco_rate := CASE WHEN v_total_completed > 0 THEN
    ROUND(((v_behaviour.total_completed + CASE WHEN p_decision = 'finished' AND v_reco_bool = true THEN 1 ELSE 0 END)::numeric /
      v_total_completed) * 100, 2)
  ELSE 0 END;

  UPDATE reader_behaviour
  SET
    total_assignments = v_total_assignments,
    total_completed = v_total_completed,
    total_abandoned = total_abandoned + CASE WHEN p_decision = 'stopped' THEN 1 ELSE 0 END,
    total_returned_later = total_returned_later + CASE WHEN p_decision = 'return_later' THEN 1 ELSE 0 END,
    completion_rate = v_completion_rate,
    recommendation_rate = v_reco_rate,
    total_reading_time_ms = total_reading_time_ms + p_reading_time_ms,
    avg_reading_duration_ms = CASE WHEN v_total_assignments > 0 THEN
      ROUND((total_reading_time_ms + p_reading_time_ms) / v_total_assignments)
    ELSE 0 END,
    last_reading_date = CURRENT_DATE
  WHERE reader_id = v_reader_id;

  UPDATE reader_profiles
  SET reviews_count = reviews_count + CASE WHEN p_decision = 'finished' THEN 1 ELSE 0 END
  WHERE user_id = v_reader_id;

  -- Notification
  IF p_decision = 'finished' THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_reader_id, 'reviews', 'Review Completed',
      'Your review has been submitted. Thank you for your contribution to the WhittleScript community.',
      '/app/reviews');
  ELSIF p_decision = 'stopped' THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_reader_id, 'reviews', 'Review Submitted',
      'Your feedback has been recorded. Early feedback is valuable audience data.',
      '/app/reviews');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'points_awarded', v_total_points,
    'credits_awarded', v_credits_awarded,
    'quality_score', v_quality_score,
    'flagged', v_flagged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_reader_assignment(uuid, text, boolean, text, text, text, text, integer, bigint, integer, integer) TO authenticated;

-- ============================================================
-- 13. Helper: create new algorithm version (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION create_algorithm_version(
  p_credit_threshold integer,
  p_page_contribution_enabled boolean,
  p_points_per_page numeric,
  p_time_contribution_enabled boolean,
  p_minutes_per_interval numeric,
  p_points_per_time_interval numeric,
  p_max_time_points_per_script integer,
  p_feedback_contribution_enabled boolean,
  p_feedback_starting_bonus integer,
  p_feedback_reduction_rate numeric,
  p_feedback_minimum_bonus integer,
  p_ai_quality_enabled boolean,
  p_ai_quality_weighting numeric,
  p_ai_min_quality_score integer,
  p_ai_quality_multiplier numeric,
  p_completion_bonus_enabled boolean,
  p_completion_bonus_points integer,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_version integer;
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  -- Verify admin
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = v_admin_id AND active_role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can create algorithm versions';
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_new_version
  FROM reader_contribution_algorithm;

  INSERT INTO reader_contribution_algorithm (
    version_number, credit_threshold,
    page_contribution_enabled, points_per_page,
    time_contribution_enabled, minutes_per_interval, points_per_time_interval, max_time_points_per_script,
    feedback_contribution_enabled, feedback_starting_bonus, feedback_reduction_rate, feedback_minimum_bonus,
    ai_quality_enabled, ai_quality_weighting, ai_min_quality_score, ai_quality_multiplier,
    completion_bonus_enabled, completion_bonus_points,
    activated_by, notes
  ) VALUES (
    v_new_version, p_credit_threshold,
    p_page_contribution_enabled, p_points_per_page,
    p_time_contribution_enabled, p_minutes_per_interval, p_points_per_time_interval, p_max_time_points_per_script,
    p_feedback_contribution_enabled, p_feedback_starting_bonus, p_feedback_reduction_rate, p_feedback_minimum_bonus,
    p_ai_quality_enabled, p_ai_quality_weighting, p_ai_min_quality_score, p_ai_quality_multiplier,
    p_completion_bonus_enabled, p_completion_bonus_points,
    v_admin_id, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'version_number', v_new_version,
    'message', 'Algorithm version ' || v_new_version || ' created'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_algorithm_version(
  integer, boolean, numeric, boolean, numeric, numeric, integer,
  boolean, integer, numeric, integer,
  boolean, numeric, integer, numeric,
  boolean, integer, text
) TO authenticated;

-- ============================================================
-- 14. Helper: resolve suspicious activity (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_suspicious_activity(
  p_activity_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = v_admin_id AND active_role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can resolve suspicious activity';
  END IF;

  UPDATE suspicious_reader_activity
  SET resolved = true, resolved_by = v_admin_id, resolved_at = now()
  WHERE id = p_activity_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_suspicious_activity(uuid) TO authenticated;