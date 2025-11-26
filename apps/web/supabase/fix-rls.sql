-- Drop the existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a more permissive INSERT policy that allows users to create their profile during signup
CREATE POLICY "Users can insert their own profile during signup"
  ON profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR
    auth.uid() IS NOT NULL
  );

-- Alternative: Allow authenticated users to insert if the ID matches
-- This is safer and what we actually want
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON profiles;

CREATE POLICY "Authenticated users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
