-- Fix the match_users function - event_vibe should be text[] not text
-- Run this in your Supabase SQL editor

DROP FUNCTION IF EXISTS match_users(vector(1536), uuid, int);

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
