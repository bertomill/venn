-- Add new onboarding fields to profiles table
-- Run this migration in your Supabase SQL editor

-- About the user (free-form)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS about_me TEXT;

-- Who they want to meet (free-form)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for TEXT;

-- Event preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_size_preference TEXT
  CHECK (event_size_preference IN ('intimate', 'medium', 'large', 'any'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_vibe TEXT[];

-- Social media handles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Track onboarding completion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
