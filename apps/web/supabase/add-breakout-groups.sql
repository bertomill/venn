-- Migration for breakout groups feature
-- Groups event attendees into clusters of 4-6 people based on shared interests

-- Breakout groups table (stores generated groups for an event)
CREATE TABLE IF NOT EXISTS breakout_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shared_interests TEXT[], -- Common interests that defined this group
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE breakout_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Breakout groups are viewable by everyone"
  ON breakout_groups FOR SELECT
  USING (true);

CREATE POLICY "Event creators can manage breakout groups"
  ON breakout_groups FOR ALL
  USING (
    auth.uid() IN (
      SELECT creator_id FROM events WHERE id = event_id
    )
  );

-- Breakout group members
CREATE TABLE IF NOT EXISTS breakout_group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES breakout_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE breakout_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Breakout group members are viewable by everyone"
  ON breakout_group_members FOR SELECT
  USING (true);

CREATE POLICY "Event creators can manage breakout group members"
  ON breakout_group_members FOR ALL
  USING (
    auth.uid() IN (
      SELECT e.creator_id
      FROM events e
      JOIN breakout_groups bg ON bg.event_id = e.id
      WHERE bg.id = group_id
    )
  );

-- Function to get attendees with their interests for clustering
CREATE OR REPLACE FUNCTION get_event_attendees_with_interests(target_event_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  interests TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(
      ARRAY_AGG(i.name) FILTER (WHERE i.name IS NOT NULL),
      ARRAY[]::TEXT[]
    ) as interests
  FROM event_attendees ea
  JOIN profiles p ON p.id = ea.user_id
  LEFT JOIN user_interests ui ON ui.user_id = p.id
  LEFT JOIN interests i ON i.id = ui.interest_id
  WHERE ea.event_id = target_event_id
    AND ea.status = 'going'
  GROUP BY p.id, p.full_name, p.avatar_url;
END;
$$;
