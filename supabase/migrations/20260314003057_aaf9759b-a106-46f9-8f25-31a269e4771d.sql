
-- 1. Forum replies: auto-increment/decrement reply count
CREATE TRIGGER on_forum_reply_insert
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_replies_count();

CREATE TRIGGER on_forum_reply_delete
  AFTER DELETE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_replies_count();

-- 2. Pending budget changes: notify owner on new request
CREATE TRIGGER on_pending_change_insert
  AFTER INSERT ON public.pending_budget_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_on_pending_change();

-- 3. Pending budget changes: notify requester on review decision
CREATE TRIGGER on_pending_change_review
  AFTER UPDATE ON public.pending_budget_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_requester_on_review();

-- 4. user_draft_data: auto-update last_updated timestamp
CREATE TRIGGER on_draft_data_update
  BEFORE UPDATE ON public.user_draft_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_updated_column();

-- 5. updated_at auto-update for key tables
CREATE TRIGGER on_projects_update
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_contracts_update
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_project_tasks_update
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_bu_profiles_update
  BEFORE UPDATE ON public.bu_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_site_logs_update
  BEFORE UPDATE ON public.site_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_forum_posts_update
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_material_deliveries_update
  BEFORE UPDATE ON public.material_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
