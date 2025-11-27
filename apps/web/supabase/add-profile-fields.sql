-- Add new profile fields for enhanced profile page
-- Run this in Supabase SQL Editor

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobbies text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music_genres text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_background text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS want_to_try text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passions text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS here_for text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS communities text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS similar_personalities text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS opposite_personalities text[] DEFAULT '{}';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'date_of_birth',
  'hobbies',
  'music_genres',
  'professional_background',
  'want_to_try',
  'passions',
  'here_for',
  'communities',
  'similar_personalities',
  'opposite_personalities'
)
ORDER BY column_name;
