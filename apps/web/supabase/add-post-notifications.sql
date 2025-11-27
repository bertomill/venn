-- Add post notification types to existing notifications table
-- Run this in your Supabase SQL editor

-- First, drop the existing type constraint and add new types
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'friend_request',
  'friend_accepted',
  'event_rsvp',
  'event_reminder',
  'post_like',
  'post_comment',
  'post_save',
  'comment_reply'
));

-- Add post_id column for post-related notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE CASCADE;

-- Add comment_id column for comment-related notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE;

-- Create index for post notifications
CREATE INDEX IF NOT EXISTS notifications_post_id_idx ON notifications(post_id);

-- ============================================
-- TRIGGER: Notify post owner when someone likes their post
-- ============================================
CREATE OR REPLACE FUNCTION create_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user likes their own post
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, from_user_id, post_id, data)
    VALUES (
      post_owner_id,
      'post_like',
      NEW.user_id,
      NEW.post_id,
      jsonb_build_object('like_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like ON post_likes;
CREATE TRIGGER on_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_post_like_notification();

-- ============================================
-- TRIGGER: Notify post owner when someone comments on their post
-- ============================================
CREATE OR REPLACE FUNCTION create_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  parent_comment_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- If this is a reply, also notify the parent comment owner
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_owner_id
    FROM post_comments
    WHERE id = NEW.parent_comment_id;

    -- Notify parent comment owner (if not the same person)
    IF parent_comment_owner_id IS NOT NULL AND parent_comment_owner_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, from_user_id, post_id, comment_id, data)
      VALUES (
        parent_comment_owner_id,
        'comment_reply',
        NEW.user_id,
        NEW.post_id,
        NEW.id,
        jsonb_build_object('parent_comment_id', NEW.parent_comment_id)
      );
    END IF;
  END IF;

  -- Notify post owner (if not the commenter and not already notified as parent comment owner)
  IF post_owner_id IS NOT NULL
     AND post_owner_id != NEW.user_id
     AND (parent_comment_owner_id IS NULL OR post_owner_id != parent_comment_owner_id) THEN
    INSERT INTO notifications (user_id, type, from_user_id, post_id, comment_id, data)
    VALUES (
      post_owner_id,
      'post_comment',
      NEW.user_id,
      NEW.post_id,
      NEW.id,
      '{}'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_comment ON post_comments;
CREATE TRIGGER on_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_post_comment_notification();

-- ============================================
-- TRIGGER: Notify post owner when someone saves their post
-- ============================================
CREATE OR REPLACE FUNCTION create_post_save_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user saves their own post
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, from_user_id, post_id, data)
    VALUES (
      post_owner_id,
      'post_save',
      NEW.user_id,
      NEW.post_id,
      jsonb_build_object('save_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_save ON post_saves;
CREATE TRIGGER on_post_save
  AFTER INSERT ON post_saves
  FOR EACH ROW
  EXECUTE FUNCTION create_post_save_notification();
