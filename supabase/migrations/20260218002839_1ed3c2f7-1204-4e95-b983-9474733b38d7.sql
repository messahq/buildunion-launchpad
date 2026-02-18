
-- ============================================
-- FIX: Allow authenticated users to see profile names
-- The existing RESTRICTIVE policies block viewing other users' names
-- ============================================

-- 1. Fix profiles table: Drop the broken "deny all anonymous" policy 
-- and the redundant "authenticated can view all" restrictive policy,
-- then add a proper PERMISSIVE SELECT for authenticated users
DROP POLICY IF EXISTS "Deny all anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Single PERMISSIVE SELECT: authenticated users can view all profiles (name, avatar)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix bu_profiles table: Add PERMISSIVE policy so team members can see names
-- The existing RESTRICTIVE policies block direct queries for other users
DROP POLICY IF EXISTS "Users can only view their own profile directly" ON public.bu_profiles;
DROP POLICY IF EXISTS "Team members can view collaborator bu_profiles" ON public.bu_profiles;

-- PERMISSIVE: Users can view their own profile OR profiles of project collaborators OR public profiles
CREATE POLICY "View own bu_profile"
ON public.bu_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "View team collaborator bu_profiles"
ON public.bu_profiles
FOR SELECT
TO authenticated
USING (users_share_project(auth.uid(), user_id));

CREATE POLICY "View public bu_profiles"
ON public.bu_profiles
FOR SELECT
TO authenticated
USING (is_public_profile = true AND profile_completed = true);
