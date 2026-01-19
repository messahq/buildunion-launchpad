import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { RegionSelector } from "@/components/RegionSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Camera,
  Calculator,
  FileText,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Download,
  Send,
  Edit3,
  Save,
  Trash2,
  Plus,
  TrendingUp,
  Receipt,
  Building2,
  User,
  Phone,
  Mail,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  AlertOctagon,
  ShieldAlert
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface LineItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  source: "photo" | "calculator" | "template" | "blueprint" | "manual";
}

interface ProjectSummaryData {
  id: string;
  project_id: string | null;
  photo_estimate: any;
  calculator_results: any[];
  template_items: any[];
  blueprint_analysis: any;
  verified_facts: any[];
  material_cost: number;
  labor_cost: number;
  total_cost: number;
  line_items: LineItem[];
  status: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  notes: string | null;
  invoice_status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectSummaryProps {
  summaryId?: string;
  photoEstimate?: any;
  calculatorResults?: any[];
  templateItems?: any[];
  projectId?: string;
  onClose?: () => void;
}

export function ProjectSummary({
  summaryId,
  photoEstimate,
  calculatorResults = [],
  templateItems = [],
  projectId,
  onClose
}: ProjectSummaryProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency, formatDate, calculateTax, config } = useRegionSettings();
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<LineItem[]>([]);
  const [clientInfo, setClientInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (summaryId) {
      fetchSummary();
    } else if (user) {
      createNewSummary();
    }
  }, [summaryId, user]);

  const fetchSummary = async () => {
    if (!summaryId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_summaries")
        .select("*")
        .eq("id", summaryId)
        .single();

      if (error) throw error;
      
      // Cast the data to our expected type
      const summaryData = data as unknown as ProjectSummaryData;
      setSummary(summaryData);
      setEditedItems(summaryData.line_items || []);
      setClientInfo({
        name: summaryData.client_name || "",
        email: summaryData.client_email || "",
        phone: summaryData.client_phone || "",
        address: summaryData.client_address || ""
      });
      setNotes(summaryData.notes || "");
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  const createNewSummary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Build initial line items from collected data
      const initialLineItems: LineItem[] = [];
      
      // Process photo estimate materials
      if (photoEstimate?.materials && Array.isArray(photoEstimate.materials)) {
        photoEstimate.materials.forEach((mat: any) => {
          initialLineItems.push({
            name: mat.item || mat.name || "Material",
            quantity: mat.quantity || 1,
            unit: mat.unit || "unit",
            unit_price: mat.price || mat.unitPrice || 0,
            total: (mat.quantity || 1) * (mat.price || mat.unitPrice || 0),
            source: "photo"
          });
        });
      }
      
      // Process calculator results
      if (calculatorResults && Array.isArray(calculatorResults)) {
        calculatorResults.forEach((calc: any) => {
          if (calc.result?.materials && Array.isArray(calc.result.materials)) {
            calc.result.materials.forEach((mat: any) => {
              initialLineItems.push({
                name: mat.item || mat.name || "Material",
                quantity: mat.quantity || 1,
                unit: mat.unit || "unit",
                unit_price: 0,
                total: 0,
                source: "calculator"
              });
            });
          }
          // Add labor from calculator
          if (calc.result?.laborHours) {
            initialLineItems.push({
              name: `Labor - ${calc.calcType || "Work"}`,
              quantity: calc.result.laborHours,
              unit: "hour",
              unit_price: 0,
              total: 0,
              source: "calculator"
            });
          }
        });
      }
      
      // Process template items
      if (templateItems && Array.isArray(templateItems)) {
        templateItems.forEach((template: any) => {
          // Add template materials
          if (template.materials && Array.isArray(template.materials)) {
            template.materials.forEach((mat: any) => {
              const matName = typeof mat === "string" ? mat : (mat.name || mat.item || "Material");
              initialLineItems.push({
                name: matName,
                quantity: typeof mat === "object" ? (mat.quantity || 1) : 1,
                unit: typeof mat === "object" ? (mat.unit || "unit") : "unit",
                unit_price: typeof mat === "object" ? (mat.price || 0) : 0,
                total: 0,
                source: "template"
              });
            });
          }
          // Add template tasks as labor items
          if (template.checklist && Array.isArray(template.checklist)) {
            const completedCount = template.completedTasks?.length || 0;
            if (completedCount > 0) {
              initialLineItems.push({
                name: `${template.templateName || template.projectName || "Template"} - Labor`,
                quantity: completedCount,
                unit: "tasks",
                unit_price: 0,
                total: 0,
                source: "template"
              });
            }
          }
        });
      }
      
      const { data, error } = await supabase
        .from("project_summaries")
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          photo_estimate: photoEstimate || null,
          calculator_results: calculatorResults || [],
          template_items: templateItems || [],
          line_items: initialLineItems.length > 0 ? (initialLineItems as unknown as any) : null,
          status: "draft"
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      const summaryData = data as unknown as ProjectSummaryData;
      setSummary(summaryData);
      setEditedItems(initialLineItems);
      
      // Auto-trigger AI analysis for price estimation if we have items
      if (initialLineItems.length > 0) {
        toast.success(`${initialLineItems.length} items loaded from Quick Mode!`);
        // Optionally run AI for price estimation
        // await runAIAnalysis(summaryData.id);
      }
    } catch (error) {
      console.error("Error creating summary:", error);
      toast.error("Failed to create summary");
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async (id: string) => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("generate-summary", {
        body: { summaryId: id, action: "analyze" }
      });

      if (response.error) throw response.error;

      toast.success("AI analysis complete!");
      await fetchSummary();
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveSummary = async () => {
    if (!summary) return;
    setSaving(true);
    try {
      const totalMaterial = editedItems.reduce((sum, item) => 
        item.source !== "manual" ? sum + item.total : sum, 0
      );
      const totalLabor = editedItems.reduce((sum, item) => 
        item.source === "manual" ? sum + item.total : sum, 0
      );

      const { error } = await supabase
        .from("project_summaries")
        .update({
          line_items: editedItems as unknown as any,
          material_cost: totalMaterial,
          labor_cost: totalLabor,
          total_cost: totalMaterial + totalLabor,
          client_name: clientInfo.name || null,
          client_email: clientInfo.email || null,
          client_phone: clientInfo.phone || null,
          client_address: clientInfo.address || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", summary.id);

      if (error) throw error;

      toast.success("Summary saved!");
      setEditMode(false);
      await fetchSummary();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addLineItem = () => {
    setEditedItems([
      ...editedItems,
      {
        name: "New item",
        quantity: 1,
        unit: "unit",
        unit_price: 0,
        total: 0,
        source: "manual"
      }
    ]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate total
    if (field === "quantity" || field === "unit_price") {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    setEditedItems(updated);
  };

  const removeLineItem = (index: number) => {
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };

  const generatePDF = () => {
    toast.info("Generating PDF...");
    // This would integrate with the existing PDF quote generator
    navigate("/buildunion/quick?tab=quote");
  };

  // formatCurrency and formatDate now come from useRegionSettings hook

  const getSourceBadge = (source: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      photo: { icon: Camera, color: "bg-blue-100 text-blue-700", label: "Photo" },
      calculator: { icon: Calculator, color: "bg-green-100 text-green-700", label: "Calculator" },
      template: { icon: FileText, color: "bg-purple-100 text-purple-700", label: "Template" },
      blueprint: { icon: MapPin, color: "bg-orange-100 text-orange-700", label: "Blueprint" },
      manual: { icon: Edit3, color: "bg-gray-100 text-gray-700", label: "Manual" }
    };
    const config = configs[source] || configs.manual;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto" />
          <p className="text-muted-foreground">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <p className="text-muted-foreground">Summary not found</p>
      </div>
    );
  }

  const totalItems = editedItems.length;
  const materialTotal = editedItems.reduce((sum, item) => sum + item.total, 0);
  const taxResult = calculateTax(materialTotal);
  const grandTotal = taxResult.total;

  // ===== CONFLICT DETECTION =====
  // Check for conflicts between Quick Mode (photo estimate) and M.E.S.S.A. (blueprint analysis)
  const detectConflicts = () => {
    const conflicts: { field: string; quickValue: string; messaValue: string; severity: "high" | "medium" | "low" }[] = [];
    
    if (!summary) return conflicts;

    const photoData = summary.photo_estimate || {};
    const blueprintData = summary.blueprint_analysis || {};
    const facts = (summary.verified_facts as any[]) || [];

    // Compare total estimates if both exist
    if (photoData.total && blueprintData.total) {
      const photoTotal = parseFloat(photoData.total) || 0;
      const blueprintTotal = parseFloat(blueprintData.total) || 0;
      const difference = Math.abs(photoTotal - blueprintTotal);
      const percentDiff = photoTotal > 0 ? (difference / photoTotal) * 100 : 0;

      if (percentDiff > 20) {
        conflicts.push({
          field: "Total Cost Estimate",
          quickValue: formatCurrency(photoTotal),
          messaValue: formatCurrency(blueprintTotal),
          severity: percentDiff > 40 ? "high" : "medium"
        });
      }
    }

    // Compare area measurements
    if (photoData.area && blueprintData.area) {
      const photoArea = parseFloat(photoData.area) || 0;
      const blueprintArea = parseFloat(blueprintData.area) || 0;
      const difference = Math.abs(photoArea - blueprintArea);
      const percentDiff = photoArea > 0 ? (difference / photoArea) * 100 : 0;

      if (percentDiff > 15) {
        conflicts.push({
          field: "Area Measurement",
          quickValue: `${photoArea} sq ft`,
          messaValue: `${blueprintArea} sq ft`,
          severity: percentDiff > 30 ? "high" : "medium"
        });
      }
    }

    // Check for material count discrepancies
    if (photoData.materials?.length && blueprintData.materials?.length) {
      const photoMaterialCount = photoData.materials.length;
      const blueprintMaterialCount = blueprintData.materials.length;
      
      if (Math.abs(photoMaterialCount - blueprintMaterialCount) > 3) {
        conflicts.push({
          field: "Material Item Count",
          quickValue: `${photoMaterialCount} items`,
          messaValue: `${blueprintMaterialCount} items`,
          severity: "low"
        });
      }
    }

    // Check verified facts for conflicts
    facts.forEach((fact: any) => {
      if (fact.verification_status === "conflict" || fact.verification_status === "disputed") {
        conflicts.push({
          field: fact.question?.slice(0, 50) || "Verified data",
          quickValue: "Photo estimate",
          messaValue: "Blueprint analysis",
          severity: "medium"
        });
      }
    });

    return conflicts;
  };

  const conflicts = detectConflicts();
  const hasHighSeverityConflict = conflicts.some(c => c.severity === "high");

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-amber-500" />
              Project Summary
            </h1>
            <p className="text-muted-foreground text-sm">
              Created: {formatDate(summary.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <RegionSelector compact />
          <Button
            variant="outline"
            onClick={() => runAIAnalysis(summary.id)}
            disabled={analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            AI Re-analyze
          </Button>
          
          {editMode ? (
            <Button onClick={saveSummary} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)} className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* CONFLICT DETECTION ALERT */}
      {conflicts.length > 0 && (
        <Alert variant={hasHighSeverityConflict ? "destructive" : "default"} className={hasHighSeverityConflict ? "border-red-500 bg-red-50" : "border-amber-500 bg-amber-50"}>
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="flex items-center gap-2">
            <span>⚠️ Conflict Detected</span>
            <Badge variant={hasHighSeverityConflict ? "destructive" : "secondary"}>
              {conflicts.length} discrepancies
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm mb-3">
              Discrepancies found between Quick Mode (photo estimate) and M.E.S.S.A. (blueprint analysis). 
              <strong className="text-red-700"> Please verify the data before sending a quote!</strong>
            </p>
            <div className="space-y-2">
              {conflicts.map((conflict, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    conflict.severity === "high" ? "bg-red-100" : 
                    conflict.severity === "medium" ? "bg-amber-100" : "bg-gray-100"
                  }`}
                >
                  <span className="font-medium">{conflict.field}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {conflict.quickValue}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {conflict.messaValue}
                    </span>
                    {conflict.severity === "high" && (
                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Source Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Photo Estimate</p>
              <p className="font-bold text-blue-800">
                {summary.photo_estimate?.total ? formatCurrency(summary.photo_estimate.total) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calculator className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Calculator</p>
              <p className="font-bold text-green-800">
                {(summary.calculator_results as any[])?.length || 0} calculations
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-purple-600 font-medium">Template Items</p>
              <p className="font-bold text-purple-800">
                {(summary.template_items as any[])?.length || 0} items
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-600 font-medium">M.E.S.S.A. Facts</p>
              <p className="font-bold text-orange-800">
                {(summary.verified_facts as any[])?.length || 0} verified
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis Indicator */}
      {analyzing && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-6 flex items-center justify-center gap-4">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-amber-500 animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-8 w-8 text-amber-300" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-amber-800">AI Analysis in progress...</p>
              <p className="text-sm text-amber-600">Synthesizing data from all sources</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-slate-500" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Name
              </label>
              <Input
                value={clientInfo.name}
                onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                disabled={!editMode}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </label>
              <Input
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                disabled={!editMode}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone
              </label>
              <Input
                value={clientInfo.phone}
                onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                disabled={!editMode}
                placeholder="+1 (XXX) XXX-XXXX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Address
              </label>
              <Input
                value={clientInfo.address}
                onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                disabled={!editMode}
                placeholder="Project location"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-slate-500" />
              Line Items ({totalItems})
            </CardTitle>
            {editMode && (
              <Button size="sm" variant="outline" onClick={addLineItem} className="gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-center">Qty</th>
                  <th className="pb-3 font-medium text-center">Unit</th>
                  <th className="pb-3 font-medium text-right">Unit Price</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-center">Source</th>
                  {editMode && <th className="pb-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {editedItems.map((item, index) => (
                  <tr key={index} className="group">
                    <td className="py-3">
                      {editMode ? (
                        <Input
                          value={item.name}
                          onChange={(e) => updateLineItem(index, "name", e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {editMode ? (
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-center mx-auto"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {editMode ? (
                        <Input
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, "unit", e.target.value)}
                          className="h-8 w-16 text-center mx-auto"
                        />
                      ) : (
                        <span className="text-muted-foreground">{item.unit}</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editMode ? (
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="h-8 w-28 text-right ml-auto"
                        />
                      ) : (
                        formatCurrency(item.unit_price)
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatCurrency(editMode ? item.quantity * item.unit_price : item.total)}
                    </td>
                    <td className="py-3 text-center">
                      {getSourceBadge(item.source)}
                    </td>
                    {editMode && (
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {editedItems.length === 0 && (
                  <tr>
                    <td colSpan={editMode ? 7 : 6} className="py-8 text-center text-muted-foreground">
                      No items yet. {editMode ? "Add a new item!" : "Run AI analysis!"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <Separator className="my-4" />
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(materialTotal)}</span>
              </div>
              {taxResult.breakdown.map((tax, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    {tax.name} ({(config.tax.components[idx]?.rate * 100).toFixed(tax.name === "QST" ? 3 : 0)}%)
                    <Badge variant="outline" className="text-xs">{config.shortName}</Badge>
                  </span>
                  <span>{formatCurrency(tax.amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-amber-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!editMode}
            placeholder="Additional notes, terms, warranty information..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={generatePDF} className="gap-2">
          <Download className="h-4 w-4" />
          PDF Quote
        </Button>
        <Button 
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          onClick={() => toast.info("Invoice generation coming soon...")}
        >
          <Send className="h-4 w-4" />
          Send Invoice
        </Button>
      </div>
    </div>
  );
}
