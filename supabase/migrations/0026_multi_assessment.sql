-- 0026_multi_assessment.sql
-- Generalize assessments so multiple assessment types can coexist.
--
-- `user_assessments` currently stores only the CEFR placement result and its
-- hidden band tag. We add an `assessment_type` discriminator (default
-- 'placement') and make `band` optional so non-CEFR assessments (e.g. the
-- idioms knowledge test) can be stored without forcing a CEFR band.
--
-- The `record_assessment` RPC gains a `p_assessment_type` argument and only
-- does the CEFR tag bookkeeping for the placement assessment.

ALTER TABLE public.user_assessments
  ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'placement';

-- The CEFR band concept belongs to the placement assessment; other
-- assessment types store a raw/scaled score without a band. Drop the NOT NULL
-- band constraint and the band CHECK (the check would reject e.g. an idioms
-- result that carries no band). A fresh CHECK scoped to type is enforced in
-- the RPC and app layer instead.
ALTER TABLE public.user_assessments ALTER COLUMN band DROP NOT NULL;
ALTER TABLE public.user_assessments DROP CONSTRAINT IF EXISTS user_assessments_band_check;

CREATE INDEX IF NOT EXISTS idx_user_assessments_type_user
  ON user_assessments(assessment_type, user_id, taken_at DESC);

-- Generalized record function.
-- For the placement assessment it still maintains the hidden CEFR tag.
-- Drop the legacy single-assessment overload (its signature is distinct due to
-- the added p_assessment_type argument, so CREATE OR REPLACE cannot replace it).
DROP FUNCTION IF EXISTS public.record_assessment(
  p_version text, p_score_raw int, p_score_scaled int, p_band text, p_skill_scores jsonb, p_answers jsonb
);

CREATE OR REPLACE FUNCTION public.record_assessment(
  p_assessment_type text,
  p_version text,
  p_score_raw int,
  p_score_scaled int,
  p_band text DEFAULT NULL,
  p_skill_scores jsonb DEFAULT '{}'::jsonb,
  p_answers jsonb DEFAULT '{}'::jsonb
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

  IF p_assessment_type = 'placement' THEN
    IF p_band IS NULL OR p_band NOT IN ('A1','A2','B1','B2','C1','C2') THEN
      RAISE EXCEPTION 'placement requires a valid CEFR band';
    END IF;
  ELSIF p_assessment_type = 'idioms' THEN
    IF p_band IS NOT NULL THEN
      RAISE EXCEPTION 'idioms assessment does not carry a CEFR band';
    END IF;
  ELSE
    RAISE EXCEPTION 'unknown assessment type';
  END IF;

  INSERT INTO user_assessments
    (user_id, assessment_type, version, score_raw, score_scaled, band, skill_scores, answers)
  VALUES
    (v_user_id, p_assessment_type, p_version, p_score_raw, p_score_scaled, p_band, p_skill_scores, p_answers);

  -- Placement-only: keep the hidden CEFR band tag in sync.
  IF p_assessment_type = 'placement' THEN
    INSERT INTO tags (name, visibility)
    VALUES ('CEFR ' || p_band, 'admin')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_tag_id;

    DELETE FROM profile_tags
    WHERE profile_id = v_user_id
      AND tag_id IN (SELECT id FROM tags WHERE name LIKE 'CEFR %');

    INSERT INTO profile_tags (profile_id, tag_id, assigned_by)
    VALUES (v_user_id, v_tag_id, v_user_id)
    ON CONFLICT (profile_id, tag_id) DO NOTHING;
  END IF;

  RETURN p_assessment_type;
END;
$$;