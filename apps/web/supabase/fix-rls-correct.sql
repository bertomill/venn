-- Drop the existing problematic INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a new INSERT policy that works with Supabase Auth
-- This allows users to create their profile right after signup
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

