import { useState, useMemo } from "react";
import {
  format,
  isPast,
  isToday,
  startOfDay,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Camera,
  Upload,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ImagePlus,
  Loader2,
  Wrench,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string;
  assignee_name?: string;
}

interface MicroTimeline {
  id: string;
  phase: "preparation" | "execution" | "verification";
  phaseName: string;
  tasks: Task[];
  progress: number;
  isLocked: boolean;
  lockReason?: string;
}

interface TeamMemberTimelineProps {
  tasks: Task[];
  currentUserId: string;
  currentUserName: string;
  projectId: string;
  onTaskComplete?: (taskId: string) => void;
  onVerificationSubmit?: (taskId: string, photoUrl: string) => void;
  globalVerificationRate: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPhaseForTask(task: Task): "preparation" | "execution" | "verification" {
  const titleLower = task.title.toLowerCase();
  if (titleLower.includes("prep") || titleLower.includes("order") || titleLower.includes("measure") || titleLower.includes("deliver")) {
    return "preparation";
  }
  if (titleLower.includes("inspect") || titleLower.includes("verify") || titleLower.includes("clean") || titleLower.includes("final")) {
    return "verification";
  }
  return "execution";
}

const PHASE_ICONS = {
  preparation: <ClipboardCheck className="h-4 w-4" />,
  execution: <Wrench className="h-4 w-4" />,
  verification: <CheckCircle2 className="h-4 w-4" />,
};

const PHASE_COLORS = {
  preparation: "blue",
  execution: "amber",
  verification: "green",
};

// ============================================
// MAIN COMPONENT
// ============================================

const TeamMemberTimeline = ({
  tasks,
  currentUserId,
  currentUserName,
  projectId,
  onTaskComplete,
  onVerificationSubmit,
  globalVerificationRate,
}: TeamMemberTimelineProps) => {
  const { t } = useTranslation();
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    preparation: true,
    execution: true,
    verification: true,
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<Task | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Filter tasks assigned to current user
  const myTasks = useMemo(() => {
    return tasks.filter(task => task.assigned_to === currentUserId);
  }, [tasks, currentUserId]);

  // Build micro-timelines
  const microTimelines = useMemo<MicroTimeline[]>(() => {
    const tasksByPhase: Record<string, Task[]> = {
      preparation: [],
      execution: [],
      verification: [],
    };

    myTasks.forEach(task => {
      const phase = getPhaseForTask(task);
      tasksByPhase[phase].push(task);
    });

    // Calculate progress for each phase
    const phases: Array<"preparation" | "execution" | "verification"> = ["preparation", "execution", "verification"];
    let previousPhaseComplete = true;

    return phases.map((phase, index) => {
      const phaseTasks = tasksByPhase[phase];
      const completedCount = phaseTasks.filter(t => t.status === "completed").length;
      const progress = phaseTasks.length > 0 ? Math.round((completedCount / phaseTasks.length) * 100) : 0;

      // Lock if previous phase not complete
      const isLocked = index > 0 && !previousPhaseComplete;
      const lockReason = isLocked 
        ? t("memberTimeline.previousPhaseIncomplete", "Complete previous phase first")
        : undefined;

      // Update for next iteration
      previousPhaseComplete = progress === 100;

      return {
        id: phase,
        phase,
        phaseName: phase.charAt(0).toUpperCase() + phase.slice(1),
        tasks: phaseTasks,
        progress,
        isLocked,
        lockReason,
      };
    });
  }, [myTasks, t]);

  const togglePhase = (phaseId: string) => {
    const timeline = microTimelines.find(t => t.id === phaseId);
    if (timeline?.isLocked) {
      toast.warning(timeline.lockReason || t("memberTimeline.phaseLocked", "This phase is locked"));
      return;
    }
    setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  const handleOpenUploadDialog = (task: Task) => {
    setSelectedTaskForUpload(task);
    setUploadDialogOpen(true);
    setPhotoFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handleUploadVerification = async () => {
    if (!selectedTaskForUpload || !photoFile) return;

    setUploading(true);
    try {
      // Upload photo to storage
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${projectId}/${selectedTaskForUpload.id}_verification_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("project-documents")
        .getPublicUrl(fileName);

      // Update task status to completed
      const { error: updateError } = await supabase
        .from("project_tasks")
        .update({ status: "completed" })
        .eq("id", selectedTaskForUpload.id);

      if (updateError) throw updateError;

      toast.success(t("memberTimeline.verificationSubmitted", "Verification photo submitted!"));
      
      // Trigger callbacks
      if (onVerificationSubmit) {
        onVerificationSubmit(selectedTaskForUpload.id, urlData.publicUrl);
      }
      if (onTaskComplete) {
        onTaskComplete(selectedTaskForUpload.id);
      }

      setUploadDialogOpen(false);
      setSelectedTaskForUpload(null);
      setPhotoFile(null);
    } catch (error: any) {
      console.error("Error uploading verification:", error);
      toast.error(error.message || t("memberTimeline.uploadError", "Failed to upload verification"));
    } finally {
      setUploading(false);
    }
  };

  const handleMarkComplete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: "completed" })
        .eq("id", task.id);

      if (error) throw error;

      toast.success(t("memberTimeline.taskCompleted", "Task marked as complete"));
      if (onTaskComplete) {
        onTaskComplete(task.id);
      }
    } catch (error: any) {
      toast.error(error.message || t("memberTimeline.updateError", "Failed to update task"));
    }
  };

  // Overall progress
  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter(t => t.status === "completed").length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (myTasks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {t("memberTimeline.noTasks", "No tasks assigned to you")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("memberTimeline.waitForAssignment", "Wait for the project owner to assign tasks")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with user info and progress */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-cyan-600" />
              <span>{t("memberTimeline.myTasks", "My Tasks")}</span>
              <Badge variant="secondary">{currentUserName}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {t("memberTimeline.globalVerification", "Global Verification")}:
              </span>
              <Badge 
                variant="outline" 
                className={cn(
                  globalVerificationRate === 100 
                    ? "border-green-500 text-green-700" 
                    : "border-amber-500 text-amber-700"
                )}
              >
                {globalVerificationRate}%
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {completedTasks}/{totalTasks} {t("memberTimeline.tasksComplete", "tasks complete")}
            </span>
            <span className="text-sm font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Micro-timelines by phase */}
      <div className="space-y-3">
        {microTimelines.map(timeline => {
          if (timeline.tasks.length === 0) return null;
          
          const isExpanded = expandedPhases[timeline.id];
          const color = PHASE_COLORS[timeline.phase];

          return (
            <Collapsible 
              key={timeline.id} 
              open={isExpanded && !timeline.isLocked} 
              onOpenChange={() => togglePhase(timeline.id)}
            >
              <CollapsibleTrigger asChild>
                <Card className={cn(
                  "cursor-pointer transition-colors",
                  timeline.isLocked && "opacity-60",
                  color === "blue" && "hover:border-blue-300 dark:hover:border-blue-700",
                  color === "amber" && "hover:border-amber-300 dark:hover:border-amber-700",
                  color === "green" && "hover:border-green-300 dark:hover:border-green-700"
                )}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {timeline.isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className={cn(
                          "p-1.5 rounded",
                          color === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                          color === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                          color === "green" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        )}>
                          {PHASE_ICONS[timeline.phase]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{timeline.phaseName}</span>
                            {timeline.isLocked && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Lock className="h-3 w-3 mr-0.5" />
                                {t("memberTimeline.locked", "Locked")}
                              </Badge>
                            )}
                            {timeline.progress === 100 && !timeline.isLocked && (
                              <Badge variant="default" className="text-[10px] bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                {t("memberTimeline.complete", "Complete")}
                              </Badge>
                            )}
                          </div>
                          {timeline.isLocked && timeline.lockReason && (
                            <span className="text-xs text-muted-foreground">
                              {timeline.lockReason}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20">
                          <Progress value={timeline.progress} className="h-1.5" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {timeline.tasks.filter(t => t.status === "completed").length}/{timeline.tasks.length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-2">
                  {timeline.tasks.map(task => {
                    const isComplete = task.status === "completed";
                    const isOverdue = task.due_date && 
                      isPast(startOfDay(new Date(task.due_date))) && 
                      !isToday(new Date(task.due_date)) && 
                      !isComplete;
                    const isVerificationPhase = timeline.phase === "verification";

                    return (
                      <Card 
                        key={task.id} 
                        className={cn(
                          "transition-colors",
                          isComplete && "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                          isOverdue && "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                        )}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {isComplete ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : isOverdue ? (
                                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className={cn(
                                  "font-medium truncate",
                                  isComplete && "line-through text-muted-foreground"
                                )}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {task.due_date && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    isOverdue && "border-red-300 text-red-600"
                                  )}
                                >
                                  {format(new Date(task.due_date), "MMM d")}
                                </Badge>
                              )}

                              {!isComplete && (
                                <>
                                  {isVerificationPhase ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                                      onClick={() => handleOpenUploadDialog(task)}
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      {t("memberTimeline.uploadPhoto", "Upload Photo")}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5"
                                      onClick={() => handleMarkComplete(task)}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      {t("memberTimeline.markComplete", "Complete")}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs pt-2 border-t">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t("memberTimeline.lockedPhase", "Locked Phase")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Unlock className="h-3 w-3 text-green-500" />
          <span className="text-muted-foreground">{t("memberTimeline.unlockedPhase", "Unlocked Phase")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Camera className="h-3 w-3 text-cyan-500" />
          <span className="text-muted-foreground">{t("memberTimeline.verificationRequired", "Photo Required")}</span>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-green-600" />
              {t("memberTimeline.verificationPhoto", "Verification Photo")}
            </DialogTitle>
            <DialogDescription>
              {t("memberTimeline.uploadDescription", "Upload a photo to verify completion of this task. This will update the global verification rate.")}
            </DialogDescription>
          </DialogHeader>

          {selectedTaskForUpload && (
            <div className="py-4 space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="font-medium">{selectedTaskForUpload.title}</p>
                {selectedTaskForUpload.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedTaskForUpload.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-photo">{t("memberTimeline.selectPhoto", "Select Photo")}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="verification-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                </div>
                {photoFile && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <ImagePlus className="h-4 w-4" />
                    {photoFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button
                  onClick={handleUploadVerification}
                  disabled={!photoFile || uploading}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {t("memberTimeline.submitVerification", "Submit Verification")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamMemberTimeline;
