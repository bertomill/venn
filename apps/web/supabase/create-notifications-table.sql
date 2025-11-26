-- Create notifications table for friend requests, acceptances, etc.
-- Run this in your Supabase SQL editor

-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'event_rsvp', 'event_reminder')),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_read_idx ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow inserting notifications (for triggers and API)
-- We use service role for inserts, so this is permissive
CREATE POLICY "Allow notification inserts"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a function to automatically create notification on friend request
CREATE OR REPLACE FUNCTION create_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for new pending connections
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, from_user_id, data)
    VALUES (
      NEW.user2_id,  -- The person receiving the request
      'friend_request',
      NEW.user1_id,  -- The person sending the request
      jsonb_build_object('connection_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for friend requests
DROP TRIGGER IF EXISTS on_friend_request ON connections;
CREATE TRIGGER on_friend_request
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_request_notification();

-- Create a function to notify when friend request is accepted
CREATE OR REPLACE FUNCTION create_friend_accepted_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification when status changes to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, from_user_id, data)
    VALUES (
      NEW.user1_id,  -- The person who sent the original request
      'friend_accepted',
      NEW.user2_id,  -- The person who accepted
      jsonb_build_object('connection_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for friend request acceptance
DROP TRIGGER IF EXISTS on_friend_accepted ON connections;
CREATE TRIGGER on_friend_accepted
  AFTER UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_accepted_notification();
