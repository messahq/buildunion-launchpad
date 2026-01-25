-- Add public profile visibility to bu_profiles
ALTER TABLE public.bu_profiles 
ADD COLUMN IF NOT EXISTS is_public_profile boolean DEFAULT false;

-- Create forum posts table
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  replies_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create forum replies table
CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Forum posts policies - anyone authenticated can view, only author can modify
CREATE POLICY "Anyone can view forum posts"
  ON public.forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own posts"
  ON public.forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.forum_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.forum_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Forum replies policies
CREATE POLICY "Anyone can view forum replies"
  ON public.forum_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own replies"
  ON public.forum_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies"
  ON public.forum_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON public.forum_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to increment replies count
CREATE OR REPLACE FUNCTION public.increment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.forum_posts 
  SET replies_count = replies_count + 1, updated_at = now()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement replies count
CREATE OR REPLACE FUNCTION public.decrement_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.forum_posts 
  SET replies_count = GREATEST(0, replies_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for reply count
CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.increment_replies_count();

CREATE TRIGGER on_reply_deleted
  AFTER DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.decrement_replies_count();

-- Update bu_profiles RLS to allow viewing public profiles
DROP POLICY IF EXISTS "Users can view own and collaborator profiles" ON public.bu_profiles;

CREATE POLICY "Users can view own, collaborator, and public profiles"
  ON public.bu_profiles FOR SELECT
  USING (
    (auth.uid() = user_id) 
    OR users_share_project(auth.uid(), user_id)
    OR (is_public_profile = true AND profile_completed = true)
  );

-- Enable realtime for forum
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;