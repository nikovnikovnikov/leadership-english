-- 0023_user_assessments.sql
-- CEFR placement assessment: persisted results + hidden rank tag.

-- Results history (one row per attempt)
CREATE TABLE public.user_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0',
  score_raw int NOT NULL,
  score_scaled int NOT NULL,
  band text NOT NULL CHECK (band IN ('A1','A2','B1','B2','C1','C2')),
  skill_scores jsonb NOT NULL,
  answers jsonb NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_assessments_user ON user_assessments(user_id, taken_at DESC);

ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assessment select own or admin"
  ON user_assessments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Assessment insert own"
  ON user_assessments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Track "skip for now" so we only prompt once per sessionless path
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assessment_skipped_at timestamptz;

-- Record an assessment attempt and keep the hidden CEFR tag in sync.
-- Runs as security definer because profile_tags is admin-managed (RLS).
CREATE OR REPLACE FUNCTION public.record_assessment(
  p_version text,
  p_score_raw int,
  p_score_scaled int,
  p_band text,
  p_skill_scores jsonb,
  p_answers jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tag_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_band NOT IN ('A1','A2','B1','B2','C1','C2') THEN
    RAISE EXCEPTION 'invalid band';
  END IF;

  INSERT INTO user_assessments (user_id, version, score_raw, score_scaled, band, skill_scores, answers)
  VALUES (v_user_id, p_version, p_score_raw, p_score_scaled, p_band, p_skill_scores, p_answers);

  -- Upsert the hidden tag for this band (visibility defaults to 'admin')
  INSERT INTO tags (name, visibility)
  VALUES ('CEFR ' || p_band, 'admin')
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_tag_id;

  -- Remove any previously assigned CEFR band tag for this user
  DELETE FROM profile_tags
  WHERE profile_id = v_user_id
    AND tag_id IN (SELECT id FROM tags WHERE name LIKE 'CEFR %');

  INSERT INTO profile_tags (profile_id, tag_id, assigned_by)
  VALUES (v_user_id, v_tag_id, v_user_id)
  ON CONFLICT (profile_id, tag_id) DO NOTHING;

  RETURN p_band;
END;
$$;