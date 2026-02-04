-- Allow all authenticated users to view profiles (for team member names)
-- This is safe because profiles only contains: username, full_name, avatar_url (no PII like email/phone)
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);