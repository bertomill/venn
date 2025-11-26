-- Create messages table for direct messaging
-- Run this in your Supabase SQL editor

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure sender and receiver are different
  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- Composite index for conversation queries (messages between two users)
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages they sent or received
CREATE POLICY "Users can view own messages"
ON messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages (insert where they are the sender)
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (to mark as read)
CREATE POLICY "Users can mark received messages as read"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Users can delete their own sent messages (optional)
CREATE POLICY "Users can delete own sent messages"
ON messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Create a function to get conversations with last message
-- This returns a list of users you've messaged with, along with the last message
CREATE OR REPLACE FUNCTION get_conversations(current_user_id UUID)
RETURNS TABLE (
  other_user_id UUID,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_created_at TIMESTAMP WITH TIME ZONE,
  last_message_sender_id UUID,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH conversation_partners AS (
    -- Get all unique users we've had conversations with
    SELECT DISTINCT
      CASE
        WHEN sender_id = current_user_id THEN receiver_id
        ELSE sender_id
      END AS partner_id
    FROM messages
    WHERE sender_id = current_user_id OR receiver_id = current_user_id
  ),
  last_messages AS (
    -- Get the last message for each conversation
    SELECT DISTINCT ON (
      LEAST(m.sender_id, m.receiver_id),
      GREATEST(m.sender_id, m.receiver_id)
    )
      m.id,
      m.content,
      m.created_at,
      m.sender_id,
      CASE
        WHEN m.sender_id = current_user_id THEN m.receiver_id
        ELSE m.sender_id
      END AS partner_id
    FROM messages m
    WHERE m.sender_id = current_user_id OR m.receiver_id = current_user_id
    ORDER BY
      LEAST(m.sender_id, m.receiver_id),
      GREATEST(m.sender_id, m.receiver_id),
      m.created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages per conversation
    SELECT
      sender_id AS from_user_id,
      COUNT(*) AS unread
    FROM messages
    WHERE receiver_id = current_user_id AND read = false
    GROUP BY sender_id
  )
  SELECT
    lm.partner_id AS other_user_id,
    lm.id AS last_message_id,
    lm.content AS last_message_content,
    lm.created_at AS last_message_created_at,
    lm.sender_id AS last_message_sender_id,
    COALESCE(uc.unread, 0) AS unread_count
  FROM last_messages lm
  LEFT JOIN unread_counts uc ON uc.from_user_id = lm.partner_id
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
