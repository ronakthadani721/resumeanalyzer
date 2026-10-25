CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_title TEXT NOT NULL,
  resume_label TEXT,
  similarity_score NUMERIC(5,2) NOT NULL,
  skill_coverage_score NUMERIC(5,2) NOT NULL,
  resume_word_count INTEGER NOT NULL DEFAULT 0,
  quality JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  bullet_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_method TEXT NOT NULL DEFAULT 'native-js-tfidf-v1'
);
CREATE INDEX IF NOT EXISTS analyses_user_created_idx ON analyses (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS analysis_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('matched', 'missing', 'additional')),
  learned BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (analysis_id, skill_name, status)
);
CREATE INDEX IF NOT EXISTS analysis_skills_user_idx ON analysis_skills (user_id, category, learned);