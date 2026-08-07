/*
# WhittleScript — Reader Assignment Engine

SECURITY DEFINER functions for screenplay assignment and review completion.
*/

CREATE OR REPLACE FUNCTION assign_screenplay_to_reader(p_reader_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_assignment uuid;
  v_screenplay_id uuid;
  v_version_id uuid;
  v_assignment_id uuid;
  v_result jsonb;
BEGIN
  -- Check if reader already has an active assignment
  SELECT id INTO v_existing_assignment
  FROM reader_assignments
  WHERE reader_id = p_reader_id AND status = 'active';

  IF v_existing_assignment IS NOT NULL THEN
    SELECT jsonb_build_object(
      'assignment_id', ra.id,
      'screenplay_id', sp.id,
      'screenplay_version_id', ra.screenplay_version_id,
      'title', sp.title,
      'logline', sp.logline,
      'genre', sp.genre,
      'format', sp.format,
      'page_count', sp.page_count,
      'language', sp.language,
      'estimated_budget', sp.estimated_budget,
      'assigned_at', ra.assigned_at,
      'current_page', ra.current_page,
      'reading_progress', ra.reading_progress,
      'status', ra.status
    ) INTO v_result
    FROM reader_assignments ra
    JOIN screenplays sp ON sp.id = ra.screenplay_id
    WHERE ra.id = v_existing_assignment;
    RETURN v_result;
  END IF;

  -- Find the best screenplay to assign
  SELECT sp.id INTO v_screenplay_id
  FROM screenplays sp
  WHERE sp.writer_id != p_reader_id
    AND sp.is_deleted = false
    AND sp.is_archived = false
    AND sp.status IN ('submitted', 'awaiting_assignment')
    AND sp.id NOT IN (SELECT screenplay_id FROM reader_assignments WHERE reader_id = p_reader_id)
    AND sp.writer_id NOT IN (SELECT blocked_user_id FROM blocked_users WHERE blocker_id = p_reader_id)
    AND EXISTS (
      SELECT 1 FROM screenplay_versions sv
      WHERE sv.screenplay_id = sp.id AND sv.is_active = true AND sv.is_archived = false
    )
  ORDER BY
    (SELECT count(*) FROM reader_assignments ra2 WHERE ra2.screenplay_id = sp.id) ASC,
    sp.updated_at ASC
  LIMIT 1;

  IF v_screenplay_id IS NULL THEN
    RETURN jsonb_build_object('assignment_id', null, 'message', 'No screenplays available for assignment');
  END IF;

  SELECT id INTO v_version_id
  FROM screenplay_versions
  WHERE screenplay_id = v_screenplay_id AND is_active = true AND is_archived = false
  LIMIT 1;

  INSERT INTO reader_assignments (reader_id, screenplay_id, screenplay_version_id, status)
  VALUES (p_reader_id, v_screenplay_id, v_version_id, 'active')
  RETURNING id INTO v_assignment_id;

  SELECT jsonb_build_object(
    'assignment_id', v_assignment_id,
    'screenplay_id', sp.id,
    'screenplay_version_id', v_version_id,
    'title', sp.title,
    'logline', sp.logline,
    'genre', sp.genre,
    'format', sp.format,
    'page_count', sp.page_count,
    'language', sp.language,
    'estimated_budget', sp.estimated_budget,
    'assigned_at', now(),
    'current_page', 1,
    'reading_progress', 0,
    'status', 'active'
  ) INTO v_result
  FROM screenplays sp
  WHERE sp.id = v_screenplay_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_screenplay_to_reader(uuid) TO authenticated;

-- Function to complete an assignment and award credits
CREATE OR REPLACE FUNCTION complete_reader_assignment(
  p_assignment_id uuid,
  p_decision text,
  p_finished boolean,
  p_recommendation boolean,
  p_feedback text,
  p_notes text,
  p_stop_reason text,
  p_page_abandoned integer,
  p_reading_time_ms bigint,
  p_session_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment reader_assignments%ROWTYPE;
  v_reader_id uuid;
  v_credits_per_review integer;
  v_behaviour reader_behaviour%ROWTYPE;
  v_total_assignments integer;
  v_total_completed integer;
  v_completion_rate numeric(5,2);
  v_reco_rate numeric(5,2);
BEGIN
  SELECT * INTO v_assignment FROM reader_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  v_reader_id := v_assignment.reader_id;

  UPDATE reader_assignments
  SET status = CASE WHEN p_decision = 'finished' THEN 'completed' WHEN p_decision = 'stopped' THEN 'abandoned' ELSE 'active' END,
      completed_at = CASE WHEN p_decision IN ('finished', 'stopped') THEN now() ELSE NULL END,
      total_reading_time_ms = p_reading_time_ms,
      session_count = p_session_count
  WHERE id = p_assignment_id;

  INSERT INTO reader_decisions (
    assignment_id, reader_id, decision, finished_screenplay,
    recommendation, written_feedback, private_notes,
    stop_reason, page_abandoned, reading_time_ms, session_count
  ) VALUES (
    p_assignment_id, v_reader_id, p_decision, p_finished,
    p_recommendation, p_feedback, p_notes,
    p_stop_reason, p_page_abandoned, p_reading_time_ms, p_session_count
  );

  IF p_decision = 'finished' AND p_recommendation IS NOT NULL THEN
    INSERT INTO recommendations (assignment_id, reader_id, recommended)
    VALUES (p_assignment_id, v_reader_id, p_recommendation)
    ON CONFLICT (assignment_id) DO NOTHING;
  END IF;

  IF p_decision = 'finished' THEN
    SELECT credits_per_review INTO v_credits_per_review FROM platform_settings WHERE id = 1;

    UPDATE submission_credits
    SET balance = balance + v_credits_per_review,
        total_earned = total_earned + v_credits_per_review
    WHERE user_id = v_reader_id;

    INSERT INTO credit_transactions (user_id, amount, type, reason, screenplay_id)
    SELECT v_reader_id, v_credits_per_review, 'earned', 'Review completed', v_assignment.screenplay_id
    WHERE v_credits_per_review > 0;
  END IF;

  -- Update reader behaviour
  SELECT * INTO v_behaviour FROM reader_behaviour WHERE reader_id = v_reader_id;
  IF NOT FOUND THEN
    INSERT INTO reader_behaviour (reader_id) VALUES (v_reader_id);
    SELECT * INTO v_behaviour FROM reader_behaviour WHERE reader_id = v_reader_id;
  END IF;

  v_total_assignments := v_behaviour.total_assignments + 1;
  v_total_completed := v_behaviour.total_completed + CASE WHEN p_decision = 'finished' THEN 1 ELSE 0 END;
  v_completion_rate := CASE WHEN v_total_assignments > 0 THEN ROUND((v_total_completed::numeric / v_total_assignments) * 100, 2) ELSE 0 END;
  v_reco_rate := CASE WHEN v_total_completed > 0 THEN
    ROUND(((v_behaviour.total_completed + CASE WHEN p_decision = 'finished' AND p_recommendation = true THEN 1 ELSE 0 END)::numeric /
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

  IF p_decision = 'finished' THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (v_reader_id, 'reviews', 'Review Completed', 'You have earned submission credits for completing a review.', '/app/reviews');
  END IF;

  RETURN jsonb_build_object('success', true, 'decision', p_decision);
END;
$$;

GRANT EXECUTE ON FUNCTION complete_reader_assignment(uuid, text, boolean, boolean, text, text, text, integer, bigint, integer) TO authenticated;
