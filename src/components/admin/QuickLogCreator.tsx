import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FileText,
  ClipboardList,
  Search as SearchIcon,
  Wrench,
  Plus,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type TemplateType = "standard" | "deep" | "maintenance";

interface TaskItem {
  id: string;
  label: string;
  completed: boolean;
}

const TEMPLATE_PRESETS: Record<TemplateType, { icon: string; label: string; color: string; tasks: string[] }> = {
  standard: {
    icon: "📋",
    label: "Standard Inspection",
    color: "bg-blue-500",
    tasks: [
      "Floor swept and mopped",
      "Surfaces wiped down",
      "Trash removed",
      "Windows cleaned",
      "Bathroom sanitized",
      "Kitchen cleaned",
      "Doors & handles wiped",
      "Lights & switches checked",
    ],
  },
  deep: {
    icon: "🔍",
    label: "Deep Clean",
    color: "bg-purple-500",
    tasks: [
      "Floor deep scrubbed",
      "Carpet shampooed",
      "Baseboards cleaned",
      "Behind appliances cleaned",
      "Oven / stove deep cleaned",
      "Fridge interior cleaned",
      "Grout scrubbed",
      "Light fixtures cleaned",
      "Vents dusted",
      "Cabinet interiors wiped",
      "Window tracks cleaned",
      "Walls spot cleaned",
    ],
  },
  maintenance: {
    icon: "🔧",
    label: "Maintenance Check",
    color: "bg-amber-500",
    tasks: [
      "Smoke detectors tested",
      "HVAC filter checked",
      "Plumbing inspected",
      "Electrical outlets tested",
      "Door locks functional",
      "Windows seal intact",
      "Exterior drainage clear",
      "Caulking inspected",
    ],
  },
};

export default function QuickLogCreator() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [reportName, setReportName] = useState("");
  const [clientName, setClientName] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [savedLogId, setSavedLogId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const selectTemplate = (type: TemplateType) => {
    setSelectedTemplate(type);
    const preset = TEMPLATE_PRESETS[type];
    setTasks(
      preset.tasks.map((label, i) => ({
        id: `task-${i}`,
        label,
        completed: false,
      }))
    );
    setSavedLogId(null);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const addCustomTask = () => {
    if (!newTaskLabel.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: newTaskLabel.trim(), completed: false },
    ]);
    setNewTaskLabel("");
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleSave = async () => {
    if (!user || !selectedTemplate) return;
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    setIsSaving(true);
    try {
      const tasksData = {
        clientName: clientName.trim() || undefined,
        items: tasks.map((t) => ({ label: t.label, completed: t.completed })),
      };

      const { data, error } = await supabase
        .from("site_logs")
        .insert({
          user_id: user.id,
          report_name: reportName.trim(),
          template_type: selectedTemplate,
          tasks_data: tasksData,
          completed_count: completedCount,
          total_count: tasks.length,
          photos_count: 0,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      setSavedLogId(data.id);
      toast.success("Report saved!");
    } catch (error) {
      console.error("Error saving site log:", error);
      toast.error("Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${reportName.trim() || "quick-log"}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);

      // Upload to storage if saved
      if (savedLogId) {
        const pdfBlob = pdf.output("blob");
        const storagePath = `${user!.id}/${savedLogId}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("site-log-pdfs")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from("site-log-pdfs")
            .getPublicUrl(storagePath);

          await supabase
            .from("site_logs")
            .update({ pdf_url: publicUrl.publicUrl })
            .eq("id", savedLogId);
        }
      }

      toast.success("PDF generated!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setReportName("");
    setClientName("");
    setTasks([]);
    setNotes("");
    setNewTaskLabel("");
    setSavedLogId(null);
  };

  // Template selection
  if (!selectedTemplate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Quick Log — New Report
          </CardTitle>
          <CardDescription>Choose a template to start your inspection report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(TEMPLATE_PRESETS) as [TemplateType, typeof TEMPLATE_PRESETS["standard"]][]).map(
              ([type, preset]) => (
                <button
                  key={type}
                  onClick={() => selectTemplate(type)}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-muted hover:border-primary transition-colors text-center group"
                >
                  <span className="text-4xl">{preset.icon}</span>
                  <span className="font-semibold">{preset.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {preset.tasks.length} items
                  </Badge>
                </button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const preset = TEMPLATE_PRESETS[selectedTemplate];

  return (
    <div className="space-y-4">
      {/* Active form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>{preset.icon}</span>
              {preset.label}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              ← Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Report Name *</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. 123 Main St - Move-out Clean"
              />
            </div>
            <div>
              <Label>Client Name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{tasks.length}
            </span>
          </div>

          {/* Checklist */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  task.completed ? "bg-green-500/10 border-green-500/30" : "bg-card border-muted"
                }`}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                />
                <span className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.label}
                </span>
                {task.id.startsWith("custom-") && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTask(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add custom task */}
          <div className="flex gap-2">
            <Input
              value={newTaskLabel}
              onChange={(e) => setNewTaskLabel(e.target.value)}
              placeholder="Add custom task..."
              onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
            />
            <Button variant="outline" size="icon" onClick={addCustomTask}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes, observations..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving || !reportName.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {savedLogId ? "Update" : "Save Report"}
            </Button>
            <Button
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf || !reportName.trim()}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate PDF
            </Button>
            {savedLogId && (
              <Badge variant="outline" className="self-center text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden PDF content */}
      <div className="fixed left-[-9999px] top-0">
        <div
          ref={pdfRef}
          style={{
            width: "794px",
            padding: "40px",
            fontFamily: "Arial, sans-serif",
            backgroundColor: "#ffffff",
            color: "#111",
          }}
        >
          <div style={{ borderBottom: "3px solid #222", paddingBottom: "16px", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "24px", margin: 0 }}>
              {preset.icon} {preset.label} Report
            </h1>
            <p style={{ fontSize: "14px", color: "#666", margin: "4px 0 0" }}>
              {reportName || "Untitled"} — {format(new Date(), "MMMM d, yyyy")}
            </p>
            {clientName && (
              <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 0" }}>Client: {clientName}</p>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>
              Checklist ({completedCount}/{tasks.length} completed)
            </h2>
            {tasks.map((task, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span style={{ fontSize: "14px" }}>{task.completed ? "✅" : "⬜"}</span>
                <span
                  style={{
                    fontSize: "14px",
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed ? "#888" : "#111",
                  }}
                >
                  {task.label}
                </span>
              </div>
            ))}
          </div>

          {notes && (
            <div style={{ marginTop: "20px" }}>
              <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Notes</h2>
              <p style={{ fontSize: "13px", color: "#444", whiteSpace: "pre-wrap" }}>{notes}</p>
            </div>
          )}

          <div
            style={{
              marginTop: "40px",
              paddingTop: "16px",
              borderTop: "2px solid #222",
              fontSize: "11px",
              color: "#999",
              textAlign: "center",
            }}
          >
            Generated by BuildUnion Quick Log • {format(new Date(), "yyyy-MM-dd HH:mm")}
          </div>
        </div>
      </div>
    </div>
  );
}
