-- Posts and Media Schema for Pinterest-style Feed
-- Run this in your Supabase SQL editor

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  caption TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0
);

-- Index for feed queries
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_published = true);

-- Users can view their own unpublished posts
CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own posts
CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POST MEDIA TABLE (supports multiple images/videos per post)
-- ============================================
CREATE TABLE IF NOT EXISTS post_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(5,3) GENERATED ALWAYS AS (
    CASE WHEN height > 0 THEN width::DECIMAL / height::DECIMAL ELSE 1 END
  ) STORED,
  duration_seconds INTEGER, -- For videos
  thumbnail_url TEXT, -- For video thumbnails
  display_order INTEGER DEFAULT 0,
  alt_text TEXT -- Accessibility
);

CREATE INDEX idx_post_media_post_id ON post_media(post_id);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- Media viewable if parent post is viewable
CREATE POLICY "Post media is viewable by everyone"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND (posts.is_published = true OR posts.user_id = auth.uid())
    )
  );

-- Users can add media to their own posts
CREATE POLICY "Users can add media to their own posts"
  ON post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Users can update media on their own posts
CREATE POLICY "Users can update their own post media"
  ON post_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Users can delete media from their own posts
CREATE POLICY "Users can delete their own post media"
  ON post_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- ============================================
-- POST TAGS (link posts to interests for discovery)
-- ============================================
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  interest_id UUID REFERENCES interests(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, interest_id)
);

CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_interest_id ON post_tags(interest_id);

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can tag their own posts"
  ON post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove tags from their own posts"
  ON post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- ============================================
-- POST LIKES
-- ============================================
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post likes are viewable by everyone"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POST SAVES (Pinterest-style bookmarks)
-- ============================================
CREATE TABLE IF NOT EXISTS post_saves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  board_name TEXT DEFAULT 'Saved', -- Simple board/collection name
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_saves_post_id ON post_saves(post_id);
CREATE INDEX idx_post_saves_user_id ON post_saves(user_id);

ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saves
CREATE POLICY "Users can view their own saves"
  ON post_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
  ON post_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON post_saves FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their saves"
  ON post_saves FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- POST COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For replies
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false
);

CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX idx_post_comments_parent ON post_comments(parent_comment_id);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET FOR POST MEDIA
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-media bucket
CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "Users can update their post media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-media')
WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "Public post media access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');

CREATE POLICY "Users can delete their post media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get post with engagement counts
CREATE OR REPLACE FUNCTION get_post_with_counts(post_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  caption TEXT,
  created_at TIMESTAMPTZ,
  like_count BIGINT,
  save_count BIGINT,
  comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.caption,
    p.created_at,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM post_saves WHERE post_id = p.id) as save_count,
    (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
  FROM posts p
  WHERE p.id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- Get feed posts (chronological, with option to filter by interests)
CREATE OR REPLACE FUNCTION get_feed_posts(
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0,
  filter_interest_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  caption TEXT,
  location TEXT,
  created_at TIMESTAMPTZ,
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
    p.caption,
    p.location,
    p.created_at,
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
-- TRIGGERS
-- ============================================

-- Update timestamp trigger for posts
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for comments
CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
