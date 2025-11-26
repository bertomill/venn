-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interests are viewable by everyone"
  ON interests FOR SELECT
  USING (true);

-- User interests (many-to-many)
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_id)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User interests are viewable by everyone"
  ON user_interests FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own interests"
  ON user_interests FOR ALL
  USING (auth.uid() = user_id);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  max_attendees INTEGER,
  image_url TEXT
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can update their events"
  ON events FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Event creators can delete their events"
  ON events FOR DELETE
  USING (auth.uid() = creator_id);

-- Event attendees
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('going', 'interested', 'maybe')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event attendees are viewable by everyone"
  ON event_attendees FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own attendance"
  ON event_attendees FOR ALL
  USING (auth.uid() = user_id);

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  is_private BOOLEAN DEFAULT false
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Community members (create this BEFORE the communities policies that reference it)
CREATE TABLE IF NOT EXISTS community_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Now create policies for communities (after community_members exists)
CREATE POLICY "Public communities are viewable by everyone"
  ON communities FOR SELECT
  USING (NOT is_private OR auth.uid() IN (
    SELECT user_id FROM community_members WHERE community_id = communities.id
  ));

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Community creators can update their communities"
  ON communities FOR UPDATE
  USING (auth.uid() = creator_id);

-- Community members policies
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members are viewable by everyone"
  ON community_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (auth.uid() = user_id);

-- Connections (friend requests)
CREATE TABLE IF NOT EXISTS connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON connections FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create connection requests"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update connections they're part of"
  ON connections FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function to find nearby users
CREATE OR REPLACE FUNCTION nearby_users(lat DOUBLE PRECISION, long DOUBLE PRECISION, radius_km INTEGER)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    (6371 * acos(
      cos(radians(lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(long)) +
      sin(radians(lat)) * sin(radians(p.latitude))
    )) AS distance
  FROM profiles p
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(long)) +
      sin(radians(lat)) * sin(radians(p.latitude))
    )) <= radius_km
  ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby events
CREATE OR REPLACE FUNCTION nearby_events(lat DOUBLE PRECISION, long DOUBLE PRECISION, radius_km INTEGER)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMPTZ,
  location TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.location,
    (6371 * acos(
      cos(radians(lat)) * cos(radians(e.latitude)) *
      cos(radians(e.longitude) - radians(long)) +
      sin(radians(lat)) * sin(radians(e.latitude))
    )) AS distance
  FROM events e
  WHERE e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND e.start_date >= NOW()
    AND (6371 * acos(
      cos(radians(lat)) * cos(radians(e.latitude)) *
      cos(radians(e.longitude) - radians(long)) +
      sin(radians(lat)) * sin(radians(e.latitude))
    )) <= radius_km
  ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- Insert default interests
INSERT INTO interests (name, category) VALUES
  -- Wellness
  ('Yoga', 'Wellness'),
  ('Meditation', 'Wellness'),
  ('Fitness', 'Wellness'),
  ('Mental Health', 'Wellness'),
  ('Nutrition', 'Wellness'),

  -- Creative
  ('Art', 'Creative'),
  ('Music', 'Creative'),
  ('Writing', 'Creative'),
  ('Photography', 'Creative'),
  ('Dance', 'Creative'),

  -- Professional
  ('Entrepreneurship', 'Professional'),
  ('Technology', 'Professional'),
  ('Marketing', 'Professional'),
  ('Design', 'Professional'),
  ('Networking', 'Professional'),

  -- Social
  ('Community Building', 'Social'),
  ('Volunteering', 'Social'),
  ('Events', 'Social'),
  ('Meetups', 'Social'),

  -- Learning
  ('Self-Development', 'Learning'),
  ('Reading', 'Learning'),
  ('Podcasts', 'Learning'),
  ('Workshops', 'Learning')
ON CONFLICT (name) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
