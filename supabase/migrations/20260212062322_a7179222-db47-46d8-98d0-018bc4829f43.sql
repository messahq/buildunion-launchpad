
-- Trigger: When a pending_budget_change is inserted, create a notification for the project owner
CREATE OR REPLACE FUNCTION public.notify_owner_on_pending_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_project_name text;
  v_requester_name text;
BEGIN
  -- Get project owner
  SELECT user_id, name INTO v_owner_id, v_project_name
  FROM projects WHERE id = NEW.project_id;

  IF v_owner_id IS NULL THEN RETURN NEW; END IF;

  -- Get requester name
  SELECT COALESCE(full_name, username, 'Team member') INTO v_requester_name
  FROM profiles WHERE user_id = NEW.requested_by
  LIMIT 1;

  -- Insert notification for owner
  INSERT INTO notification_logs (user_id, title, body, status, link, data)
  VALUES (
    v_owner_id,
    'Budget Modification Request',
    v_requester_name || ' requests a change to "' || NEW.item_name || '" in ' || COALESCE(v_project_name, 'your project'),
    'sent',
    '/buildunion/project/' || NEW.project_id::text,
    jsonb_build_object(
      'type', 'budget_modification',
      'change_id', NEW.id,
      'project_id', NEW.project_id,
      'item_name', NEW.item_name,
      'requested_by', NEW.requested_by
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_owner_on_pending_change
AFTER INSERT ON public.pending_budget_changes
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_on_pending_change();
