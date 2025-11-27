-- Add post types (Update, Project, Event) to posts table
-- Run this in your Supabase SQL editor

-- ============================================
-- ADD POST TYPE AND TYPE-SPECIFIC COLUMNS
-- ============================================

-- Add post_type column with default 'update' for existing posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS post_type TEXT
CHECK (post_type IN ('update', 'project', 'event'))
DEFAULT 'update';

-- Add title column (used by projects and events, optional for updates)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS title TEXT;

-- Project-specific fields
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS project_url TEXT; -- Main project link (website, app, etc.)

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS github_url TEXT; -- GitHub/source code link

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS project_status TEXT
CHECK (project_status IN ('in_progress', 'completed', 'on_hold'));

-- Event-specific fields (for events stored as posts)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ; -- When the event starts

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMPTZ; -- When the event ends (optional)

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS event_url TEXT; -- Registration/ticket link

-- Create index for filtering by post type
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);

-- Create index for upcoming events
CREATE INDEX IF NOT EXISTS idx_posts_event_date ON posts(event_date) WHERE post_type = 'event';

-- ============================================
-- UPDATE FEED FUNCTION TO INCLUDE NEW FIELDS
-- ============================================

-- Drop and recreate the function with new fields
DROP FUNCTION IF EXISTS get_feed_posts(INTEGER, INTEGER, UUID[]);

CREATE OR REPLACE FUNCTION get_feed_posts(
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0,
  filter_interest_ids UUID[] DEFAULT NULL,
  filter_post_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  post_type TEXT,
  title TEXT,
  caption TEXT,
  location TEXT,
  created_at TIMESTAMPTZ,
  -- Project fields
  project_url TEXT,
  github_url TEXT,
  project_status TEXT,
  -- Event fields
  event_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  event_url TEXT,
  -- Media and engagement
  media JSON,
  like_count BIGINT,
  comment_count BIGINT,
  tags JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    pr.full_name as user_name,
    pr.avatar_url as user_avatar,
    p.post_type,
    p.title,
    p.caption,
    p.location,
    p.created_at,
    p.project_url,
    p.github_url,
    p.project_status,
    p.event_date,
    p.event_end_date,
    p.event_url,
    (
      SELECT json_agg(json_build_object(
        'id', pm.id,
        'url', pm.media_url,
        'type', pm.media_type,
        'width', pm.width,
        'height', pm.height,
        'aspect_ratio', pm.aspect_ratio
      ) ORDER BY pm.display_order)
      FROM post_media pm WHERE pm.post_id = p.id
    ) as media,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
    (
      SELECT json_agg(json_build_object(
        'id', i.id,
        'name', i.name
      ))
      FROM post_tags pt
      JOIN interests i ON i.id = pt.interest_id
      WHERE pt.post_id = p.id
    ) as tags
  FROM posts p
  JOIN profiles pr ON pr.id = p.user_id
  WHERE p.is_published = true
    AND (
      filter_post_type IS NULL
      OR p.post_type = filter_post_type
    )
    AND (
      filter_interest_ids IS NULL
      OR EXISTS (
        SELECT 1 FROM post_tags pt
        WHERE pt.post_id = p.id
        AND pt.interest_id = ANY(filter_interest_ids)
      )
    )
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION FOR UPCOMING EVENTS
-- ============================================

CREATE OR REPLACE FUNCTION get_upcoming_event_posts(
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  title TEXT,
  caption TEXT,
  location TEXT,
  event_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  event_url TEXT,
  media JSON,
  like_count BIGINT,
  comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    pr.full_name as user_name,
    pr.avatar_url as user_avatar,
    p.title,
    p.caption,
    p.location,
    p.event_date,
    p.event_end_date,
    p.event_url,
    (
      SELECT json_agg(json_build_object(
        'id', pm.id,
        'url', pm.media_url,
        'type', pm.media_type,
        'width', pm.width,
        'height', pm.height
      ) ORDER BY pm.display_order)
      FROM post_media pm WHERE pm.post_id = p.id
    ) as media,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
  FROM posts p
  JOIN profiles pr ON pr.id = p.user_id
  WHERE p.is_published = true
    AND p.post_type = 'event'
    AND p.event_date >= NOW()
  ORDER BY p.event_date ASC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
