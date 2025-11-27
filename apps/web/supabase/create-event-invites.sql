-- Create event_invites table for inviting friends to events
-- Run this in your Supabase SQL editor

-- Create the event_invites table
CREATE TABLE IF NOT EXISTS event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, invitee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS event_invites_event_id_idx ON event_invites(event_id);
CREATE INDEX IF NOT EXISTS event_invites_inviter_id_idx ON event_invites(inviter_id);
CREATE INDEX IF NOT EXISTS event_invites_invitee_id_idx ON event_invites(invitee_id);
CREATE INDEX IF NOT EXISTS event_invites_status_idx ON event_invites(status);

-- Enable RLS
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they sent or received
CREATE POLICY "Users can view own invites"
ON event_invites FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Users can create invites (send invitations)
CREATE POLICY "Users can send invites"
ON event_invites FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

-- Users can update invites they received (accept/decline)
CREATE POLICY "Invitees can respond to invites"
ON event_invites FOR UPDATE
USING (auth.uid() = invitee_id);

-- Users can delete invites they sent
CREATE POLICY "Inviters can cancel invites"
ON event_invites FOR DELETE
USING (auth.uid() = inviter_id);

-- ============================================
-- Add 'event_invite' to notification types
-- ============================================
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'friend_request',
  'friend_accepted',
  'event_rsvp',
  'event_reminder',
  'event_invite',
  'post_like',
  'post_comment',
  'post_save',
  'comment_reply'
));

-- Add event_invite_id column for invite-related notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS event_invite_id UUID REFERENCES event_invites(id) ON DELETE CASCADE;

-- ============================================
-- TRIGGER: Notify user when they receive an event invite
-- ============================================
CREATE OR REPLACE FUNCTION create_event_invite_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, from_user_id, event_id, event_invite_id, data)
  VALUES (
    NEW.invitee_id,
    'event_invite',
    NEW.inviter_id,
    NEW.event_id,
    NEW.id,
    jsonb_build_object('message', COALESCE(NEW.message, ''))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_invite ON event_invites;
CREATE TRIGGER on_event_invite
  AFTER INSERT ON event_invites
  FOR EACH ROW
  EXECUTE FUNCTION create_event_invite_notification();

-- ============================================
-- Helper function to get pending invites for a user
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_event_invites(user_uuid UUID)
RETURNS TABLE (
  invite_id UUID,
  event_id UUID,
  event_title TEXT,
  event_start_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  inviter_id UUID,
  inviter_name TEXT,
  inviter_avatar TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ei.id as invite_id,
    ei.event_id,
    e.title as event_title,
    e.start_date as event_start_date,
    e.location as event_location,
    ei.inviter_id,
    p.full_name as inviter_name,
    p.avatar_url as inviter_avatar,
    ei.message,
    ei.created_at
  FROM event_invites ei
  JOIN events e ON e.id = ei.event_id
  JOIN profiles p ON p.id = ei.inviter_id
  WHERE ei.invitee_id = user_uuid
    AND ei.status = 'pending'
  ORDER BY ei.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
