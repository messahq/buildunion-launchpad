import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, 
  CheckCircle2, 
  Camera, 
  X, 
  Clock,
  Loader2,
  Download,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { downloadPDF } from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Template definitions
export type MESSATemplateType = "standard_clean" | "deep_clean" | "maintenance_check";

interface MESSATask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  photoUrl?: string;
  photoTimestamp?: string;
  performedBy?: string;
  isCustom?: boolean;
}

interface MESSATemplate {
  id: MESSATemplateType;
  name: string;
  description: string;
  icon: string;
  color: string;
  tasks: Omit<MESSATask, "completed" | "photoUrl" | "photoTimestamp">[];
}

const MESSA_TEMPLATES: MESSATemplate[] = [
  {
    id: "standard_clean",
    name: "Standard Clean",
    description: "Regular cleaning checklist for daily maintenance",
    icon: "🧹",
    color: "from-blue-500 to-cyan-500",
    tasks: [
      { id: "sc1", title: "Sweep all floors", description: "Remove debris and dust" },
      { id: "sc2", title: "Mop hard surfaces", description: "Use appropriate cleaning solution" },
      { id: "sc3", title: "Empty trash bins", description: "Replace liner bags" },
      { id: "sc4", title: "Wipe countertops", description: "Disinfect all surfaces" },
      { id: "sc5", title: "Clean windows (interior)", description: "Remove smudges and fingerprints" },
      { id: "sc6", title: "Vacuum carpeted areas" },
      { id: "sc7", title: "Dust furniture and fixtures" },
      { id: "sc8", title: "Sanitize door handles" },
    ],
  },
  {
    id: "deep_clean",
    name: "Deep Clean",
    description: "Thorough cleaning for periodic deep maintenance",
    icon: "✨",
    color: "from-purple-500 to-pink-500",
    tasks: [
      { id: "dc1", title: "Strip and wax floors", description: "Full floor restoration" },
      { id: "dc2", title: "Clean air vents and ducts", description: "Remove dust buildup" },
      { id: "dc3", title: "Deep clean carpets", description: "Steam clean or shampoo" },
      { id: "dc4", title: "Wash all windows (inside & out)" },
      { id: "dc5", title: "Clean behind appliances", description: "Move and clean underneath" },
      { id: "dc6", title: "Sanitize all bathroom fixtures", description: "Descale and disinfect" },
      { id: "dc7", title: "Clean light fixtures", description: "Remove and wash covers" },
      { id: "dc8", title: "Power wash exterior areas" },
      { id: "dc9", title: "Clean and organize storage areas" },
      { id: "dc10", title: "Detailed baseboard cleaning" },
    ],
  },
  {
    id: "maintenance_check",
    name: "Maintenance Check",
    description: "Inspection checklist for facility maintenance",
    icon: "🔧",
    color: "from-amber-500 to-orange-500",
    tasks: [
      { id: "mc1", title: "Check HVAC filters", description: "Replace if necessary" },
      { id: "mc2", title: "Inspect fire extinguishers", description: "Check pressure and expiry" },
      { id: "mc3", title: "Test smoke detectors", description: "Replace batteries if needed" },
      { id: "mc4", title: "Check plumbing for leaks" },
      { id: "mc5", title: "Inspect electrical outlets", description: "Look for damage or wear" },
      { id: "mc6", title: "Test emergency lighting" },
      { id: "mc7", title: "Check door locks and hinges", description: "Lubricate if needed" },
      { id: "mc8", title: "Inspect roof and gutters", description: "Look for damage or blockages" },
      { id: "mc9", title: "Check safety signage", description: "Ensure visibility" },
      { id: "mc10", title: "Document any issues found" },
    ],
  },
];

interface MESSAReportModalProps {
  trigger?: React.ReactNode;
}

export const MESSAReportModal = ({
  trigger,
}: MESSAReportModalProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  // SIMPLIFIED FLOW: template → checklist (no project selection)
  const [step, setStep] = useState<"template" | "checklist">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<MESSATemplate | null>(null);
  const [tasks, setTasks] = useState<MESSATask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [unitArea, setUnitArea] = useState("");
  const [savedLogId, setSavedLogId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  // Auto-generate report name based on template and date
  const getReportName = () => {
    if (!selectedTemplate) return "MESSA Report";
    const dateStr = format(new Date(), "MMM d, yyyy");
    return `${selectedTemplate.name} - ${dateStr}`;
  };

  const handleSelectTemplate = (template: MESSATemplate) => {
    setSelectedTemplate(template);
    setTasks(template.tasks.map(t => ({
      ...t,
      completed: false,
      photoUrl: undefined,
      photoTimestamp: undefined,
      performedBy: undefined,
    })));
    setNotes("");
    setClientName("");
    setUnitArea("");
    setSavedLogId(null);
    setStep("checklist");
  };


  const handleTaskToggle = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handlePhotoUpload = (taskId: string) => {
    setUploadingTaskId(taskId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTaskId) return;

    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const photoUrl = event.target?.result as string;
      const timestamp = new Date().toISOString();
      
      setTasks(prev => prev.map(task =>
        task.id === uploadingTaskId 
          ? { ...task, photoUrl, photoTimestamp: timestamp }
          : task
      ));
      
      toast.success("Photo added", {
        description: `Photo attached at ${format(new Date(timestamp), "HH:mm:ss")}`
      });
    };
    reader.readAsDataURL(file);
    
    // Reset
    setUploadingTaskId(null);
    e.target.value = "";
  };

  const handleRemovePhoto = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId 
        ? { ...task, photoUrl: undefined, photoTimestamp: undefined }
        : task
    ));
  };

  // Edit task title
  const handleTaskTitleChange = (taskId: string, title: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, title } : task
    ));
  };

  // Edit task description
  const handleTaskDescriptionChange = (taskId: string, description: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, description: description || undefined } : task
    ));
  };

  // Add new custom task
  const handleAddTask = () => {
    const newTask: MESSATask = {
      id: `custom-${Date.now()}`,
      title: "New Task",
      description: "",
      completed: false,
      isCustom: true,
    };
    setTasks(prev => [...prev, newTask]);
  };

  // Delete custom task
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const photosCount = tasks.filter(t => t.photoUrl).length;

  // Save log to Supabase (notes and all data)
  const handleSaveLog = async (showToast = true): Promise<string | null> => {
    if (!session?.user?.id || !selectedTemplate) {
      if (showToast) toast.error("Please log in to save");
      return null;
    }

    setSaving(true);
    try {
      const reportName = clientName.trim() 
        ? `${selectedTemplate.name} - ${clientName.trim()} - ${format(new Date(), "MMM d, yyyy")}`
        : getReportName();
      
      const logData = {
        user_id: session.user.id,
        report_name: reportName,
        template_type: selectedTemplate.id,
        notes: notes.trim() || null,
        tasks_data: JSON.parse(JSON.stringify({ 
          tasks,
          clientName: clientName.trim() || null,
          unitArea: unitArea.trim() || null,
        })),
        completed_count: completedCount,
        total_count: tasks.length,
        photos_count: photosCount,
      };

      if (savedLogId) {
        // Update existing log
        const { error } = await supabase
          .from("site_logs")
          .update({
            report_name: reportName,
            notes: notes.trim() || null,
            tasks_data: JSON.parse(JSON.stringify({ 
              tasks,
              clientName: clientName.trim() || null,
              unitArea: unitArea.trim() || null,
            })),
            completed_count: completedCount,
            photos_count: photosCount,
          })
          .eq("id", savedLogId);

        if (error) throw error;
        if (showToast) toast.success("Log updated!");
        return savedLogId;
      } else {
        // Create new log
        const { data, error } = await supabase
          .from("site_logs")
          .insert([logData])
          .select("id")
          .single();

        if (error) throw error;
        setSavedLogId(data.id);
        if (showToast) toast.success("Log saved!");
        return data.id;
      }
    } catch (error) {
      console.error("Save error:", error);
      if (showToast) toast.error("Failed to save log");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const generatePDFReport = async () => {
    if (!selectedTemplate) return;
    
    // Validate client name
    if (!clientName.trim()) {
      toast.error("Client name is required", {
        description: "Please enter a client name before generating the PDF."
      });
      return;
    }
    
    setGenerating(true);
    try {
      // Auto-save to database before generating PDF
      await handleSaveLog(false);
      
      const reportDate = format(new Date(), "MMMM d, yyyy 'at' HH:mm");
      const displayClientName = clientName.trim();
      const displayUnitArea = unitArea.trim();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>MESSA Quick-Log Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 32px; line-height: 1.4; }
            .section { margin-bottom: 16px; }
            .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
            .header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f59e0b; }
            .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
            .logo-icon { font-size: 32px; }
            .logo-text { font-size: 24px; font-weight: 700; color: #f59e0b; }
            h1 { font-size: 20px; color: #1a1a1a; margin-bottom: 8px; }
            .client-info { background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; }
            .client-row { display: flex; gap: 32px; flex-wrap: wrap; }
            .client-item { }
            .client-label { font-size: 11px; color: #a16207; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
            .client-value { font-size: 16px; font-weight: 700; color: #92400e; }
            .client-date { font-size: 13px; color: #a16207; margin-top: 8px; padding-top: 8px; border-top: 1px solid #fbbf24; }
            .meta { color: #64748b; font-size: 14px; }
            .template-badge { display: inline-block; padding: 6px 12px; background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; border-radius: 6px; font-size: 12px; font-weight: 600; margin-top: 12px; }
            .summary { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0; display: flex; gap: 24px; flex-wrap: wrap; }
            .summary-item { text-align: center; min-width: 80px; }
            .summary-value { font-size: 28px; font-weight: 700; color: #f59e0b; }
            .summary-label { font-size: 12px; color: #64748b; }
            .tasks { margin-top: 24px; }
            .tasks-title { font-size: 16px; margin-bottom: 16px; color: #475569; }
            .task { padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; background: #fff; }
            .task-header { display: flex; align-items: flex-start; gap: 12px; }
            .task-status { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
            .task-status.completed { background: #dcfce7; color: #166534; }
            .task-status.pending { background: #fef3c7; color: #92400e; }
            .task-content { flex: 1; min-width: 0; }
            .task-title { font-weight: 600; font-size: 13px; color: #1a1a1a; word-wrap: break-word; }
            .custom-badge { display: inline-block; padding: 2px 8px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 10px; font-weight: 500; margin-left: 8px; vertical-align: middle; }
            .task-description { color: #64748b; font-size: 12px; margin-top: 4px; word-wrap: break-word; }
            .task-photo { margin-top: 12px; }
            .task-photo img { max-width: 240px; max-height: 150px; border-radius: 8px; border: 1px solid #e2e8f0; display: block; }
            .task-timestamp { color: #64748b; font-size: 11px; margin-top: 4px; }
            .notes { margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; }
            .notes h2 { font-size: 16px; margin-bottom: 12px; color: #92400e; }
            .notes p { color: #1a1a1a; font-size: 14px; white-space: pre-wrap; line-height: 1.6; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="section avoid-break header">
            <div class="logo">
              <span class="logo-icon">📋</span>
              <span class="logo-text">MESSA Quick-Log</span>
            </div>
            <div class="client-info">
              <div class="client-row">
                <div class="client-item">
                  <div class="client-label">Client</div>
                  <div class="client-value">${displayClientName}</div>
                </div>
                ${displayUnitArea ? `
                <div class="client-item">
                  <div class="client-label">Unit / Area</div>
                  <div class="client-value">${displayUnitArea}</div>
                </div>
                ` : ''}
              </div>
              <div class="client-date">📅 ${reportDate}</div>
            </div>
            <div class="meta">
              <div class="template-badge">${selectedTemplate.icon} ${selectedTemplate.name}</div>
            </div>
          </div>
          
          <div class="section avoid-break summary">
            <div class="summary-item">
              <div class="summary-value">${completedCount}/${tasks.length}</div>
              <div class="summary-label">Tasks Completed</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${Math.round((completedCount / tasks.length) * 100)}%</div>
              <div class="summary-label">Completion Rate</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${photosCount}</div>
              <div class="summary-label">Photos Attached</div>
            </div>
          </div>
          
          <div class="tasks">
            <h2 class="tasks-title">Task Checklist</h2>
            ${tasks.map(task => `
              <div class="section avoid-break task">
                <div class="task-header">
                  <div class="task-status ${task.completed ? 'completed' : 'pending'}">
                    ${task.completed ? '✓' : '○'}
                  </div>
                  <div class="task-content">
                    <span class="task-title">${task.title}${task.isCustom ? '<span class="custom-badge">Custom</span>' : ''}</span>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    ${task.performedBy ? `<div class="task-description"><strong>Performed by:</strong> ${task.performedBy}</div>` : ''}
                    ${task.photoUrl ? `
                      <div class="task-photo">
                        <img src="${task.photoUrl}" alt="Task photo" />
                        <div class="task-timestamp">📷 ${task.photoTimestamp ? format(new Date(task.photoTimestamp), "MMM d, yyyy 'at' HH:mm:ss") : 'Unknown'}</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${notes.trim() ? `
          <div class="section avoid-break notes">
            <h2>📝 Notes & Observations</h2>
            <p>${notes.trim()}</p>
          </div>
          ` : ''}
          
          <div class="section avoid-break footer">
            <p>Generated by BuildUnion MESSA Quick-Log • ${new Date().getFullYear()}</p>
          </div>
        </body>
        </html>
      `;
      
      await downloadPDF(htmlContent, {
        filename: `MESSA-${selectedTemplate.name.replace(/\s+/g, '-')}-${displayClientName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
      });
      
      toast.success("Report generated & saved!", {
        description: "PDF downloaded and saved to database"
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    if (step === "checklist") {
      setStep("template");
      setSelectedTemplate(null);
      setTasks([]);
      setNotes("");
      setClientName("");
      setSavedLogId(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      setStep("template");
      setSelectedTemplate(null);
      setTasks([]);
      setNotes("");
      setClientName("");
      setSavedLogId(null);
    }, 200);
  };

  const handlePerformedByChange = (taskId: string, value: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, performedBy: value } : task
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">MESSA Report</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "checklist" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Sparkles className="h-5 w-5 text-amber-500" />
            MESSA Quick-Log
          </DialogTitle>
          <DialogDescription>
            {step === "template" 
              ? "Select a template to start your inspection"
              : `${selectedTemplate?.icon} ${selectedTemplate?.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {step === "template" ? (
          /* Step 1: Template Selection */
          <div className="grid gap-4 py-4">
            {MESSA_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:border-amber-400 hover:shadow-md transition-all text-left group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-2xl shadow-sm`}>
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-amber-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {template.tasks.length} tasks
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Client Name & Unit/Area Inputs */}
            <div className="mb-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1.5 block">
                  👤 Client Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter client name (required)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={`bg-background ${!clientName.trim() && 'border-destructive/50'}`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1.5 block">
                  📍 Unit / Area
                </label>
                <Input
                  placeholder="e.g., Unit 305, Building A, Floor 2"
                  value={unitArea}
                  onChange={(e) => setUnitArea(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Summary Bar */}
            <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{completedCount}/{tasks.length} completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{photosCount} photos</span>
                </div>
              </div>
              <Button 
                onClick={generatePDFReport}
                disabled={generating || !clientName.trim()}
                size="sm"
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Generate PDF
              </Button>
            </div>

            {/* Task List - Native scroll with snap for mobile */}
            <div 
              className="flex-1 -mx-6 px-6 overflow-y-auto overscroll-contain scroll-smooth"
              style={{ 
                maxHeight: 'calc(85vh - 220px)',
                scrollSnapType: 'y proximity',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="space-y-3 pb-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all scroll-snap-align-start ${
                      task.completed 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50' 
                        : 'bg-card border-border hover:border-amber-300'
                    }`}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                        className="mt-1 h-5 w-5 border-2 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      
                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Editable Title */}
                            <Input
                              value={task.title}
                              onChange={(e) => handleTaskTitleChange(task.id, e.target.value)}
                              className={`font-medium h-auto py-1 px-2 border-transparent hover:border-border focus:border-amber-400 bg-transparent ${
                                task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                              placeholder="Task title..."
                            />
                            {/* Editable Description */}
                            <Input
                              value={task.description || ""}
                              onChange={(e) => handleTaskDescriptionChange(task.id, e.target.value)}
                              className="text-sm h-auto py-1 px-2 mt-0.5 border-transparent hover:border-border focus:border-amber-400 bg-transparent text-muted-foreground"
                              placeholder="Add description..."
                            />
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Delete Button - all tasks can be deleted */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {/* Camera Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${
                                task.photoUrl 
                                  ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' 
                                  : 'text-muted-foreground hover:text-amber-600'
                              }`}
                              onClick={() => handlePhotoUpload(task.id)}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Photo Preview */}
                        {task.photoUrl && (
                          <div className="mt-3 relative inline-block">
                            <img
                              src={task.photoUrl}
                              alt="Task photo"
                              className="max-w-[200px] max-h-[120px] rounded-lg border object-cover"
                            />
                            <button
                              onClick={() => handleRemovePhoto(task.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {task.photoTimestamp && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.photoTimestamp), "HH:mm:ss")}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Performed By Field */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Performed by:</span>
                          <Input
                            placeholder="Enter name..."
                            value={task.performedBy || ""}
                            onChange={(e) => handlePerformedByChange(task.id, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Task Button */}
                <button
                  onClick={handleAddTask}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-all flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Add Custom Task</span>
                </button>
              </div>
              
              {/* Notes Section */}
              <div className="mt-4 p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/50">
                <label className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 block">
                  📝 Notes & Observations
                </label>
                <Textarea
                  placeholder="Add any additional notes, observations, or comments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] bg-background resize-none"
                />
                <Button
                  onClick={() => handleSaveLog()}
                  disabled={saving || !session?.user}
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savedLogId ? "Update Log" : "Save Log"}
                </Button>
                {!session?.user && (
                  <p className="text-xs text-muted-foreground mt-1">Log in to save notes</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MESSAReportModal;
