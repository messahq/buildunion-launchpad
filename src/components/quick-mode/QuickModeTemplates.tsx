import { useState, useEffect, useMemo } from "react";
import { Bath, UtensilsCrossed, PaintBucket, Home, Wrench, Zap, Droplets, TreePine, Check, ChevronRight, Plus, Pencil, Trash2, X, Save, ClipboardList, Star, User, AlertCircle, Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChecklistItem {
  id: string;
  task: string;
  category: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  avgDuration: string;
  checklist: ChecklistItem[];
  materials: string[];
  isCustom?: boolean;
  isSaved?: boolean;
  savedTemplateId?: string;
}

interface QuickModeTemplatesProps {
  onTemplateSelect?: (data: {
    templateId: string;
    templateName: string;
    projectName: string;
    checklist: ChecklistItem[];
    completedTasks: string[];
    materials: string[];
    projectStatus?: {
      status: string;
      label: string;
      progress: number;
    };
  }) => void;
  onContinueToCalculator?: (data: {
    templateId: string;
    templateName: string;
    projectName: string;
    checklist: ChecklistItem[];
    completedTasks: string[];
    materials: string[];
    projectStatus?: {
      status: string;
      label: string;
      progress: number;
    };
  }) => void;
}

const defaultTemplates: ProjectTemplate[] = [
  {
    id: "bathroom",
    name: "Bathroom Renovation",
    icon: <Bath className="w-6 h-6" />,
    color: "bg-blue-500",
    description: "Complete bathroom remodel including fixtures, tiling, and plumbing",
    avgDuration: "5-10 days",
    checklist: [
      { id: "b1", task: "Demolition & removal of old fixtures", category: "Prep" },
      { id: "b2", task: "Plumbing rough-in inspection", category: "Plumbing" },
      { id: "b3", task: "Waterproofing membrane application", category: "Waterproofing" },
      { id: "b4", task: "Tile installation - floor", category: "Tiling" },
      { id: "b5", task: "Tile installation - walls", category: "Tiling" },
      { id: "b6", task: "Vanity & sink installation", category: "Fixtures" },
      { id: "b7", task: "Toilet installation", category: "Fixtures" },
      { id: "b8", task: "Shower/tub installation", category: "Fixtures" },
      { id: "b9", task: "Electrical - GFCI outlets", category: "Electrical" },
      { id: "b10", task: "Ventilation fan installation", category: "Electrical" },
      { id: "b11", task: "Final plumbing connections", category: "Plumbing" },
      { id: "b12", task: "Grouting & caulking", category: "Finishing" },
      { id: "b13", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Tiles", "Grout", "Thinset", "Waterproofing membrane", "Vanity", "Toilet", "Faucets", "Shower fixtures"],
  },
  {
    id: "kitchen",
    name: "Kitchen Remodel",
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: "bg-orange-500",
    description: "Kitchen renovation with cabinets, countertops, and appliances",
    avgDuration: "2-4 weeks",
    checklist: [
      { id: "k1", task: "Remove existing cabinets & appliances", category: "Demolition" },
      { id: "k2", task: "Electrical updates for appliances", category: "Electrical" },
      { id: "k3", task: "Plumbing rough-in for sink", category: "Plumbing" },
      { id: "k4", task: "Cabinet installation - base", category: "Cabinets" },
      { id: "k5", task: "Cabinet installation - wall", category: "Cabinets" },
      { id: "k6", task: "Countertop templating", category: "Countertops" },
      { id: "k7", task: "Countertop installation", category: "Countertops" },
      { id: "k8", task: "Backsplash installation", category: "Tiling" },
      { id: "k9", task: "Sink & faucet installation", category: "Plumbing" },
      { id: "k10", task: "Appliance installation", category: "Appliances" },
      { id: "k11", task: "Cabinet hardware installation", category: "Finishing" },
      { id: "k12", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Cabinets", "Countertops", "Backsplash tile", "Sink", "Faucet", "Hardware", "Appliances"],
  },
  {
    id: "painting",
    name: "Interior Painting",
    icon: <PaintBucket className="w-6 h-6" />,
    color: "bg-cyan-500",
    description: "Full room or house interior painting with prep work",
    avgDuration: "2-5 days",
    checklist: [
      { id: "p1", task: "Move/cover furniture", category: "Prep" },
      { id: "p2", task: "Repair holes & cracks", category: "Prep" },
      { id: "p3", task: "Sand surfaces", category: "Prep" },
      { id: "p4", task: "Apply painter's tape", category: "Prep" },
      { id: "p5", task: "Apply primer coat", category: "Priming" },
      { id: "p6", task: "First coat - walls", category: "Painting" },
      { id: "p7", task: "First coat - ceiling", category: "Painting" },
      { id: "p8", task: "Second coat - walls", category: "Painting" },
      { id: "p9", task: "Second coat - ceiling", category: "Painting" },
      { id: "p10", task: "Trim & detail work", category: "Finishing" },
      { id: "p11", task: "Remove tape & touch-ups", category: "Finishing" },
      { id: "p12", task: "Clean up & final walk-through", category: "Finishing" },
    ],
    materials: ["Paint", "Primer", "Painter's tape", "Drop cloths", "Brushes", "Rollers", "Spackle", "Sandpaper"],
  },
  {
    id: "roofing",
    name: "Roof Repair/Replace",
    icon: <Home className="w-6 h-6" />,
    color: "bg-slate-600",
    description: "Roofing repairs or full shingle replacement",
    avgDuration: "1-3 days",
    checklist: [
      { id: "r1", task: "Safety equipment setup", category: "Safety" },
      { id: "r2", task: "Remove old shingles", category: "Demolition" },
      { id: "r3", task: "Inspect decking for damage", category: "Inspection" },
      { id: "r4", task: "Replace damaged decking", category: "Repair" },
      { id: "r5", task: "Install ice & water shield", category: "Underlayment" },
      { id: "r6", task: "Install felt underlayment", category: "Underlayment" },
      { id: "r7", task: "Install drip edge", category: "Flashing" },
      { id: "r8", task: "Install shingles", category: "Shingles" },
      { id: "r9", task: "Install ridge cap", category: "Shingles" },
      { id: "r10", task: "Flash around penetrations", category: "Flashing" },
      { id: "r11", task: "Clean up & debris removal", category: "Finishing" },
      { id: "r12", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Shingles", "Underlayment", "Ice & water shield", "Drip edge", "Flashing", "Roofing nails", "Ridge cap"],
  },
  {
    id: "electrical",
    name: "Electrical Upgrade",
    icon: <Zap className="w-6 h-6" />,
    color: "bg-yellow-500",
    description: "Panel upgrades, new circuits, or outlet installation",
    avgDuration: "1-2 days",
    checklist: [
      { id: "e1", task: "Permit application", category: "Permits" },
      { id: "e2", task: "Power shutdown coordination", category: "Safety" },
      { id: "e3", task: "Remove old panel (if upgrading)", category: "Demolition" },
      { id: "e4", task: "Install new panel/breakers", category: "Installation" },
      { id: "e5", task: "Run new circuits", category: "Wiring" },
      { id: "e6", task: "Install outlets/switches", category: "Devices" },
      { id: "e7", task: "Grounding & bonding", category: "Safety" },
      { id: "e8", task: "Label circuits", category: "Finishing" },
      { id: "e9", task: "Rough-in inspection", category: "Inspection" },
      { id: "e10", task: "Final inspection & power-on", category: "Inspection" },
    ],
    materials: ["Breaker panel", "Breakers", "Wire", "Outlets", "Switches", "Junction boxes", "Conduit"],
  },
  {
    id: "plumbing",
    name: "Plumbing Repair",
    icon: <Droplets className="w-6 h-6" />,
    color: "bg-cyan-500",
    description: "Pipe repairs, fixture replacement, or drain clearing",
    avgDuration: "2-8 hours",
    checklist: [
      { id: "pl1", task: "Locate main water shutoff", category: "Prep" },
      { id: "pl2", task: "Shut off water supply", category: "Prep" },
      { id: "pl3", task: "Diagnose issue", category: "Diagnosis" },
      { id: "pl4", task: "Remove damaged components", category: "Repair" },
      { id: "pl5", task: "Install replacement parts", category: "Repair" },
      { id: "pl6", task: "Test for leaks", category: "Testing" },
      { id: "pl7", task: "Restore water supply", category: "Testing" },
      { id: "pl8", task: "Final leak check", category: "Inspection" },
      { id: "pl9", task: "Clean up work area", category: "Finishing" },
    ],
    materials: ["Pipes/fittings", "Sealant tape", "Valves", "Fixtures", "Soldering supplies", "Pipe cutters"],
  },
  {
    id: "hvac",
    name: "HVAC Service",
    icon: <Wrench className="w-6 h-6" />,
    color: "bg-emerald-500",
    description: "Heating/cooling maintenance, repair, or installation",
    avgDuration: "2-6 hours",
    checklist: [
      { id: "h1", task: "Thermostat check", category: "Diagnosis" },
      { id: "h2", task: "Filter inspection/replacement", category: "Maintenance" },
      { id: "h3", task: "Ductwork inspection", category: "Inspection" },
      { id: "h4", task: "Refrigerant level check", category: "AC" },
      { id: "h5", task: "Electrical connections check", category: "Electrical" },
      { id: "h6", task: "Clean condenser coils", category: "Cleaning" },
      { id: "h7", task: "Check blower motor", category: "Components" },
      { id: "h8", task: "Test system operation", category: "Testing" },
      { id: "h9", task: "Document readings", category: "Documentation" },
    ],
    materials: ["Filters", "Refrigerant", "Capacitors", "Contactors", "Thermostat", "Duct tape"],
  },
  {
    id: "landscaping",
    name: "Landscaping",
    icon: <TreePine className="w-6 h-6" />,
    color: "bg-green-600",
    description: "Garden design, planting, or hardscape installation",
    avgDuration: "1-5 days",
    checklist: [
      { id: "l1", task: "Mark utility lines (call before you dig)", category: "Safety" },
      { id: "l2", task: "Clear existing vegetation", category: "Prep" },
      { id: "l3", task: "Grade & level area", category: "Prep" },
      { id: "l4", task: "Install irrigation lines", category: "Irrigation" },
      { id: "l5", task: "Lay landscape fabric", category: "Prep" },
      { id: "l6", task: "Install edging", category: "Hardscape" },
      { id: "l7", task: "Place plants/trees", category: "Planting" },
      { id: "l8", task: "Spread mulch", category: "Finishing" },
      { id: "l9", task: "Test irrigation", category: "Testing" },
      { id: "l10", task: "Final cleanup", category: "Finishing" },
    ],
    materials: ["Plants", "Mulch", "Landscape fabric", "Edging", "Irrigation supplies", "Soil amendments"],
  },
  {
    id: "flooring",
    name: "Flooring Installation",
    icon: <Home className="w-6 h-6" />,
    color: "bg-amber-600",
    description: "Hardwood, laminate, tile, or vinyl flooring installation",
    avgDuration: "2-5 days",
    checklist: [
      { id: "f1", task: "Remove existing flooring", category: "Demolition" },
      { id: "f2", task: "Inspect subfloor condition", category: "Inspection" },
      { id: "f3", task: "Repair/level subfloor", category: "Prep" },
      { id: "f4", task: "Acclimate new flooring", category: "Prep" },
      { id: "f5", task: "Install moisture barrier", category: "Underlayment" },
      { id: "f6", task: "Install underlayment", category: "Underlayment" },
      { id: "f7", task: "Begin flooring installation", category: "Installation" },
      { id: "f8", task: "Cut around obstacles", category: "Installation" },
      { id: "f9", task: "Install transitions", category: "Finishing" },
      { id: "f10", task: "Install baseboards/trim", category: "Finishing" },
      { id: "f11", task: "Final cleaning", category: "Finishing" },
    ],
    materials: ["Flooring", "Underlayment", "Moisture barrier", "Adhesive", "Transitions", "Baseboards", "Trim nails"],
  },
  {
    id: "deck",
    name: "Deck Building",
    icon: <Home className="w-6 h-6" />,
    color: "bg-orange-700",
    description: "New deck construction or deck replacement",
    avgDuration: "3-7 days",
    checklist: [
      { id: "d1", task: "Obtain permits", category: "Permits" },
      { id: "d2", task: "Mark & dig post holes", category: "Foundation" },
      { id: "d3", task: "Set posts in concrete", category: "Foundation" },
      { id: "d4", task: "Install ledger board", category: "Framing" },
      { id: "d5", task: "Install beams", category: "Framing" },
      { id: "d6", task: "Install joists", category: "Framing" },
      { id: "d7", task: "Framing inspection", category: "Inspection" },
      { id: "d8", task: "Install decking boards", category: "Decking" },
      { id: "d9", task: "Install railing posts", category: "Railing" },
      { id: "d10", task: "Install balusters & top rail", category: "Railing" },
      { id: "d11", task: "Install stairs (if needed)", category: "Stairs" },
      { id: "d12", task: "Final inspection", category: "Inspection" },
    ],
    materials: ["Deck boards", "Joists", "Beams", "Posts", "Concrete", "Joist hangers", "Deck screws", "Railing"],
  },
  {
    id: "drywall",
    name: "Drywall Installation",
    icon: <Home className="w-6 h-6" />,
    color: "bg-gray-500",
    description: "New drywall hanging, taping, and finishing",
    avgDuration: "3-7 days",
    checklist: [
      { id: "dw1", task: "Measure & cut drywall sheets", category: "Prep" },
      { id: "dw2", task: "Hang ceiling drywall", category: "Installation" },
      { id: "dw3", task: "Hang wall drywall", category: "Installation" },
      { id: "dw4", task: "Cut outlet/switch openings", category: "Installation" },
      { id: "dw5", task: "Apply first coat of mud", category: "Taping" },
      { id: "dw6", task: "Apply tape to joints", category: "Taping" },
      { id: "dw7", task: "Second coat - joints", category: "Mudding" },
      { id: "dw8", task: "Third coat - feathering", category: "Mudding" },
      { id: "dw9", task: "Sand between coats", category: "Sanding" },
      { id: "dw10", task: "Final sanding", category: "Sanding" },
      { id: "dw11", task: "Prime drywall", category: "Finishing" },
    ],
    materials: ["Drywall sheets", "Drywall screws", "Joint compound", "Paper tape", "Corner bead", "Sandpaper", "Primer"],
  },
  {
    id: "window",
    name: "Window Replacement",
    icon: <Home className="w-6 h-6" />,
    color: "bg-sky-500",
    description: "Replace old windows with energy-efficient models",
    avgDuration: "1-2 days per window",
    checklist: [
      { id: "w1", task: "Measure existing windows", category: "Prep" },
      { id: "w2", task: "Order replacement windows", category: "Prep" },
      { id: "w3", task: "Remove interior trim", category: "Demolition" },
      { id: "w4", task: "Remove old window", category: "Demolition" },
      { id: "w5", task: "Inspect frame for damage", category: "Inspection" },
      { id: "w6", task: "Apply flashing tape", category: "Waterproofing" },
      { id: "w7", task: "Set new window in opening", category: "Installation" },
      { id: "w8", task: "Shim & level window", category: "Installation" },
      { id: "w9", task: "Secure window to frame", category: "Installation" },
      { id: "w10", task: "Insulate around window", category: "Insulation" },
      { id: "w11", task: "Reinstall interior trim", category: "Finishing" },
      { id: "w12", task: "Caulk exterior", category: "Finishing" },
    ],
    materials: ["Windows", "Shims", "Screws", "Flashing tape", "Foam insulation", "Caulk", "Trim"],
  },
  // Custom/Other template at the end
  {
    id: "other",
    name: "Custom Project",
    icon: <ClipboardList className="w-6 h-6" />,
    color: "bg-violet-500",
    description: "Create your own project with custom tasks and materials",
    avgDuration: "Varies",
    checklist: [],
    materials: [],
    isCustom: true,
  },
];

const QuickModeTemplates = ({ onTemplateSelect, onContinueToCalculator }: QuickModeTemplatesProps) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState("");
  const [templateTab, setTemplateTab] = useState<"default" | "saved">("default");
  const [userTemplates, setUserTemplates] = useState<ProjectTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Custom checklist state for "Other" template
  const [customChecklist, setCustomChecklist] = useState<ChecklistItem[]>([]);
  const [customMaterials, setCustomMaterials] = useState<string[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("General");
  const [newMaterial, setNewMaterial] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskValue, setEditingTaskValue] = useState("");

  // Fetch user saved templates
  useEffect(() => {
    const fetchUserTemplates = async () => {
      if (!user) return;
      setLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from("user_templates")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Convert to ProjectTemplate format
        const converted: ProjectTemplate[] = (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          icon: <span className="text-2xl">{t.icon || "📋"}</span>,
          color: "bg-gradient-to-br from-amber-500 to-orange-500",
          description: t.description || "Custom saved template",
          avgDuration: t.estimated_area ? `${t.estimated_area} ${t.area_unit}` : "Custom",
          checklist: (t.checklist as ChecklistItem[]) || [],
          materials: ((t.materials as any[]) || []).map((m: any) => 
            typeof m === "string" ? m : m.name
          ),
          isCustom: false,
          isSaved: true,
          savedTemplateId: t.id,
        }));

        setUserTemplates(converted);
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchUserTemplates();
  }, [user]);

  const deleteUserTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("user_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setUserTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success("Template deleted");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const addCustomTask = () => {
    if (!newTaskName.trim()) return;
    const newTask: ChecklistItem = {
      id: `custom_${Date.now()}`,
      task: newTaskName.trim(),
      category: newTaskCategory.trim() || "General"
    };
    setCustomChecklist(prev => [...prev, newTask]);
    setNewTaskName("");
    setNewTaskCategory("General");
  };

  const deleteTask = (taskId: string) => {
    setCustomChecklist(prev => prev.filter(t => t.id !== taskId));
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const startEditTask = (task: ChecklistItem) => {
    setEditingTaskId(task.id);
    setEditingTaskValue(task.task);
  };

  const saveEditTask = () => {
    if (!editingTaskId || !editingTaskValue.trim()) return;
    setCustomChecklist(prev => 
      prev.map(t => t.id === editingTaskId ? { ...t, task: editingTaskValue.trim() } : t)
    );
    setEditingTaskId(null);
    setEditingTaskValue("");
  };

  const addMaterial = () => {
    if (!newMaterial.trim()) return;
    setCustomMaterials(prev => [...prev, newMaterial.trim()]);
    setNewMaterial("");
  };

  const deleteMaterial = (index: number) => {
    setCustomMaterials(prev => prev.filter((_, i) => i !== index));
  };

  // Get the current checklist (either from template or custom)
  const currentChecklist = selectedTemplate?.isCustom ? customChecklist : (selectedTemplate?.checklist || []);
  const currentMaterials = selectedTemplate?.isCustom ? customMaterials : (selectedTemplate?.materials || []);

  const progress = currentChecklist.length > 0
    ? Math.round((completedTasks.size / currentChecklist.length) * 100)
    : 0;

  // Handle continue to next step (now goes to calculator)
  const handleContinue = () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    if (currentChecklist.length === 0) {
      toast.error("Please add at least one task to the checklist");
      return;
    }

    const templateData = {
      templateId: selectedTemplate!.id,
      templateName: selectedTemplate!.name,
      projectName: projectName.trim(),
      checklist: currentChecklist,
      completedTasks: Array.from(completedTasks),
      materials: currentMaterials,
      projectStatus: {
        status: projectStatus.status,
        label: projectStatus.label,
        progress
      }
    };

    // Also add to collected data
    if (onTemplateSelect) {
      onTemplateSelect(templateData);
    }

    // Continue to calculator with the template data
    if (onContinueToCalculator) {
      onContinueToCalculator(templateData);
      const statusMessage = progress < 100 
        ? `Template saved (${projectStatus.label}). Configure your materials in the Calculator.`
        : "Template complete! Now configure your materials in the Calculator.";
      toast.success(statusMessage);
    }
  };

  // Project status based on progress
  const projectStatus = useMemo(() => {
    const totalTasks = currentChecklist.length;
    if (totalTasks === 0) return { status: "not_started", label: "Not Started", color: "text-muted-foreground", bgColor: "bg-muted", icon: Circle };
    if (progress === 0) return { status: "not_started", label: "Not Started", color: "text-muted-foreground", bgColor: "bg-muted", icon: Circle };
    if (progress < 25) return { status: "just_started", label: "Just Started", color: "text-blue-600", bgColor: "bg-blue-100", icon: PlayCircle };
    if (progress < 50) return { status: "in_progress", label: "In Progress", color: "text-amber-600", bgColor: "bg-amber-100", icon: Clock };
    if (progress < 75) return { status: "halfway", label: "Halfway Done", color: "text-orange-600", bgColor: "bg-orange-100", icon: Clock };
    if (progress < 100) return { status: "almost_done", label: "Almost Done", color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle2 };
    return { status: "complete", label: "Complete", color: "text-green-700", bgColor: "bg-green-200", icon: CheckCircle2 };
  }, [progress, currentChecklist.length]);

  const isProjectIncomplete = progress < 100 && currentChecklist.length > 0;

  if (selectedTemplate) {
    const StatusIcon = projectStatus.icon;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => {
              setSelectedTemplate(null);
              setCompletedTasks(new Set());
              setProjectName("");
              setCustomChecklist([]);
              setCustomMaterials([]);
            }}>
              ← Back
            </Button>
            <div className={`w-10 h-10 rounded-lg ${selectedTemplate.color} flex items-center justify-center text-white`}>
              {selectedTemplate.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedTemplate.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedTemplate.avgDuration}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Project Status Badge */}
            <Badge className={`${projectStatus.bgColor} ${projectStatus.color} border-0 gap-1.5 px-3 py-1`}>
              <StatusIcon className="w-4 h-4" />
              {projectStatus.label}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {progress}% Complete
            </Badge>
            <Button 
              onClick={handleContinue}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <ChevronRight className="w-4 h-4" />
              Continue
            </Button>
          </div>
        </div>

        {/* Progress Bar with status color */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progress === 100 ? "bg-green-500" : 
              progress >= 75 ? "bg-green-400" :
              progress >= 50 ? "bg-amber-500" :
              progress >= 25 ? "bg-amber-400" : "bg-blue-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Incomplete Project Warning */}
        {isProjectIncomplete && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <span className="font-medium">Project not complete.</span> {currentChecklist.length - completedTasks.size} task(s) remaining. 
              You can continue, but the project will be marked as "{projectStatus.label}" in your Project Summary.
            </AlertDescription>
          </Alert>
        )}

        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            placeholder="e.g., Johnson Bathroom Reno"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Task Checklist
                {selectedTemplate.isCustom && (
                  <Badge variant="outline" className="text-violet-600 border-violet-300">
                    Editable
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {currentChecklist.length > 0 
                  ? `${completedTasks.size} of ${currentChecklist.length} tasks completed`
                  : "Add tasks to get started"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Task Form for Custom Template */}
              {selectedTemplate.isCustom && (
                <div className="mb-4 p-4 bg-violet-50 rounded-lg border border-violet-200 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Task name..."
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
                    />
                    <Input
                      placeholder="Category (e.g., Prep)"
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={addCustomTask}
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                    disabled={!newTaskName.trim()}
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {currentChecklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      completedTasks.has(item.id)
                        ? "bg-green-50 border-green-200"
                        : "bg-background border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={completedTasks.has(item.id)}
                      onCheckedChange={() => toggleTask(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      {editingTaskId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTaskValue}
                            onChange={(e) => setEditingTaskValue(e.target.value)}
                            className="h-8"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && saveEditTask()}
                          />
                          <Button size="sm" variant="ghost" onClick={saveEditTask}>
                            <Save className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor={item.id}
                            className={`font-medium cursor-pointer ${
                              completedTasks.has(item.id)
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {item.task}
                          </label>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {item.category}
                          </Badge>
                        </>
                      )}
                    </div>
                    {completedTasks.has(item.id) && !editingTaskId && (
                      <Check className="w-5 h-5 text-green-500 shrink-0" />
                    )}
                    {selectedTemplate.isCustom && !editingTaskId && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEditTask(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deleteTask(item.id)}
                          className="h-8 w-8 p-0 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {currentChecklist.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tasks yet. Add your first task above!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Materials
                {selectedTemplate.isCustom && (
                  <Badge variant="outline" className="text-violet-600 border-violet-300">
                    Editable
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedTemplate.isCustom 
                  ? "Add materials needed for your project"
                  : "Common materials needed for this project type"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add Material Form for Custom Template */}
              {selectedTemplate.isCustom && (
                <div className="mb-4 flex gap-2">
                  <Input
                    placeholder="Material name..."
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMaterial()}
                  />
                  <Button 
                    size="sm" 
                    onClick={addMaterial}
                    className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0"
                    disabled={!newMaterial.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {currentMaterials.map((material, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="py-2 px-3 text-sm group"
                  >
                    {material}
                    {selectedTemplate.isCustom && (
                      <button
                        onClick={() => deleteMaterial(index)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {currentMaterials.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.isCustom 
                      ? "No materials added yet"
                      : "No materials listed"
                    }
                  </p>
                )}
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  💡 <strong>Tip:</strong> Use the Calculator tab to get exact quantities based on your project dimensions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose a Project Template</h2>
        <p className="text-muted-foreground">
          Pre-built checklists and material lists for common construction projects
        </p>
      </div>

      {/* Template Tabs */}
      <Tabs value={templateTab} onValueChange={(v) => setTemplateTab(v as "default" | "saved")} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="default" className="gap-2">
            <Star className="h-4 w-4" />
            Default Templates
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <User className="h-4 w-4" />
            My Templates {userTemplates.length > 0 && `(${userTemplates.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="default" className="mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {defaultTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer hover:shadow-lg transition-all group ${
                  template.isCustom 
                    ? "hover:border-violet-400 border-dashed" 
                    : "hover:border-amber-400"
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${template.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                    {template.icon}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{template.avgDuration}</Badge>
                    {template.isCustom ? (
                      <Plus className="w-4 h-4 text-violet-500 group-hover:text-violet-600 transition-colors" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {!user ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sign in to view your templates</h3>
              <p className="text-muted-foreground text-sm">
                Save project configurations as reusable templates
              </p>
            </div>
          ) : loadingTemplates ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your templates...</p>
            </div>
          ) : userTemplates.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No saved templates yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create a project and save it as a template to reuse later
              </p>
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                Tip: Use "Save as Template" from any Project Summary
              </Badge>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {userTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-lg transition-all group hover:border-amber-400 relative"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-6">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (template.savedTemplateId) {
                            deleteUserTemplate(template.savedTemplateId);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${template.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                      {template.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {template.checklist.length} tasks
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        Saved
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuickModeTemplates;
