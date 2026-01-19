-- Create project_tasks table for task assignment
CREATE TABLE public.project_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL,
    assigned_by UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Project owners can manage all tasks
CREATE POLICY "Project owners can manage tasks"
ON public.project_tasks
FOR ALL
USING (is_project_owner(project_id, auth.uid()));

-- Policy: Team members can view tasks assigned to them
CREATE POLICY "Members can view their tasks"
ON public.project_tasks
FOR SELECT
USING (assigned_to = auth.uid());

-- Policy: Team members can update their own task status
CREATE POLICY "Members can update their task status"
ON public.project_tasks
FOR UPDATE
USING (assigned_to = auth.uid());

-- Add realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;

-- Update timestamp trigger
CREATE TRIGGER update_project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();