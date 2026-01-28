import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2,
  Plus,
  Sparkles
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
  onAddCustomTask?: (task: Omit<Task, "id">) => void;
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

// Built-in starter templates
const BUILTIN_TEMPLATES: Omit<TaskTemplate, "id" | "user_id" | "created_at">[] = [
  {
    name: "Interior Painting - Full Room",
    description: "Complete interior painting workflow for a single room",
    category: "painting",
    icon: "🎨",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Move furniture & cover floors", description: "Protect all surfaces from paint", priority: "high", status: "pending" },
      { id: "prep-2", title: "Patch holes & sand surfaces", description: "Fill nail holes, cracks, and sand smooth", priority: "high", status: "pending" },
      { id: "prep-3", title: "Clean walls & remove dust", description: "Wipe down all surfaces", priority: "medium", status: "pending" },
      { id: "prep-4", title: "Apply painter's tape", description: "Tape edges, trim, and fixtures", priority: "medium", status: "pending" },
      { id: "exec-1", title: "Apply primer coat", description: "Prime patched areas and bare surfaces", priority: "high", status: "pending" },
      { id: "exec-2", title: "Cut in edges & corners", description: "Brush paint along all edges", priority: "high", status: "pending" },
      { id: "exec-3", title: "Roll first coat", description: "Apply first coat with roller", priority: "high", status: "pending" },
      { id: "exec-4", title: "Roll second coat", description: "Apply second coat after drying", priority: "high", status: "pending" },
      { id: "ver-1", title: "Remove tape & touch up", description: "Carefully remove tape and fix any issues", priority: "medium", status: "pending" },
      { id: "ver-2", title: "Clean up & restore furniture", description: "Move furniture back and clean", priority: "low", status: "pending" },
    ]
  },
  {
    name: "Hardwood Flooring Install",
    description: "Complete hardwood floor installation from subfloor to finish",
    category: "flooring",
    icon: "🪵",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Acclimate flooring material", description: "Let wood adjust to room humidity 48-72h", priority: "high", status: "pending" },
      { id: "prep-2", title: "Remove old flooring", description: "Remove existing floor covering", priority: "high", status: "pending" },
      { id: "prep-3", title: "Level subfloor", description: "Check and level subfloor as needed", priority: "high", status: "pending" },
      { id: "prep-4", title: "Install moisture barrier", description: "Lay underlayment/vapor barrier", priority: "medium", status: "pending" },
      { id: "exec-1", title: "Plan layout & starting line", description: "Measure and mark chalk line", priority: "high", status: "pending" },
      { id: "exec-2", title: "Install first rows", description: "Nail down starter rows", priority: "high", status: "pending" },
      { id: "exec-3", title: "Continue installation", description: "Install remaining flooring", priority: "high", status: "pending" },
      { id: "exec-4", title: "Cut & fit around obstacles", description: "Custom cuts for doorways, vents", priority: "medium", status: "pending" },
      { id: "ver-1", title: "Install transitions & thresholds", description: "Add transition strips", priority: "medium", status: "pending" },
      { id: "ver-2", title: "Install baseboards", description: "Reinstall or replace baseboards", priority: "medium", status: "pending" },
    ]
  },
  {
    name: "Bathroom Renovation",
    description: "Full bathroom remodel including plumbing and fixtures",
    category: "plumbing",
    icon: "🔧",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Turn off water supply", description: "Shut off main water to bathroom", priority: "high", status: "pending" },
      { id: "prep-2", title: "Demo existing fixtures", description: "Remove toilet, vanity, shower/tub", priority: "high", status: "pending" },
      { id: "prep-3", title: "Remove old tile & flooring", description: "Demo existing wall and floor tiles", priority: "high", status: "pending" },
      { id: "exec-1", title: "Rough in plumbing", description: "Install new supply lines and drains", priority: "high", status: "pending" },
      { id: "exec-2", title: "Install cement board", description: "Waterproof backing for tile areas", priority: "high", status: "pending" },
      { id: "exec-3", title: "Tile walls & floor", description: "Install new tile with proper spacing", priority: "high", status: "pending" },
      { id: "exec-4", title: "Grout & seal tile", description: "Apply grout and sealant", priority: "medium", status: "pending" },
      { id: "exec-5", title: "Install vanity & toilet", description: "Set and connect fixtures", priority: "high", status: "pending" },
      { id: "ver-1", title: "Install fixtures & accessories", description: "Faucets, mirrors, towel bars", priority: "medium", status: "pending" },
      { id: "ver-2", title: "Test plumbing & check leaks", description: "Run water and verify no leaks", priority: "high", status: "pending" },
    ]
  },
  {
    name: "Electrical Panel Upgrade",
    description: "Upgrade main electrical panel to higher amperage",
    category: "electrical",
    icon: "⚡",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Obtain permits", description: "Get electrical permit from city", priority: "high", status: "pending" },
      { id: "prep-2", title: "Schedule utility disconnect", description: "Coordinate with power company", priority: "high", status: "pending" },
      { id: "prep-3", title: "Purchase new panel & breakers", description: "Get correct size panel", priority: "high", status: "pending" },
      { id: "exec-1", title: "Disconnect power at meter", description: "Utility disconnects power", priority: "high", status: "pending" },
      { id: "exec-2", title: "Remove old panel", description: "Document and remove existing panel", priority: "high", status: "pending" },
      { id: "exec-3", title: "Install new panel", description: "Mount and ground new panel", priority: "high", status: "pending" },
      { id: "exec-4", title: "Connect circuits", description: "Wire all circuits to new breakers", priority: "high", status: "pending" },
      { id: "ver-1", title: "Request utility reconnection", description: "Schedule power restoration", priority: "high", status: "pending" },
      { id: "ver-2", title: "Test all circuits", description: "Verify all circuits working", priority: "high", status: "pending" },
      { id: "ver-3", title: "Final inspection", description: "Pass electrical inspection", priority: "high", status: "pending" },
    ]
  },
  {
    name: "Roof Replacement",
    description: "Complete tear-off and new shingle installation",
    category: "roofing",
    icon: "🏠",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Order materials & dumpster", description: "Shingles, underlayment, dumpster", priority: "high", status: "pending" },
      { id: "prep-2", title: "Protect landscaping", description: "Cover plants and set up protection", priority: "medium", status: "pending" },
      { id: "exec-1", title: "Tear off old shingles", description: "Remove existing roofing to deck", priority: "high", status: "pending" },
      { id: "exec-2", title: "Inspect & repair decking", description: "Replace damaged plywood", priority: "high", status: "pending" },
      { id: "exec-3", title: "Install ice & water shield", description: "Apply to eaves and valleys", priority: "high", status: "pending" },
      { id: "exec-4", title: "Install underlayment", description: "Roll out synthetic underlayment", priority: "high", status: "pending" },
      { id: "exec-5", title: "Install drip edge", description: "Metal edging on eaves and rakes", priority: "medium", status: "pending" },
      { id: "exec-6", title: "Install shingles", description: "Apply starter and field shingles", priority: "high", status: "pending" },
      { id: "ver-1", title: "Flash vents & penetrations", description: "Seal around pipes and vents", priority: "high", status: "pending" },
      { id: "ver-2", title: "Install ridge cap", description: "Finish ridge and hips", priority: "high", status: "pending" },
      { id: "ver-3", title: "Clean up & final inspection", description: "Remove debris, inspect work", priority: "medium", status: "pending" },
    ]
  },
  {
    name: "Deck Construction",
    description: "Build a new outdoor deck from footings to railings",
    category: "carpentry",
    icon: "🪚",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Design & obtain permits", description: "Plans and building permit", priority: "high", status: "pending" },
      { id: "prep-2", title: "Mark layout & dig footings", description: "Layout and excavate for footings", priority: "high", status: "pending" },
      { id: "prep-3", title: "Pour concrete footings", description: "Set concrete piers", priority: "high", status: "pending" },
      { id: "exec-1", title: "Install posts", description: "Set and brace support posts", priority: "high", status: "pending" },
      { id: "exec-2", title: "Install ledger board", description: "Attach ledger to house", priority: "high", status: "pending" },
      { id: "exec-3", title: "Frame joists & beams", description: "Install structural framing", priority: "high", status: "pending" },
      { id: "exec-4", title: "Install decking boards", description: "Lay deck surface boards", priority: "high", status: "pending" },
      { id: "exec-5", title: "Build stairs", description: "Construct and install stairs", priority: "high", status: "pending" },
      { id: "ver-1", title: "Install railings & balusters", description: "Safety railings per code", priority: "high", status: "pending" },
      { id: "ver-2", title: "Apply finish/stain", description: "Seal or stain as needed", priority: "medium", status: "pending" },
      { id: "ver-3", title: "Final inspection", description: "Pass building inspection", priority: "high", status: "pending" },
    ]
  },
  {
    name: "Landscape Installation",
    description: "Complete landscaping with plants, mulch, and hardscape",
    category: "landscaping",
    icon: "🌳",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Site survey & design plan", description: "Measure and create layout", priority: "high", status: "pending" },
      { id: "prep-2", title: "Clear existing vegetation", description: "Remove unwanted plants/grass", priority: "high", status: "pending" },
      { id: "prep-3", title: "Grade & level site", description: "Ensure proper drainage", priority: "high", status: "pending" },
      { id: "exec-1", title: "Install irrigation", description: "Lay drip lines or sprinklers", priority: "medium", status: "pending" },
      { id: "exec-2", title: "Install hardscape", description: "Patios, walkways, edging", priority: "high", status: "pending" },
      { id: "exec-3", title: "Amend soil", description: "Add compost and fertilizer", priority: "medium", status: "pending" },
      { id: "exec-4", title: "Plant trees & shrubs", description: "Install larger plants first", priority: "high", status: "pending" },
      { id: "exec-5", title: "Plant perennials & groundcover", description: "Fill in smaller plants", priority: "medium", status: "pending" },
      { id: "ver-1", title: "Apply mulch", description: "Spread 2-3 inches of mulch", priority: "medium", status: "pending" },
      { id: "ver-2", title: "Initial watering & cleanup", description: "Deep water and clean site", priority: "medium", status: "pending" },
    ]
  },
  {
    name: "General Renovation Prep",
    description: "Standard preparation tasks for any renovation project",
    category: "general",
    icon: "🔨",
    is_public: true,
    use_count: 0,
    tasks: [
      { id: "prep-1", title: "Client walkthrough & confirm scope", description: "Review project details on site", priority: "high", status: "pending" },
      { id: "prep-2", title: "Obtain necessary permits", description: "Apply for required permits", priority: "high", status: "pending" },
      { id: "prep-3", title: "Order materials", description: "Purchase and schedule delivery", priority: "high", status: "pending" },
      { id: "prep-4", title: "Set up work area", description: "Protect surfaces, set up tools", priority: "medium", status: "pending" },
      { id: "exec-1", title: "Complete main work", description: "Execute primary scope of work", priority: "high", status: "pending" },
      { id: "exec-2", title: "Address punch list items", description: "Fix any issues identified", priority: "medium", status: "pending" },
      { id: "ver-1", title: "Final walkthrough with client", description: "Review completed work", priority: "high", status: "pending" },
      { id: "ver-2", title: "Clean up work area", description: "Remove debris and clean", priority: "medium", status: "pending" },
      { id: "ver-3", title: "Obtain sign-off", description: "Get client approval", priority: "high", status: "pending" },
    ]
  },
];

const TaskTemplateManager = ({ 
  projectId, 
  currentTasks, 
  onApplyTemplate, 
  onAddCustomTask,
  isOwner 
}: TaskTemplateManagerProps) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showBuiltIn, setShowBuiltIn] = useState(true);
  
  // Form state for saving
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("custom");
  const [isPublic, setIsPublic] = useState(false);

  // Form state for custom task
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskDescription, setCustomTaskDescription] = useState("");
  const [customTaskPriority, setCustomTaskPriority] = useState("medium");

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

  const handleApplyTemplate = async (template: TaskTemplate | Omit<TaskTemplate, "id" | "user_id" | "created_at">, isBuiltIn = false) => {
    if (!user || !isOwner) return;

    setApplying(true);
    try {
      // Increment use count for saved templates
      if (!isBuiltIn && "id" in template) {
        await supabase
          .from("task_templates")
          .update({ use_count: template.use_count + 1 })
          .eq("id", template.id);
      }

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

  const handleAddCustomTask = () => {
    if (!customTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    if (onAddCustomTask) {
      onAddCustomTask({
        title: customTaskTitle.trim(),
        description: customTaskDescription.trim() || null,
        priority: customTaskPriority,
        status: "pending",
      });
      
      toast.success(`Task "${customTaskTitle}" added`);
      setAddTaskDialogOpen(false);
      setCustomTaskTitle("");
      setCustomTaskDescription("");
      setCustomTaskPriority("medium");
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
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddTaskDialogOpen(true)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
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

      {/* Add Custom Task Dialog */}
      <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-600" />
              Add Custom Task
            </DialogTitle>
            <DialogDescription>
              Create a new task for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title *</label>
              <Input
                placeholder="e.g., Install kitchen cabinets"
                value={customTaskTitle}
                onChange={(e) => setCustomTaskTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Add details about this task..."
                value={customTaskDescription}
                onChange={(e) => setCustomTaskDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={customTaskPriority} onValueChange={setCustomTaskPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Medium Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Low Priority
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomTask}
              disabled={!customTaskTitle.trim()}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-600" />
              Load Task Template
            </DialogTitle>
            <DialogDescription>
              Choose a template to add tasks to your project.
            </DialogDescription>
          </DialogHeader>

          {/* Toggle between built-in and saved */}
          <div className="flex gap-2 border-b pb-3">
            <Button
              variant={showBuiltIn ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBuiltIn(true)}
              className={cn(showBuiltIn && "bg-amber-600 hover:bg-amber-700")}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Starter Templates
            </Button>
            <Button
              variant={!showBuiltIn ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBuiltIn(false)}
              className={cn(!showBuiltIn && "bg-amber-600 hover:bg-amber-700")}
            >
              <Save className="h-4 w-4 mr-1.5" />
              My Templates ({templates.length})
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {showBuiltIn ? (
              <div className="space-y-2">
                {BUILTIN_TEMPLATES.map((template, idx) => {
                  const catInfo = getCategoryInfo(template.category);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                        "hover:bg-muted/50 cursor-pointer group"
                      )}
                      onClick={() => handleApplyTemplate(template, true)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="secondary" className="text-[10px]">Built-in</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {template.description}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{template.tasks.length} tasks</span>
                            <span>•</span>
                            <span>{catInfo.label}</span>
                          </div>
                        </div>
                      </div>
                      
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
                  );
                })}
              </div>
            ) : loading ? (
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
              <div className="space-y-2">
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
