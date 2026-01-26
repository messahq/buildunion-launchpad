-- Drop existing trigger if it exists on user_draft_data
DROP TRIGGER IF EXISTS update_user_draft_data_updated_at ON public.user_draft_data;

-- Create a specific function for user_draft_data that uses last_updated
CREATE OR REPLACE FUNCTION public.update_last_updated_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$function$;

-- Create trigger for user_draft_data using the correct column name
CREATE TRIGGER update_user_draft_data_last_updated
BEFORE UPDATE ON public.user_draft_data
FOR EACH ROW
EXECUTE FUNCTION public.update_last_updated_column();