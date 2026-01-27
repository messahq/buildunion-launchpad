import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  CalendarIcon,
  Loader2,
  Bot,
  User,
  AlertTriangle,
  ArrowRight,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  project_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  unit_price?: number;
  quantity?: number;
  total_cost?: number;
  assignee_name?: string;
  assignee_avatar?: string;
  is_user_modified?: boolean;
}

interface TeamMember {
  user_id: string;
  name: string;
  avatar_url?: string;
  role: string;
}

interface DependentTask {
  taskId: string;
  title: string;
  currentDueDate: string;
  newDueDate: string;
  shiftDays: number;
}

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  allTasks: Task[];
  teamMembers: TeamMember[];
  projectId: string;
  onTaskUpdated: (updatedTask: Task, shiftedTasks?: DependentTask[]) => void;
  onBaselineUnlock?: () => void;
}

const TaskEditDialog = ({
  open,
  onOpenChange,
  task,
  allTasks,
  teamMembers,
  projectId,
  onTaskUpdated,
  onBaselineUnlock,
}: TaskEditDialogProps) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  // Track original values to detect changes
  const [originalDueDate, setOriginalDueDate] = useState<Date | undefined>(undefined);
  const [dependentTasks, setDependentTasks] = useState<DependentTask[]>([]);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAssignedTo(task.assigned_to);
      setPriority(task.priority);
      setStatus(task.status);
      const taskDate = task.due_date ? new Date(task.due_date) : undefined;
      setDueDate(taskDate);
      setOriginalDueDate(taskDate);
      setUnitPrice(task.unit_price || 0);
      setQuantity(task.quantity || 1);
      setDependentTasks([]);
      setShowShiftDialog(false);
    }
  }, [task]);

  // Calculate dependent tasks when due date changes
  useEffect(() => {
    if (!task || !dueDate || !originalDueDate) {
      setDependentTasks([]);
      return;
    }

    const originalDateStr = format(originalDueDate, "yyyy-MM-dd");
    const newDateStr = format(dueDate, "yyyy-MM-dd");

    if (originalDateStr === newDateStr) {
      setDependentTasks([]);
      return;
    }

    const shiftDays = Math.round((dueDate.getTime() - originalDueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Find tasks that come after the current task's original due date
    const affected = allTasks
      .filter(t => {
        if (t.id === task.id || !t.due_date || t.status === "completed") return false;
        const tDate = new Date(t.due_date);
        return tDate > originalDueDate;
      })
      .map(t => ({
        taskId: t.id,
        title: t.title,
        currentDueDate: t.due_date!,
        newDueDate: format(addDays(new Date(t.due_date!), shiftDays), "yyyy-MM-dd"),
        shiftDays,
      }));

    setDependentTasks(affected);
  }, [dueDate, originalDueDate, task, allTasks]);

  const handleSave = async (shiftDependents: boolean = false) => {
    if (!task) return;

    setSaving(true);
    try {
      // Calculate if this is a user modification
      const isModified = 
        title !== task.title ||
        (description || "") !== (task.description || "") ||
        assignedTo !== task.assigned_to ||
        priority !== task.priority ||
        status !== task.status ||
        (dueDate ? format(dueDate, "yyyy-MM-dd") : null) !== (task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : null) ||
        unitPrice !== (task.unit_price || 0) ||
        quantity !== (task.quantity || 1);

      // Update the main task
      const taskUpdate = {
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo,
        priority,
        status,
        due_date: dueDate ? dueDate.toISOString() : null,
        unit_price: unitPrice,
        quantity,
        // Note: is_user_modified field would need to be added to the database
      };

      const { error: updateError } = await supabase
        .from("project_tasks")
        .update(taskUpdate)
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Shift dependent tasks if requested
      if (shiftDependents && dependentTasks.length > 0) {
        for (const dt of dependentTasks) {
          const { error: shiftError } = await supabase
            .from("project_tasks")
            .update({ due_date: new Date(dt.newDueDate).toISOString() })
            .eq("id", dt.taskId);

          if (shiftError) {
            console.error("Error shifting task:", dt.taskId, shiftError);
          }
        }
      }

      // Trigger baseline unlock if modified
      if (isModified && onBaselineUnlock) {
        onBaselineUnlock();
      }

      // Notify parent component
      const updatedTask: Task = {
        ...task,
        ...taskUpdate,
        total_cost: unitPrice * quantity,
        is_user_modified: isModified,
      };

      onTaskUpdated(updatedTask, shiftDependents ? dependentTasks : undefined);

      toast.success(
        shiftDependents && dependentTasks.length > 0
          ? t("taskEdit.savedWithShift", "Task saved, {{count}} dependent tasks shifted", { count: dependentTasks.length })
          : t("taskEdit.saved", "Task updated")
      );

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast.error(error.message || t("taskEdit.saveFailed", "Failed to save task"));
    } finally {
      setSaving(false);
      setShowShiftDialog(false);
    }
  };

  const handleSaveClick = () => {
    if (dependentTasks.length > 0) {
      setShowShiftDialog(true);
    } else {
      handleSave(false);
    }
  };

  const totalCost = unitPrice * quantity;

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("taskEdit.title", "Edit Task")}
            {task.is_user_modified && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <User className="h-3 w-3 mr-1" />
                {t("taskEdit.userModified", "User Modified")}
              </Badge>
            )}
            {!task.is_user_modified && (
              <Badge variant="outline" className="text-cyan-600 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30">
                <Bot className="h-3 w-3 mr-1" />
                {t("taskEdit.aiDraft", "AI Draft")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {t("taskEdit.description", "Modify task details. Changes will be tracked in the audit trail.")}
          </DialogDescription>
        </DialogHeader>

        {/* Shift Dependent Tasks Alert */}
        {showShiftDialog && dependentTasks.length > 0 && (
          <Alert className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="space-y-3">
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                {t("taskEdit.shiftQuestion", "Date changed by {{days}} days. Shift {{count}} dependent tasks?", {
                  days: dependentTasks[0]?.shiftDays > 0 ? `+${dependentTasks[0]?.shiftDays}` : dependentTasks[0]?.shiftDays,
                  count: dependentTasks.length,
                })}
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {dependentTasks.slice(0, 5).map(dt => (
                  <div key={dt.taskId} className="text-xs flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <span className="truncate max-w-[150px]">{dt.title}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(dt.currentDueDate), "MMM d")}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">
                      {format(new Date(dt.newDueDate), "MMM d")}
                    </span>
                  </div>
                ))}
                {dependentTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{dependentTasks.length - 5} {t("common.more", "more")}...
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {t("taskEdit.keepOriginalDates", "Keep Original Dates")}
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <ArrowRight className="h-3 w-3 mr-1" />
                  )}
                  {t("taskEdit.shiftAllDependents", "Shift All Dependents")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("common.title", "Title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("taskEdit.titlePlaceholder", "Enter task title")}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("common.description", "Description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("taskEdit.descriptionPlaceholder", "Optional task description")}
              rows={2}
            />
          </div>

          {/* Assignee and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("taskEdit.assignedTo", "Assigned To")}</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder={t("taskEdit.selectMember", "Select member")} />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground">({member.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("taskEdit.priority", "Priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("priority.low", "Low")}</SelectItem>
                  <SelectItem value="medium">{t("priority.medium", "Medium")}</SelectItem>
                  <SelectItem value="high">{t("priority.high", "High")}</SelectItem>
                  <SelectItem value="urgent">{t("priority.urgent", "Urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status and Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("taskEdit.status", "Status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("status.pending", "Pending")}</SelectItem>
                  <SelectItem value="in_progress">{t("status.inProgress", "In Progress")}</SelectItem>
                  <SelectItem value="completed">{t("status.completed", "Completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("taskEdit.dueDate", "Due Date")}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : t("taskEdit.pickDate", "Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Budget Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("taskEdit.unitPrice", "Unit Price ($)")}</Label>
              <NumericInput
                value={unitPrice}
                onChange={(val) => setUnitPrice(val)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("taskEdit.quantity", "Quantity")}</Label>
              <NumericInput
                value={quantity}
                onChange={(val) => setQuantity(val || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("taskEdit.totalCost", "Total Cost")}</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted/30 text-sm font-medium flex items-center">
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSaveClick} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditDialog;
