-- Fix: Restrict bu_profiles access to protect sensitive contractor data
-- Current policy allows ANY authenticated user to view ALL profiles (including phone, hourly_rate, GPS)
-- New approach: Users can view their own profile OR view collaborators they share a project with

-- First, create a security definer function to check if two users share a project
CREATE OR REPLACE FUNCTION public.users_share_project(_viewer_id uuid, _profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- They share a project if:
  -- 1. Viewer owns a project that profile_owner is a member of
  -- 2. Profile_owner owns a project that viewer is a member of
  -- 3. Both are members of the same project
  SELECT EXISTS (
    -- Viewer owns project, profile_owner is member
    SELECT 1 FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    WHERE p.user_id = _viewer_id AND pm.user_id = _profile_owner_id
  ) OR EXISTS (
    -- Profile_owner owns project, viewer is member
    SELECT 1 FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    WHERE p.user_id = _profile_owner_id AND pm.user_id = _viewer_id
  ) OR EXISTS (
    -- Both are members of the same project
    SELECT 1 FROM project_members pm1
    JOIN project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = _viewer_id AND pm2.user_id = _profile_owner_id
  )
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all BU profiles" ON public.bu_profiles;

-- Create new restrictive SELECT policy
-- Users can view profiles if they are the owner OR share a project with the profile owner
CREATE POLICY "Users can view own and collaborator profiles"
ON public.bu_profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.users_share_project(auth.uid(), user_id)
);