import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  FolderOpen, 
  Loader2, 
  Paintbrush, 
  Hammer, 
  Home,
  Wrench,
  Zap,
  Droplets,
  TreePine,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
}

interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  tasks: Task[];
  is_public: boolean;
  use_count: number;
  created_at: string;
}

interface TaskTemplateManagerProps {
  projectId: string;
  currentTasks: Task[];
  onApplyTemplate: (tasks: Omit<Task, "id">[]) => void;
  isOwner: boolean;
}

const CATEGORIES = [
  { value: "painting", label: "Painting", icon: Paintbrush, emoji: "🎨" },
  { value: "flooring", label: "Flooring", icon: Home, emoji: "🪵" },
  { value: "roofing", label: "Roofing", icon: Home, emoji: "🏠" },
  { value: "electrical", label: "Electrical", icon: Zap, emoji: "⚡" },
  { value: "plumbing", label: "Plumbing", icon: Droplets, emoji: "🔧" },
  { value: "carpentry", label: "Carpentry", icon: Hammer, emoji: "🪚" },
  { value: "landscaping", label: "Landscaping", icon: TreePine, emoji: "🌳" },
  { value: "general", label: "General", icon: Wrench, emoji: "🔨" },
  { value: "custom", label: "Custom", icon: CheckCircle2, emoji: "📋" },
];

const TaskTemplateManager = ({ 
  projectId, 
  currentTasks, 
  onApplyTemplate, 
  isOwner 
}: TaskTemplateManagerProps) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Form state for saving
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("custom");
  const [isPublic, setIsPublic] = useState(false);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("task_templates")
          .select("*")
          .or(`user_id.eq.${user.id},is_public.eq.true`)
          .order("use_count", { ascending: false });

        if (error) throw error;
        
        // Type assertion for the tasks array
        const typedTemplates = (data || []).map(t => ({
          ...t,
          tasks: (t.tasks as unknown as Task[]) || []
        }));
        
        setTemplates(typedTemplates);
      } catch (err) {
        console.error("Error fetching templates:", err);
      } finally {
        setLoading(false);
      }
    };

    if (loadDialogOpen) {
      fetchTemplates();
    }
  }, [user, loadDialogOpen]);

  const handleSaveAsTemplate = async () => {
    if (!user || !templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (currentTasks.length === 0) {
      toast.error("No tasks to save as template");
      return;
    }

    setSaving(true);
    try {
      // Prepare tasks without project-specific IDs
      const templateTasks = currentTasks.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: "pending", // Always reset to pending
      }));

      const categoryInfo = CATEGORIES.find(c => c.value === templateCategory);

      const { error } = await supabase
        .from("task_templates")
        .insert({
          user_id: user.id,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          category: templateCategory,
          icon: categoryInfo?.emoji || "📋",
          tasks: templateTasks,
          is_public: isPublic,
        });

      if (error) throw error;

      toast.success(`Template "${templateName}" saved with ${templateTasks.length} tasks`);
      setSaveDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      setTemplateCategory("custom");
      setIsPublic(false);
    } catch (err: any) {
      console.error("Error saving template:", err);
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async (template: TaskTemplate) => {
    if (!user || !isOwner) return;

    setApplying(true);
    try {
      // Increment use count
      await supabase
        .from("task_templates")
        .update({ use_count: template.use_count + 1 })
        .eq("id", template.id);

      // Apply template tasks
      onApplyTemplate(template.tasks);
      
      toast.success(`Applied "${template.name}" template (${template.tasks.length} tasks)`);
      setLoadDialogOpen(false);
    } catch (err: any) {
      console.error("Error applying template:", err);
      toast.error(err.message || "Failed to apply template");
    } finally {
      setApplying(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"?`)) return;

    try {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success("Template deleted");
    } catch (err: any) {
      console.error("Error deleting template:", err);
      toast.error(err.message || "Failed to delete template");
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
  };

  if (!isOwner) return null;

  return (
    <>
      {/* Template Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLoadDialogOpen(true)}
          className="gap-1.5 text-xs"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Load Template
        </Button>
        
        {currentTasks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            Save as Template
          </Button>
        )}
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-amber-600" />
              Save as Template
            </DialogTitle>
            <DialogDescription>
              Save your current {currentTasks.length} tasks as a reusable template for future projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name *</label>
              <Input
                placeholder="e.g., Full House Painting"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description of this template"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={templateCategory} onValueChange={setTemplateCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isPublic" className="text-sm">
                Share publicly with other users
              </label>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Tasks to save:</p>
              <div className="flex flex-wrap gap-1">
                {currentTasks.slice(0, 5).map((task, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {task.title.length > 25 ? task.title.slice(0, 25) + "..." : task.title}
                  </Badge>
                ))}
                {currentTasks.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentTasks.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={saving || !templateName.trim()}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-600" />
              Load Task Template
            </DialogTitle>
            <DialogDescription>
              Choose a template to add tasks to your project.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No templates saved yet</p>
                <p className="text-xs mt-1">Save your current tasks as a template to reuse later</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map((template) => {
                  const catInfo = getCategoryInfo(template.category);
                  const isOwn = template.user_id === user?.id;
                  
                  return (
                    <div
                      key={template.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                        "hover:bg-muted/50 cursor-pointer group"
                      )}
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            {template.is_public && !isOwn && (
                              <Badge variant="secondary" className="text-[10px]">Public</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{template.tasks.length} tasks</span>
                            <span>•</span>
                            <span>{catInfo.label}</span>
                            {template.use_count > 0 && (
                              <>
                                <span>•</span>
                                <span>Used {template.use_count}x</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id, template.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={applying}
                          className="gap-1.5"
                        >
                          {applying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Apply
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskTemplateManager;
