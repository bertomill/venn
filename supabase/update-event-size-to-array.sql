-- Update event_size_preference from TEXT to TEXT[] to allow multiple selections
-- Run this migration in your Supabase SQL editor

-- Drop the existing constraint and column
ALTER TABLE profiles DROP COLUMN IF EXISTS event_size_preference;

-- Re-add as an array type
ALTER TABLE profiles ADD COLUMN event_size_preference TEXT[];
