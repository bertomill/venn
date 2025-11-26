-- Enable pgvector extension for vector similarity search
-- Run this migration in your Supabase SQL editor

-- 1. Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to profiles (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Create an index for fast similarity search
CREATE INDEX IF NOT EXISTS profiles_embedding_idx ON profiles
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Create a function to find similar users
CREATE OR REPLACE FUNCTION match_users(
  query_embedding vector(1536),
  current_user_id uuid,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  bio text,
  location text,
  avatar_url text,
  about_me text,
  looking_for text,
  event_size_preference text,
  event_vibe text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.bio,
    p.location,
    p.avatar_url,
    p.about_me,
    p.looking_for,
    p.event_size_preference,
    p.event_vibe,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM profiles p
  WHERE p.id != current_user_id
    AND p.embedding IS NOT NULL
    AND p.full_name IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Add a trigger to clear embedding when profile is updated (so it gets regenerated)
CREATE OR REPLACE FUNCTION clear_embedding_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only clear if relevant fields changed
  IF (OLD.about_me IS DISTINCT FROM NEW.about_me) OR
     (OLD.looking_for IS DISTINCT FROM NEW.looking_for) OR
     (OLD.bio IS DISTINCT FROM NEW.bio) OR
     (OLD.event_vibe IS DISTINCT FROM NEW.event_vibe) THEN
    NEW.embedding = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clear_embedding_trigger ON profiles;
CREATE TRIGGER clear_embedding_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION clear_embedding_on_profile_change();
