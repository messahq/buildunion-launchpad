import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBuProfile } from "@/hooks/useBuProfile";
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
  ShieldAlert,
  LayoutTemplate,
  FolderPlus,
  FileDown,
  Eye,
  FileSignature,
  ClipboardList,
  Shield,
  Brain,
  CheckSquare,
  Image,
  File,
  FileImage
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { SaveAsTemplateDialog } from "@/components/SaveAsTemplateDialog";
import { ShareSummaryDialog } from "@/components/ShareSummaryDialog";
import { generatePDFBlob, buildProjectSummaryHTML, buildContractHTML } from "@/lib/pdfGenerator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { saveDocumentToProject } from "@/lib/documentUtils";

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

interface ProjectContract {
  id: string;
  contract_number: string;
  status: string;
  contract_date: string;
  total_amount: number | null;
  contractor_name: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  contractor_address: string | null;
  contractor_license: string | null;
  scope_of_work: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  working_days: string | null;
  deposit_percentage: number | null;
  deposit_amount: number | null;
  payment_schedule: string | null;
  materials_included: boolean | null;
  warranty_period: string | null;
  change_order_policy: string | null;
  cancellation_policy: string | null;
  additional_terms: string | null;
  dispute_resolution: string | null;
  has_liability_insurance: boolean | null;
  has_wsib: boolean | null;
  client_signature: any;
  contractor_signature: any;
  template_type: string | null;
  created_at: string;
}

interface ProjectSummaryProps {
  summaryId?: string;
  photoEstimate?: any;
  calculatorResults?: any[];
  templateItems?: any[];
  quoteData?: any;
  projectId?: string;
  onClose?: () => void;
}

export function ProjectSummary({
  summaryId,
  photoEstimate,
  calculatorResults = [],
  templateItems = [],
  quoteData,
  projectId,
  onClose
}: ProjectSummaryProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useBuProfile();
  const { formatCurrency, formatDate, calculateTax, config } = useRegionSettings();
  const [summary, setSummary] = useState<ProjectSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<LineItem[]>([]);
  const [projectContracts, setProjectContracts] = useState<ProjectContract[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<{ id: string; file_name: string; file_path: string; file_size: number | null; uploaded_at: string }[]>([]);
  const [viewingContractId, setViewingContractId] = useState<string | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);
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

      // Fetch contracts and documents if project_id exists
      if (summaryData.project_id) {
        const [contractsResult, documentsResult] = await Promise.all([
          supabase
            .from("contracts")
            .select("*")
            .eq("project_id", summaryData.project_id)
            .order("created_at", { ascending: false }),
          supabase
            .from("project_documents")
            .select("*")
            .eq("project_id", summaryData.project_id)
            .order("uploaded_at", { ascending: false })
        ]);
        
        if (contractsResult.data) {
          setProjectContracts(contractsResult.data as unknown as ProjectContract[]);
        }
        if (documentsResult.data) {
          setProjectDocuments(documentsResult.data);
        }
      }
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
      
      // Process quote line items (from Quote Generator)
      if (quoteData?.lineItems && Array.isArray(quoteData.lineItems)) {
        quoteData.lineItems.forEach((item: any) => {
          initialLineItems.push({
            name: item.description || "Item",
            quantity: item.quantity || 1,
            unit: item.unit || "unit",
            unit_price: item.unitPrice || 0,
            total: (item.quantity || 1) * (item.unitPrice || 0),
            source: "manual"
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

      // Set client info from quote data
      if (quoteData) {
        setClientInfo({
          name: quoteData.clientName || "",
          email: quoteData.clientEmail || "",
          phone: quoteData.clientPhone || "",
          address: quoteData.clientAddress || quoteData.projectAddress || ""
        });
        setNotes(quoteData.notes || quoteData.paymentTerms || "");
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
          client_name: quoteData?.clientName || null,
          client_email: quoteData?.clientEmail || null,
          client_phone: quoteData?.clientPhone || null,
          client_address: quoteData?.clientAddress || quoteData?.projectAddress || null,
          notes: quoteData?.notes || quoteData?.paymentTerms || null,
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

  // Save as a new project and link the summary
  const saveToProjects = async () => {
    if (!user) {
      toast.error("Please sign in to save projects");
      return;
    }

    setSaving(true);
    try {
      // Get project name from quoteData or generate one
      const projectName = quoteData?.projectName || 
        `Quick Mode Project - ${new Date().toLocaleDateString()}`;
      
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description: `Generated from Quick Mode. Client: ${clientInfo.name || quoteData?.clientName || 'Not specified'}`,
          status: 'draft',
          address: clientInfo.address || quoteData?.clientAddress || quoteData?.projectAddress || null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Calculate totals
      const materialTotal = editedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxResult = calculateTax(materialTotal);

      // Update the existing summary with the project_id, or create new one if needed
      if (summary?.id) {
        const { error: updateError } = await supabase
          .from('project_summaries')
          .update({
            project_id: project.id,
            line_items: editedItems as unknown as any,
            material_cost: materialTotal,
            total_cost: taxResult.total,
            client_name: clientInfo.name || quoteData?.clientName || null,
            client_email: clientInfo.email || quoteData?.clientEmail || null,
            client_phone: clientInfo.phone || quoteData?.clientPhone || null,
            client_address: clientInfo.address || quoteData?.clientAddress || null,
            notes: notes || quoteData?.paymentTerms || null,
            status: 'saved',
            updated_at: new Date().toISOString()
          })
          .eq('id', summary.id);

        if (updateError) throw updateError;
      } else {
        // Create a new summary linked to the project
        const { error: summaryError } = await supabase
          .from('project_summaries')
          .insert({
            user_id: user.id,
            project_id: project.id,
            photo_estimate: photoEstimate || null,
            calculator_results: calculatorResults || [],
            template_items: templateItems || [],
            line_items: editedItems as unknown as any,
            material_cost: materialTotal,
            total_cost: taxResult.total,
            client_name: clientInfo.name || quoteData?.clientName || null,
            client_email: clientInfo.email || quoteData?.clientEmail || null,
            client_phone: clientInfo.phone || quoteData?.clientPhone || null,
            client_address: clientInfo.address || quoteData?.clientAddress || null,
            notes: notes || quoteData?.paymentTerms || null,
            status: 'saved'
          } as any);

        if (summaryError) throw summaryError;
      }

      // Auto-save PDF to project documents
      try {
        const pdfData = getPDFData();
        const html = buildProjectSummaryHTML(pdfData);
        const filename = `Summary_${pdfData.quoteNumber}.pdf`;
        const pdfBlob = await generatePDFBlob(html, { filename });
        
        await saveDocumentToProject({
          projectId: project.id,
          userId: user.id,
          fileName: filename,
          fileBlob: pdfBlob
        });
        
        toast.success("📄 Summary PDF saved to documents!");
      } catch (pdfError) {
        console.warn("Could not auto-save PDF:", pdfError);
        // Don't fail the whole save if PDF fails
      }

      // Clear the draft data since we saved to a project
      try {
        await supabase
          .from('user_draft_data')
          .delete()
          .eq('user_id', user.id)
          .eq('draft_type', 'quick_mode');
      } catch (e) {
        // Silently ignore draft deletion errors
      }

      // Show success toast with checkmark
      toast.success("✅ Project saved successfully! Redirecting to your project...", {
        duration: 2000,
      });
      
      // Navigate to the project details page
      setTimeout(() => {
        navigate(`/buildunion/project/${project.id}`);
      }, 1500);

    } catch (error: any) {
      console.error("Error saving to projects:", error);
      toast.error(error.message || "Failed to save project");
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

  // Helper function to get PDF data with all detailed summary elements
  const getPDFData = () => {
    const photoData = photoEstimate || summary?.photo_estimate || {};
    const currentDate = new Date().toLocaleDateString('en-CA');
    const quoteNumber = `BU-${Date.now().toString().slice(-8)}`;
    const matTotal = editedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxRes = calculateTax(matTotal);

    // Extract signatures from quoteData if available
    const clientSignature = quoteData?.clientSignature || null;
    const contractorSignature = quoteData?.contractorSignature || null;

    // Get calculator results from summary or props
    const calcResults = (calculatorResults.length > 0 ? calculatorResults : summary?.calculator_results) || [];
    
    // Get template items from summary or props
    const templItems = (templateItems.length > 0 ? templateItems : summary?.template_items) || [];

    // Format calculator results for PDF
    const formattedCalcResults = calcResults.map((calc: any) => ({
      calculator: calc.calculator || calc.name || 'Calculator',
      area: calc.area || calc.estimatedArea || 0,
      material: calc.material || calc.selectedMaterial || '',
      totalCost: calc.totalCost || calc.total || 0
    }));

    // Format template items for PDF
    const formattedTemplateItems = templItems.map((item: any) => ({
      name: item.name || 'Item',
      quantity: item.quantity || 1,
      unit: item.unit || 'units',
      unit_price: item.unit_price || item.price || 0
    }));

    // Format project documents for PDF
    const formattedDocs = projectDocuments.map((doc: any) => ({
      name: doc.file_name || doc.name || 'Document',
      type: doc.file_name?.includes('.pdf') ? 'pdf' : 
            doc.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'file'
    }));

    // Format contracts for PDF
    const formattedContracts = projectContracts.map((contract: any) => ({
      number: contract.contract_number || 'Contract',
      status: contract.status || 'draft',
      total: contract.total_amount || 0
    }));

    // Dual engine analysis data
    const dualEngineAnalysis = photoData?.geminiSummary || photoData?.openaiSummary ? {
      geminiSummary: photoData?.geminiSummary || 'Area estimation, spatial measurements, text extraction from blueprints/PDFs',
      openaiSummary: photoData?.openaiSummary || 'Material quantity verification, coverage rates, waste factor calculations',
      verificationStatus: photoData?.verificationStatus || 'verified'
    } : undefined;

    return {
      quoteNumber,
      currentDate,
      clientInfo,
      photoData,
      editedItems,
      materialTotal: matTotal,
      taxBreakdown: taxRes.breakdown.map((tax, idx) => ({
        name: tax.name,
        amount: tax.amount,
        rate: config.tax.components[idx]?.rate || 0
      })),
      grandTotal: taxRes.total,
      notes,
      status: summary?.status,
      createdAt: summary?.created_at ? formatDate(summary.created_at) : currentDate,
      regionShortName: config.shortName,
      formatCurrency,
      companyLogoUrl: profile?.company_logo_url,
      companyName: profile?.company_name,
      companyPhone: profile?.phone,
      companyEmail: user?.email,
      companyWebsite: profile?.company_website,
      clientSignature,
      contractorSignature,
      // Extended detailed data
      calculatorResults: formattedCalcResults,
      templateItems: formattedTemplateItems,
      dualEngineAnalysis,
      projectDocuments: formattedDocs,
      contracts: formattedContracts
    };
  };

  // Generate and download PDF
  const generatePDF = async (saveToProject: boolean = false, projectIdToSave?: string) => {
    setGeneratingPDF(true);
    try {
      const pdfData = getPDFData();
      const html = buildProjectSummaryHTML(pdfData);
      const filename = `ProjectSummary_${pdfData.quoteNumber}.pdf`;

      const pdfBlob = await generatePDFBlob(html, { filename });

      // If we should save to project documents
      if (saveToProject && projectIdToSave && user) {
        const result = await saveDocumentToProject({
          projectId: projectIdToSave,
          userId: user.id,
          fileName: filename,
          fileBlob: pdfBlob
        });
        
        if (result.success) {
          toast.success("📄 PDF saved to project documents!");
        }
      }

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      // Fallback to print method
      fallbackPrintPDF();
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Fallback print method for older browsers
  const fallbackPrintPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate PDF");
      return;
    }

    const pdfData = getPDFData();
    const html = buildProjectSummaryHTML(pdfData);

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast.success("PDF generated! Print dialog opened.");
  };

  // Contract PDF View (opens in new tab)
  const handleViewContractPDF = async (contract: ProjectContract) => {
    setViewingContractId(contract.id);
    try {
      const htmlContent = buildContractHTML({
        contractNumber: contract.contract_number,
        contractDate: contract.contract_date,
        templateType: contract.template_type || 'custom',
        contractorInfo: {
          name: contract.contractor_name || profile?.company_name || '',
          email: contract.contractor_email || user?.email || '',
          phone: contract.contractor_phone || profile?.phone || '',
          address: contract.contractor_address || '',
          license: contract.contractor_license || '',
        },
        clientInfo: {
          name: contract.client_name || '',
          email: contract.client_email || '',
          phone: contract.client_phone || '',
          address: contract.client_address || '',
        },
        projectInfo: {
          name: quoteData?.projectName || 'Project',
          address: contract.client_address || '',
          description: contract.scope_of_work || '',
        },
        financialTerms: {
          totalAmount: contract.total_amount || 0,
          depositPercentage: contract.deposit_percentage || 50,
          depositAmount: contract.deposit_amount || 0,
          paymentSchedule: contract.payment_schedule || 'As agreed',
        },
        timeline: {
          startDate: contract.start_date || '',
          estimatedEndDate: contract.estimated_end_date || '',
          workingDays: contract.working_days || 'Monday - Friday, 8:00 AM - 5:00 PM',
        },
        terms: {
          scopeOfWork: contract.scope_of_work || '',
          materialsIncluded: contract.materials_included ?? true,
          warrantyPeriod: contract.warranty_period || '1 year',
          changeOrderPolicy: contract.change_order_policy || '',
          cancellationPolicy: contract.cancellation_policy || '',
          additionalTerms: contract.additional_terms || '',
          disputeResolution: contract.dispute_resolution || '',
          hasLiabilityInsurance: contract.has_liability_insurance ?? true,
          hasWSIB: contract.has_wsib ?? true,
        },
        signatures: {
          client: contract.client_signature,
          contractor: contract.contractor_signature,
        },
        branding: {
          companyLogoUrl: profile?.company_logo_url || undefined,
          companyName: profile?.company_name || undefined,
          companyPhone: profile?.phone || undefined,
          companyEmail: user?.email || undefined,
          companyWebsite: profile?.company_website || undefined,
        },
        formatCurrency,
      });
      const blob = await generatePDFBlob(htmlContent, { filename: `Contract-${contract.contract_number}.pdf` });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing contract PDF:', error);
      toast.error('Failed to generate contract preview');
    } finally {
      setViewingContractId(null);
    }
  };

  // Contract PDF Download
  const handleDownloadContractPDF = async (contract: ProjectContract) => {
    setDownloadingContractId(contract.id);
    try {
      const htmlContent = buildContractHTML({
        contractNumber: contract.contract_number,
        contractDate: contract.contract_date,
        templateType: contract.template_type || 'custom',
        contractorInfo: {
          name: contract.contractor_name || profile?.company_name || '',
          email: contract.contractor_email || user?.email || '',
          phone: contract.contractor_phone || profile?.phone || '',
          address: contract.contractor_address || '',
          license: contract.contractor_license || '',
        },
        clientInfo: {
          name: contract.client_name || '',
          email: contract.client_email || '',
          phone: contract.client_phone || '',
          address: contract.client_address || '',
        },
        projectInfo: {
          name: quoteData?.projectName || 'Project',
          address: contract.client_address || '',
          description: contract.scope_of_work || '',
        },
        financialTerms: {
          totalAmount: contract.total_amount || 0,
          depositPercentage: contract.deposit_percentage || 50,
          depositAmount: contract.deposit_amount || 0,
          paymentSchedule: contract.payment_schedule || 'As agreed',
        },
        timeline: {
          startDate: contract.start_date || '',
          estimatedEndDate: contract.estimated_end_date || '',
          workingDays: contract.working_days || 'Monday - Friday, 8:00 AM - 5:00 PM',
        },
        terms: {
          scopeOfWork: contract.scope_of_work || '',
          materialsIncluded: contract.materials_included ?? true,
          warrantyPeriod: contract.warranty_period || '1 year',
          changeOrderPolicy: contract.change_order_policy || '',
          cancellationPolicy: contract.cancellation_policy || '',
          additionalTerms: contract.additional_terms || '',
          disputeResolution: contract.dispute_resolution || '',
          hasLiabilityInsurance: contract.has_liability_insurance ?? true,
          hasWSIB: contract.has_wsib ?? true,
        },
        signatures: {
          client: contract.client_signature,
          contractor: contract.contractor_signature,
        },
        branding: {
          companyLogoUrl: profile?.company_logo_url || undefined,
          companyName: profile?.company_name || undefined,
          companyPhone: profile?.phone || undefined,
          companyEmail: user?.email || undefined,
          companyWebsite: profile?.company_website || undefined,
        },
        formatCurrency,
      });
      const blob = await generatePDFBlob(htmlContent, { filename: `Contract-${contract.contract_number}.pdf` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract-${contract.contract_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Contract PDF downloaded!');
    } catch (error) {
      console.error('Error downloading contract PDF:', error);
      toast.error('Failed to download contract');
    } finally {
      setDownloadingContractId(null);
    }
  };

  const getContractStatusBadge = (status: string, clientSig: any, contractorSig: any) => {
    if (clientSig && contractorSig) {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Signed</Badge>;
    } else if (contractorSig) {
      return <Badge className="bg-amber-100 text-amber-700"><FileSignature className="h-3 w-3 mr-1" />Awaiting Client</Badge>;
    } else if (status === 'draft') {
      return <Badge variant="secondary"><Edit3 className="h-3 w-3 mr-1" />Draft</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  // formatCurrency and formatDate now come from useRegionSettings hook

  const getSourceBadge = (source: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      photo: { icon: Camera, color: "bg-blue-100 text-blue-700", label: "Photo" },
      calculator: { icon: Calculator, color: "bg-green-100 text-green-700", label: "Calculator" },
      template: { icon: FileText, color: "bg-cyan-100 text-cyan-700", label: "Template" },
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

      {/* ===== 8 ELEMENTS FOR OPERATIONAL TRUTH VERIFICATION ===== */}
      <Card className="border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-800">8 Data Elements for Operational Truth</h2>
              <p className="text-sm text-amber-600 font-normal">These elements will be analyzed by dual AI engines (OpenAI + Gemini) for verification</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid of 8 Elements */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Photo Estimate */}
            <Card className={`border-2 transition-all ${(photoEstimate || summary.photo_estimate) ? 'border-blue-300 bg-blue-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${(photoEstimate || summary.photo_estimate) ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Camera className={`h-4 w-4 ${(photoEstimate || summary.photo_estimate) ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">1. Photo Estimate</span>
                  {(photoEstimate || summary.photo_estimate) && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {(photoEstimate?.area || summary.photo_estimate?.area) 
                    ? `${photoEstimate?.area || summary.photo_estimate?.area} sq ft` 
                    : "Not provided"}
                </p>
                {(photoEstimate?.materials || summary.photo_estimate?.materials)?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(photoEstimate?.materials || summary.photo_estimate?.materials).length} materials detected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 2. Templates */}
            <Card className={`border-2 transition-all ${((summary.template_items as any[])?.length > 0 || templateItems?.length > 0) ? 'border-cyan-300 bg-cyan-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${((summary.template_items as any[])?.length > 0 || templateItems?.length > 0) ? 'bg-cyan-100' : 'bg-gray-100'}`}>
                    <LayoutTemplate className={`h-4 w-4 ${((summary.template_items as any[])?.length > 0 || templateItems?.length > 0) ? 'text-cyan-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">2. Templates</span>
                  {((summary.template_items as any[])?.length > 0 || templateItems?.length > 0) && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {(summary.template_items as any[])?.length || templateItems?.length || 0} items
                </p>
              </CardContent>
            </Card>

            {/* 3. Calculator */}
            <Card className={`border-2 transition-all ${((summary.calculator_results as any[])?.length > 0 || calculatorResults?.length > 0) ? 'border-green-300 bg-green-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${((summary.calculator_results as any[])?.length > 0 || calculatorResults?.length > 0) ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Calculator className={`h-4 w-4 ${((summary.calculator_results as any[])?.length > 0 || calculatorResults?.length > 0) ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">3. Calculator</span>
                  {((summary.calculator_results as any[])?.length > 0 || calculatorResults?.length > 0) && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {(summary.calculator_results as any[])?.length || calculatorResults?.length || 0} calculations
                </p>
              </CardContent>
            </Card>

            {/* 4. Quote - Line Items */}
            <Card className={`border-2 transition-all ${(quoteData?.lineItems?.length > 0 || editedItems.length > 0) ? 'border-purple-300 bg-purple-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${(quoteData?.lineItems?.length > 0 || editedItems.length > 0) ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    <ClipboardList className={`h-4 w-4 ${(quoteData?.lineItems?.length > 0 || editedItems.length > 0) ? 'text-purple-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">4. Quote Items</span>
                  {(quoteData?.lineItems?.length > 0 || editedItems.length > 0) && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {quoteData?.lineItems?.length || editedItems.length || 0} line items
                </p>
              </CardContent>
            </Card>

            {/* 5. Quote - Client Info */}
            <Card className={`border-2 transition-all ${(clientInfo.name || quoteData?.clientName) ? 'border-indigo-300 bg-indigo-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${(clientInfo.name || quoteData?.clientName) ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    <User className={`h-4 w-4 ${(clientInfo.name || quoteData?.clientName) ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">5. Client Info</span>
                  {(clientInfo.name || quoteData?.clientName) && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800 truncate">
                  {clientInfo.name || quoteData?.clientName || "Not provided"}
                </p>
              </CardContent>
            </Card>

            {/* 6. Quote - Pricing */}
            <Card className={`border-2 transition-all ${materialTotal > 0 ? 'border-emerald-300 bg-emerald-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${materialTotal > 0 ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    <Receipt className={`h-4 w-4 ${materialTotal > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">6. Quote Total</span>
                  {materialTotal > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {materialTotal > 0 ? formatCurrency(grandTotal) : "Not calculated"}
                </p>
              </CardContent>
            </Card>

            {/* 7. Contract - Preview */}
            <Card className={`border-2 transition-all ${projectContracts.length > 0 ? 'border-rose-300 bg-rose-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${projectContracts.length > 0 ? 'bg-rose-100' : 'bg-gray-100'}`}>
                    <Eye className={`h-4 w-4 ${projectContracts.length > 0 ? 'text-rose-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">7. Contract View</span>
                  {projectContracts.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {projectContracts.length > 0 ? `${projectContracts.length} contract(s)` : "No contracts"}
                </p>
              </CardContent>
            </Card>

            {/* 8. Contract - Download */}
            <Card className={`border-2 transition-all ${projectContracts.length > 0 ? 'border-orange-300 bg-orange-50/70' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${projectContracts.length > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <FileDown className={`h-4 w-4 ${projectContracts.length > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">8. Contract PDF</span>
                  {projectContracts.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {projectContracts.length > 0 ? "Available" : "Not generated"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contract Details Accordion */}
          {projectContracts.length > 0 && (
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="contracts" className="border rounded-lg bg-white/80">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <FileSignature className="h-5 w-5 text-rose-600" />
                    <span className="font-semibold">Contract Documents ({projectContracts.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {projectContracts.map((contract) => (
                      <div 
                        key={contract.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">{contract.contract_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(contract.created_at)} • {contract.total_amount ? formatCurrency(contract.total_amount) : 'No amount'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getContractStatusBadge(contract.status, contract.client_signature, contract.contractor_signature)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewContractPDF(contract)}
                            disabled={viewingContractId === contract.id}
                            className="gap-1.5"
                          >
                            {viewingContractId === contract.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadContractPDF(contract)}
                            disabled={downloadingContractId === contract.id}
                            className="gap-1.5"
                          >
                            {downloadingContractId === contract.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Operational Truth Notice */}
          <Alert className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <Brain className="h-5 w-5 text-violet-600" />
            <AlertTitle className="text-violet-800 flex items-center gap-2">
              Operational Truth Verification
              <Badge className="bg-violet-100 text-violet-700">Dual AI Engine</Badge>
            </AlertTitle>
            <AlertDescription className="text-violet-700">
              All 8 elements above will be cross-referenced by <strong>OpenAI GPT-5</strong> and <strong>Google Gemini</strong> to detect conflicts, 
              verify data consistency, and establish the operational truth for your project.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Photo Estimate Details */}
      {(photoEstimate || summary.photo_estimate) && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              AI Photo Analysis Results
              {(photoEstimate?.dualEngine?.verified || summary.photo_estimate?.dualEngine?.verified) && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Area & Surface Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Total Area</p>
                <p className="text-xl font-bold text-blue-800">
                  {(photoEstimate?.area || summary.photo_estimate?.area) || "—"} {(photoEstimate?.areaUnit || summary.photo_estimate?.areaUnit) || ""}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 font-medium">Surface Type</p>
                <p className="font-semibold text-slate-800 capitalize">
                  {(photoEstimate?.surfaceType || summary.photo_estimate?.surfaceType) || "Unknown"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 font-medium">Condition</p>
                <p className="font-semibold text-slate-800 capitalize">
                  {(photoEstimate?.surfaceCondition || summary.photo_estimate?.surfaceCondition) || "Unknown"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 font-medium">Confidence</p>
                <Badge className={
                  (photoEstimate?.areaConfidence || summary.photo_estimate?.areaConfidence) === "high" 
                    ? "bg-green-100 text-green-700" 
                    : (photoEstimate?.areaConfidence || summary.photo_estimate?.areaConfidence) === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-700"
                }>
                  {(photoEstimate?.areaConfidence || summary.photo_estimate?.areaConfidence) || "Unknown"}
                </Badge>
              </div>
            </div>

            {/* ===== DUAL ENGINE ANALYSIS - Gemini & OpenAI ===== */}
            <Accordion type="single" collapsible defaultValue="dual-engine">
              <AccordionItem value="dual-engine" className="border rounded-lg bg-gradient-to-r from-violet-50 via-purple-50 to-indigo-50">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-violet-600" />
                    <span className="font-semibold text-violet-800">Dual Engine Analysis</span>
                    <Badge className="bg-violet-100 text-violet-700 text-xs">Gemini + OpenAI</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                    {/* GEMINI Engine */}
                    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-white" />
                          <span className="font-semibold text-white text-sm">Google Gemini</span>
                          <Badge className="bg-white/20 text-white text-xs ml-auto">Visual Specialist</Badge>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">What Gemini Analyzed</p>
                          <ul className="text-sm text-slate-700 space-y-1">
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>Visual area estimation from {(photoEstimate?.imageCount || summary.photo_estimate?.imageCount) || 1} uploaded image(s)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>Surface type & condition detection</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>Spatial measurements & dimensions</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>Blueprint/floor plan text extraction</span>
                            </li>
                          </ul>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Gemini Output</p>
                          <div className="bg-blue-50 rounded-md p-3 text-sm">
                            <p className="text-slate-700">
                              {(photoEstimate?.geminiSummary || summary.photo_estimate?.geminiSummary) || 
                               `Detected ${(photoEstimate?.area || summary.photo_estimate?.area) || "N/A"} sq ft area with ${((photoEstimate?.materials || summary.photo_estimate?.materials)?.length) || 0} materials identified. Surface: ${(photoEstimate?.surfaceType || summary.photo_estimate?.surfaceType) || "standard"}.`}
                            </p>
                          </div>
                        </div>
                        {(photoEstimate?.geminiConfidence || summary.photo_estimate?.geminiConfidence) && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Confidence Score</span>
                            <Badge className="bg-blue-100 text-blue-700">{photoEstimate?.geminiConfidence || summary.photo_estimate?.geminiConfidence}%</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OPENAI Engine */}
                    <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-white" />
                          <span className="font-semibold text-white text-sm">OpenAI GPT-5</span>
                          <Badge className="bg-white/20 text-white text-xs ml-auto">Material Calculator</Badge>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">What OpenAI Verified</p>
                          <ul className="text-sm text-slate-700 space-y-1">
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>Material quantity calculations</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>Industry-standard coverage rates</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>Trade-specific recommendations</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckSquare className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>Waste factor & safety margins</span>
                            </li>
                          </ul>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">OpenAI Output</p>
                          <div className="bg-emerald-50 rounded-md p-3 text-sm">
                            <p className="text-slate-700">
                              {(photoEstimate?.openaiSummary || summary.photo_estimate?.openaiSummary) || 
                               `Calculated ${((photoEstimate?.materials || summary.photo_estimate?.materials)?.length) || 0} materials with 10% waste factor. Project type: ${(photoEstimate?.projectType || summary.photo_estimate?.projectType) || "general construction"}.`}
                            </p>
                          </div>
                        </div>
                        {(photoEstimate?.openaiConfidence || summary.photo_estimate?.openaiConfidence) && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Confidence Score</span>
                            <Badge className="bg-emerald-100 text-emerald-700">{photoEstimate?.openaiConfidence || summary.photo_estimate?.openaiConfidence}%</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="mt-4 p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-violet-600" />
                        <span className="font-medium text-sm text-slate-700">Dual Engine Verification Status</span>
                      </div>
                      {(photoEstimate?.dualEngine?.verified || summary.photo_estimate?.dualEngine?.verified) ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Engines Agree
                        </Badge>
                      ) : (photoEstimate?.dualEngine?.conflict || summary.photo_estimate?.dualEngine?.conflict) ? (
                        <Badge className="bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Could not be verified
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">Pending Analysis</Badge>
                      )}
                    </div>
                    {(photoEstimate?.dualEngine?.discrepancy || summary.photo_estimate?.dualEngine?.discrepancy) && (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {photoEstimate?.dualEngine?.discrepancy || summary.photo_estimate?.dualEngine?.discrepancy}
                      </p>
                    )}
                  </div>

                  {/* ===== ANALYZED FILES & DOCUMENTS ===== */}
                  {(projectDocuments.length > 0 || projectContracts.length > 0) && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <span className="font-medium text-sm text-slate-700">Analyzed Project Files</span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Project Documents */}
                        {projectDocuments.length > 0 && (
                          <div className="bg-white rounded-lg border p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Image className="h-4 w-4 text-blue-500" />
                              <span>Uploaded Files ({projectDocuments.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {projectDocuments.slice(0, 5).map((doc) => {
                                const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name);
                                return (
                                  <div key={doc.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
                                    {isPdf ? (
                                      <File className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                    ) : isImage ? (
                                      <FileImage className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                    )}
                                    <span className="truncate flex-1" title={doc.file_name}>{doc.file_name}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5">
                                      {isPdf ? 'PDF' : isImage ? 'Image' : 'Doc'}
                                    </Badge>
                                  </div>
                                );
                              })}
                              {projectDocuments.length > 5 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  +{projectDocuments.length - 5} more files
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Contracts */}
                        {projectContracts.length > 0 && (
                          <div className="bg-white rounded-lg border p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <FileSignature className="h-4 w-4 text-rose-500" />
                              <span>Contracts ({projectContracts.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {projectContracts.slice(0, 5).map((contract) => (
                                <div key={contract.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileSignature className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                                    <span className="truncate">{contract.contract_number}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[10px] px-1.5 ${
                                        contract.client_signature && contract.contractor_signature 
                                          ? 'bg-green-50 text-green-700 border-green-200' 
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {contract.client_signature && contract.contractor_signature ? 'Signed' : 'Draft'}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleViewContractPDF(contract)}
                                      disabled={viewingContractId === contract.id}
                                    >
                                      {viewingContractId === contract.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Eye className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleDownloadContractPDF(contract)}
                                      disabled={downloadingContractId === contract.id}
                                    >
                                      {downloadingContractId === contract.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Download className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Analysis Note */}
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-md p-2 flex items-start gap-2">
                        <Brain className="h-3.5 w-3.5 mt-0.5 text-violet-500 flex-shrink-0" />
                        <span>
                          Both AI engines analyze uploaded images, PDFs, and blueprints to extract measurements, 
                          verify material quantities, and cross-reference contract terms for Operational Truth verification.
                        </span>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Materials from Photo Estimate */}
            {((photoEstimate?.materials || summary.photo_estimate?.materials)?.length > 0) && (
              <div>
                <h4 className="font-medium text-sm text-slate-700 mb-2">Detected Materials</h4>
                <div className="space-y-2">
                  {(photoEstimate?.materials || summary.photo_estimate?.materials).map((mat: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-medium">{mat.item || mat.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {mat.quantity} {mat.unit}
                        </span>
                        {mat.notes && (
                          <span className="text-xs text-slate-500 max-w-xs truncate" title={mat.notes}>
                            {mat.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary & Recommendations */}
            {(photoEstimate?.summary || summary.photo_estimate?.summary) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-blue-800 mb-2">AI Summary</h4>
                <p className="text-sm text-blue-700">{photoEstimate?.summary || summary.photo_estimate?.summary}</p>
              </div>
            )}

            {((photoEstimate?.recommendations || summary.photo_estimate?.recommendations)?.length > 0) && (
              <div>
                <h4 className="font-medium text-sm text-slate-700 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {(photoEstimate?.recommendations || summary.photo_estimate?.recommendations).map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dual Engine Info */}
            {(photoEstimate?.dualEngine || summary.photo_estimate?.dualEngine) && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm text-slate-700 mb-3">Dual AI Engine Analysis</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {(photoEstimate?.dualEngine?.gemini || summary.photo_estimate?.dualEngine?.gemini) && (
                    <div className="bg-violet-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                        <span className="font-medium text-violet-800">
                          {(photoEstimate?.dualEngine?.gemini?.role || summary.photo_estimate?.dualEngine?.gemini?.role)}
                        </span>
                      </div>
                      <p className="text-xs text-violet-600">
                        Model: {(photoEstimate?.dualEngine?.gemini?.model || summary.photo_estimate?.dualEngine?.gemini?.model)}
                      </p>
                    </div>
                  )}
                  {(photoEstimate?.dualEngine?.gpt || summary.photo_estimate?.dualEngine?.gpt) && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium text-emerald-800">
                          {(photoEstimate?.dualEngine?.gpt?.role || summary.photo_estimate?.dualEngine?.gpt?.role)}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-600">
                        Model: {(photoEstimate?.dualEngine?.gpt?.model || summary.photo_estimate?.dualEngine?.gpt?.model)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
        <ShareSummaryDialog
          summaryId={summary?.id}
          lineItems={editedItems}
          clientInfo={clientInfo}
          totalAmount={grandTotal}
          formatCurrency={formatCurrency}
          photoEstimate={photoEstimate || summary?.photo_estimate}
          calculatorResults={calculatorResults.length > 0 ? calculatorResults : summary?.calculator_results}
          templateItems={templateItems.length > 0 ? templateItems : summary?.template_items}
          contractsCount={projectContracts.length}
          documentsCount={projectDocuments.length}
        >
          <Button variant="outline" className="gap-2">
            <Send className="h-4 w-4" />
            Share Summary
          </Button>
        </ShareSummaryDialog>
        <Button 
          variant="outline" 
          onClick={() => generatePDF(false)} 
          disabled={generatingPDF}
          className="gap-2"
        >
          {generatingPDF ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          PDF Export
        </Button>
        <Button 
          onClick={saveToProjects}
          disabled={saving}
          className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderPlus className="h-4 w-4" />
          )}
          Save to Projects
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
