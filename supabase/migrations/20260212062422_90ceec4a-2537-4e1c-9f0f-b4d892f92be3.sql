
-- Trigger: Notify the requester when their pending change is approved or rejected
CREATE OR REPLACE FUNCTION public.notify_requester_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_project_name text;
  v_decision text;
BEGIN
  -- Only fire when status changes to approved or rejected
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;

  SELECT name INTO v_project_name FROM projects WHERE id = NEW.project_id;

  v_decision := CASE WHEN NEW.status = 'approved' THEN '✅ Approved' ELSE '❌ Rejected' END;

  INSERT INTO notification_logs (user_id, title, body, status, link, data)
  VALUES (
    NEW.requested_by,
    v_decision || ': ' || NEW.item_name,
    'Your modification request for "' || NEW.item_name || '" in ' || COALESCE(v_project_name, 'project') || ' has been ' || NEW.status || '.' || CASE WHEN NEW.review_notes IS NOT NULL THEN ' Notes: ' || NEW.review_notes ELSE '' END,
    'sent',
    '/buildunion/project/' || NEW.project_id::text,
    jsonb_build_object(
      'type', 'budget_review',
      'change_id', NEW.id,
      'project_id', NEW.project_id,
      'decision', NEW.status,
      'item_name', NEW.item_name
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_requester_on_review
AFTER UPDATE ON public.pending_budget_changes
FOR EACH ROW
EXECUTE FUNCTION public.notify_requester_on_review();
