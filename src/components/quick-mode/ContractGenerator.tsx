import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignatureCapture, { SignatureData } from "@/components/SignatureCapture";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { SaveAndSendContractDialog } from "./SaveAndSendContractDialog";
import { buildContractHTML, generatePDFBlob } from "@/lib/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";
import { useBuProfile } from "@/hooks/useBuProfile";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText,
  Download,
  User,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  Info,
  Briefcase,
  PenLine,
  CheckCircle2,
  Clock,
  Send,
  Home,
  Building,
  Wrench,
  FileCheck,
  Save,
  Loader2,
  ArrowRight
} from "lucide-react";

// Types for collected data from Quick Mode synthesis
interface CollectedData {
  photoEstimate: {
    area?: number;
    areaUnit?: string;
    materials?: Array<{ name: string; quantity: string; unit: string }>;
    confidence?: string;
  } | null;
  calculatorResults: Array<{
    calculatorType?: string;
    area?: number;
    areaUnit?: string;
    materials?: Array<{ name: string; quantity: number; unit: string }>;
    totalCost?: number;
  }>;
  templateItems: Array<{
    name?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>;
}

// Contract template types
type ContractTemplateType = "custom" | "residential" | "commercial" | "renovation";

interface ContractTemplate {
  id: ContractTemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  depositPercentage: number;
  paymentSchedule: string;
  workingDays: string;
  warrantyPeriod: string;
  changeOrderPolicy: string;
  cancellationPolicy: string;
  disputeResolution: string;
  hasLiabilityInsurance: boolean;
  hasWSIB: boolean;
  materialsIncluded: boolean;
  additionalTerms?: string;
}

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "custom",
    name: "Custom Contract",
    description: "Start from scratch with your own terms",
    icon: <FileCheck className="w-5 h-5" />,
    depositPercentage: 50,
    paymentSchedule: "50% deposit upon signing, 50% upon completion",
    workingDays: "Monday to Friday, 8:00 AM - 5:00 PM",
    warrantyPeriod: "1 year",
    changeOrderPolicy: "Any changes to the scope of work must be agreed upon in writing and may result in additional charges.",
    cancellationPolicy: "Either party may cancel this contract with 14 days written notice. The client is responsible for payment of work completed up to the date of cancellation.",
    disputeResolution: "Any disputes arising from this contract shall be resolved through mediation before pursuing legal action.",
    hasLiabilityInsurance: true,
    hasWSIB: true,
    materialsIncluded: true,
  },
  {
    id: "residential",
    name: "Residential",
    description: "Home improvement & residential projects",
    icon: <Home className="w-5 h-5" />,
    depositPercentage: 30,
    paymentSchedule: "30% deposit upon signing, 30% at project midpoint, 40% upon final completion and inspection",
    workingDays: "Monday to Friday, 8:00 AM - 5:00 PM. Weekend work by prior arrangement only.",
    warrantyPeriod: "2 years on workmanship, manufacturer warranties apply to materials",
    changeOrderPolicy: "All changes must be documented in writing with a signed Change Order form. Additional costs will be calculated at current labor and material rates plus 15% overhead. No changes will begin until the Change Order is approved and signed by both parties.",
    cancellationPolicy: "Homeowner may cancel within 10 business days of signing without penalty. After this period, the client is responsible for materials ordered and work completed. Contractor will provide itemized breakdown of costs incurred.",
    disputeResolution: "Both parties agree to attempt resolution through direct communication first. If unresolved within 14 days, disputes will proceed to mediation through a mutually agreed mediator before any legal action.",
    hasLiabilityInsurance: true,
    hasWSIB: true,
    materialsIncluded: true,
    additionalTerms: "• Contractor will maintain a clean work site and protect existing structures\n• Client provides access to water and electricity\n• Permits and inspections are the contractor's responsibility unless otherwise specified\n• Final walkthrough and punch list to be completed before final payment",
  },
  {
    id: "commercial",
    name: "Commercial",
    description: "Business & commercial construction",
    icon: <Building className="w-5 h-5" />,
    depositPercentage: 25,
    paymentSchedule: "25% deposit upon signing, progress payments monthly based on certified work completed, 10% holdback released 45 days after substantial completion",
    workingDays: "As per project schedule. After-hours and weekend work available at premium rates if required to meet deadlines.",
    warrantyPeriod: "1 year on general workmanship, 5 years on structural elements, manufacturer warranties on all equipment and materials",
    changeOrderPolicy: "All changes require a formal Change Order with detailed scope, pricing, and schedule impact. Change Orders must be approved in writing by authorized representatives of both parties. Changes affecting critical path will require schedule adjustment.",
    cancellationPolicy: "Either party may terminate with 30 days written notice. Client is responsible for all work completed, materials ordered, and reasonable demobilization costs. Contractor must provide complete documentation of work to date.",
    disputeResolution: "Disputes shall first be addressed at the project manager level. Unresolved issues will escalate to senior management within 7 days. If still unresolved, parties agree to binding arbitration under commercial arbitration rules.",
    hasLiabilityInsurance: true,
    hasWSIB: true,
    materialsIncluded: true,
    additionalTerms: "• Contractor maintains comprehensive commercial liability insurance ($2M minimum)\n• All work to comply with applicable building codes and regulations\n• Weekly progress reports and monthly schedule updates required\n• Safety plan and WHMIS compliance mandatory\n• Bonding available upon request",
  },
  {
    id: "renovation",
    name: "Renovation",
    description: "Remodeling & renovation projects",
    icon: <Wrench className="w-5 h-5" />,
    depositPercentage: 35,
    paymentSchedule: "35% deposit upon signing (covers demolition and initial materials), 35% at rough-in completion, 30% upon final completion",
    workingDays: "Monday to Friday, 8:00 AM - 5:00 PM. Demolition and loud work limited to 9:00 AM - 4:00 PM where applicable.",
    warrantyPeriod: "2 years on all new work and installations. Pre-existing conditions not covered.",
    changeOrderPolicy: "Renovation projects often uncover hidden conditions. Discovery work will be documented with photos and discussed before proceeding. Additional costs require signed approval. A 10% contingency is recommended for unforeseen conditions.",
    cancellationPolicy: "Client may cancel with 14 days written notice. Due to the nature of renovation work, client is responsible for all demolition performed, materials purchased, and work completed. Space will be left in a safe, secure condition.",
    disputeResolution: "Given the complexity of renovation work, parties agree to document all decisions in writing. Disputes will be addressed through on-site meetings with both parties present. Mediation through a licensed contractor or inspector if needed.",
    hasLiabilityInsurance: true,
    hasWSIB: true,
    materialsIncluded: true,
    additionalTerms: "• Pre-renovation inspection and documentation included\n• Asbestos/lead testing may be required for older structures (additional cost)\n• Client responsible for temporary relocation of furniture and personal items\n• Dust barriers and protection of adjacent areas included\n• Daily cleanup and debris removal included",
  },
];

interface ExistingContract {
  id: string;
  contract_number: string;
  contract_date: string;
  template_type: string;
  contractor_name: string | null;
  contractor_address: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_license: string | null;
  client_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  project_name: string | null;
  project_address: string | null;
  scope_of_work: string | null;
  total_amount: number | null;
  deposit_percentage: number | null;
  deposit_amount: number | null;
  payment_schedule: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  working_days: string | null;
  warranty_period: string | null;
  change_order_policy: string | null;
  cancellation_policy: string | null;
  dispute_resolution: string | null;
  additional_terms: string | null;
  materials_included: boolean | null;
  has_liability_insurance: boolean | null;
  has_wsib: boolean | null;
  client_signature: any | null;
  contractor_signature: any | null;
}

interface ContractProgressUpdate {
  contractorName?: string;
  contractorAddress?: string;
  contractorLicense?: string;
  clientName?: string;
  clientAddress?: string;
  scopeOfWork?: string;
  totalAmount?: number;
  startDate?: string;
  estimatedEndDate?: string;
  contractorSignature?: boolean;
  clientSignature?: boolean;
}

// Project data to pre-fill contract
interface ProjectData {
  name?: string;
  address?: string;
  description?: string;
  totalAmount?: number;
  scopeOfWork?: string;
}

interface ContractGeneratorProps {
  quoteData?: any;
  collectedData?: CollectedData | null;
  existingContract?: ExistingContract | null;
  onContractGenerated?: (contractData: any) => void;
  onProgressUpdate?: (data: ContractProgressUpdate) => void;
  onContinue?: () => void;
  onSaveToProjects?: (projectId: string) => void;
  projectData?: ProjectData;
  initialTemplate?: ContractTemplateType;
  linkedProjectId?: string;
  projectMode?: "solo" | "team";
}

const ContractGenerator = ({ 
  quoteData, 
  collectedData, 
  existingContract, 
  onContractGenerated, 
  onProgressUpdate, 
  onContinue, 
  onSaveToProjects, 
  projectData,
  initialTemplate,
  linkedProjectId,
  projectMode = "solo"
}: ContractGeneratorProps) => {
  const { user } = useAuth();
  const { profile } = useBuProfile();
  const { formatCurrency, config } = useRegionSettings();
  
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateType>(initialTemplate || "custom");
  
  const [contract, setContract] = useState({
    // Contract Info
    contractNumber: `C-${Date.now().toString().slice(-6)}`,
    contractDate: new Date().toISOString().split("T")[0],
    
    // Parties
    contractorName: "",
    contractorAddress: "",
    contractorPhone: "",
    contractorEmail: "",
    contractorLicense: "",
    
    clientName: "",
    clientAddress: "",
    clientPhone: "",
    clientEmail: "",
    
    // Project Details
    projectName: "",
    projectAddress: "",
    projectDescription: "",
    
    // Financial Terms
    totalAmount: 0,
    depositAmount: 0,
    depositPercentage: 50,
    paymentSchedule: "50% deposit upon signing, 50% upon completion",
    
    // Timeline
    startDate: "",
    estimatedEndDate: "",
    workingDays: "Monday to Friday, 8:00 AM - 5:00 PM",
    
    // Terms & Conditions
    scopeOfWork: "",
    materialsIncluded: true,
    warrantyPeriod: "1 year",
    changeOrderPolicy: "Any changes to the scope of work must be agreed upon in writing and may result in additional charges.",
    cancellationPolicy: "Either party may cancel this contract with 14 days written notice. The client is responsible for payment of work completed up to the date of cancellation.",
    disputeResolution: "Any disputes arising from this contract shall be resolved through mediation before pursuing legal action.",
    additionalTerms: "",
    
    // Insurance & Licensing
    hasLiabilityInsurance: true,
    hasWSIB: true,
    licenseNumber: "",
  });

  // Apply template when selected
  const applyTemplate = (templateId: ContractTemplateType) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setContract(prev => ({
      ...prev,
      depositPercentage: template.depositPercentage,
      paymentSchedule: template.paymentSchedule,
      workingDays: template.workingDays,
      warrantyPeriod: template.warrantyPeriod,
      changeOrderPolicy: template.changeOrderPolicy,
      cancellationPolicy: template.cancellationPolicy,
      disputeResolution: template.disputeResolution,
      hasLiabilityInsurance: template.hasLiabilityInsurance,
      hasWSIB: template.hasWSIB,
      materialsIncluded: template.materialsIncluded,
      additionalTerms: template.additionalTerms || "",
    }));

    setSelectedTemplate(templateId);
    toast.success(`${template.name} template applied`);
  };

  const [clientSignature, setClientSignature] = useState<SignatureData | null>(null);
  const [contractorSignature, setContractorSignature] = useState<SignatureData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [pendingAutoSave, setPendingAutoSave] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const previousSignaturesRef = useRef<{client: SignatureData | null, contractor: SignatureData | null}>({client: null, contractor: null});

  // Mark initial load complete after first render to prevent auto-save on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
      previousSignaturesRef.current = {client: clientSignature, contractor: contractorSignature};
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // NOTE: Auto-save on signature change has been DISABLED to prevent premature saves
  // Users must manually click "Save & Continue" to save the contract
  // This ensures the form is fully completed before saving

  // Report progress updates to parent
  useEffect(() => {
    onProgressUpdate?.({
      contractorName: contract.contractorName,
      contractorAddress: contract.contractorAddress,
      contractorLicense: contract.licenseNumber,
      clientName: contract.clientName,
      clientAddress: contract.clientAddress,
      scopeOfWork: contract.scopeOfWork,
      totalAmount: contract.totalAmount,
      startDate: contract.startDate,
      estimatedEndDate: contract.estimatedEndDate,
      contractorSignature: !!contractorSignature,
      clientSignature: !!clientSignature,
    });
  }, [contract, contractorSignature, clientSignature, onProgressUpdate]);
  const [profileData, setProfileData] = useState<{
    companyLogoUrl?: string | null;
    companyName?: string | null;
    companyWebsite?: string | null;
    phone?: string | null;
  } | null>(null);

  // Fetch profile data for branding (logo, etc.)
  useEffect(() => {
    const fetchProfileForBranding = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('bu_profiles')
        .select('company_logo_url, company_name, company_website, phone')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setProfileData({
          companyLogoUrl: data.company_logo_url,
          companyName: data.company_name,
          companyWebsite: data.company_website,
          phone: data.phone
        });
      }
    };
    fetchProfileForBranding();
  }, [user]);

// Load existing contract data for editing
  useEffect(() => {
    if (existingContract) {
      setContract({
        contractNumber: existingContract.contract_number,
        contractDate: existingContract.contract_date,
        contractorName: existingContract.contractor_name || "",
        contractorAddress: existingContract.contractor_address || "",
        contractorPhone: existingContract.contractor_phone || "",
        contractorEmail: existingContract.contractor_email || "",
        contractorLicense: existingContract.contractor_license || "",
        clientName: existingContract.client_name || "",
        clientAddress: existingContract.client_address || "",
        clientPhone: existingContract.client_phone || "",
        clientEmail: existingContract.client_email || "",
        projectName: existingContract.project_name || "",
        projectAddress: existingContract.project_address || "",
        projectDescription: "",
        totalAmount: existingContract.total_amount || 0,
        depositPercentage: existingContract.deposit_percentage || 50,
        depositAmount: existingContract.deposit_amount || 0,
        paymentSchedule: existingContract.payment_schedule || "50% deposit upon signing, 50% upon completion",
        startDate: existingContract.start_date || "",
        estimatedEndDate: existingContract.estimated_end_date || "",
        workingDays: existingContract.working_days || "Monday to Friday, 8:00 AM - 5:00 PM",
        scopeOfWork: existingContract.scope_of_work || "",
        materialsIncluded: existingContract.materials_included ?? true,
        warrantyPeriod: existingContract.warranty_period || "1 year",
        changeOrderPolicy: existingContract.change_order_policy || "",
        cancellationPolicy: existingContract.cancellation_policy || "",
        disputeResolution: existingContract.dispute_resolution || "",
        additionalTerms: existingContract.additional_terms || "",
        hasLiabilityInsurance: existingContract.has_liability_insurance ?? true,
        hasWSIB: existingContract.has_wsib ?? true,
        licenseNumber: existingContract.contractor_license || "",
      });
      setSelectedTemplate((existingContract.template_type as ContractTemplateType) || "custom");
      // Only set savedContractId if it's a valid ID (not empty string for duplicates)
      if (existingContract.id && existingContract.id.trim() !== '') {
        setSavedContractId(existingContract.id);
      }
      
      // Load signatures if they exist
      if (existingContract.client_signature) {
        setClientSignature(existingContract.client_signature);
      }
      if (existingContract.contractor_signature) {
        setContractorSignature(existingContract.contractor_signature);
      }
      return;
    }
    
    // Load profile data for new contracts
    if (profile) {
      setContract(prev => ({
        ...prev,
        contractorName: profile.company_name || "",
        contractorPhone: profile.phone || "",
        contractorEmail: user?.email || "",
      }));
    }
    
    // Pre-fill from quote data if available
    if (quoteData) {
      setContract(prev => ({
        ...prev,
        clientName: quoteData.clientName || "",
        clientAddress: quoteData.clientAddress || "",
        clientPhone: quoteData.clientPhone || "",
        clientEmail: quoteData.clientEmail || "",
        projectName: quoteData.projectName || "",
        projectAddress: quoteData.projectAddress || "",
        totalAmount: quoteData.lineItems?.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.unitPrice), 0) || 0,
      }));
    }
    
    // Pre-fill from project data if available (from project details page)
    if (projectData) {
      setContract(prev => ({
        ...prev,
        projectName: projectData.name || prev.projectName,
        projectAddress: projectData.address || prev.projectAddress,
        projectDescription: projectData.description || prev.projectDescription,
        scopeOfWork: projectData.scopeOfWork || prev.scopeOfWork,
        totalAmount: projectData.totalAmount || prev.totalAmount,
      }));
    }
  }, [existingContract, profile, user, quoteData, projectData]);

  // Apply initial template on mount
  useEffect(() => {
    if (initialTemplate && initialTemplate !== "custom") {
      const template = CONTRACT_TEMPLATES.find(t => t.id === initialTemplate);
      if (template) {
        setContract(prev => ({
          ...prev,
          depositPercentage: template.depositPercentage,
          paymentSchedule: template.paymentSchedule,
          workingDays: template.workingDays,
          warrantyPeriod: template.warrantyPeriod,
          changeOrderPolicy: template.changeOrderPolicy,
          cancellationPolicy: template.cancellationPolicy,
          disputeResolution: template.disputeResolution,
          hasLiabilityInsurance: template.hasLiabilityInsurance,
          hasWSIB: template.hasWSIB,
          materialsIncluded: template.materialsIncluded,
          additionalTerms: template.additionalTerms || "",
        }));
        toast.success(`${template.name} template applied`);
      }
    }
  }, [initialTemplate]);

  // Pre-fill from collected synthesis data (dual-engine results)
  useEffect(() => {
    if (!collectedData) return;

    let scopeDescription = "";
    let totalFromSynthesis = 0;

    // Extract from photo estimate (AI analysis)
    if (collectedData.photoEstimate) {
      const pe = collectedData.photoEstimate;
      if (pe.area && pe.areaUnit) {
        scopeDescription += `Estimated Area: ${pe.area} ${pe.areaUnit}\n`;
      }
      if (pe.materials && pe.materials.length > 0) {
        scopeDescription += "\nMaterials from AI Analysis:\n";
        pe.materials.forEach(m => {
          scopeDescription += `• ${m.name}: ${m.quantity} ${m.unit}\n`;
        });
      }
    }

    // Extract from calculator results
    if (collectedData.calculatorResults && collectedData.calculatorResults.length > 0) {
      collectedData.calculatorResults.forEach((calc, idx) => {
        if (calc.calculatorType) {
          scopeDescription += `\n${calc.calculatorType} Calculation:\n`;
        }
        if (calc.area && calc.areaUnit) {
          scopeDescription += `• Area: ${calc.area} ${calc.areaUnit}\n`;
        }
        if (calc.materials && calc.materials.length > 0) {
          calc.materials.forEach(m => {
            scopeDescription += `• ${m.name}: ${m.quantity} ${m.unit}\n`;
          });
        }
        if (calc.totalCost) {
          totalFromSynthesis += calc.totalCost;
        }
      });
    }

    // Extract from templates
    if (collectedData.templateItems && collectedData.templateItems.length > 0) {
      collectedData.templateItems.forEach(template => {
        if (template.name) {
          scopeDescription += `\nTemplate: ${template.name}\n`;
        }
        if (template.lineItems && template.lineItems.length > 0) {
          template.lineItems.forEach(item => {
            scopeDescription += `• ${item.description}: ${item.quantity} × $${item.unitPrice}\n`;
            totalFromSynthesis += item.quantity * item.unitPrice;
          });
        }
      });
    }

    // Update contract with synthesis data
    if (scopeDescription || totalFromSynthesis > 0) {
      setContract(prev => ({
        ...prev,
        scopeOfWork: scopeDescription.trim() || prev.scopeOfWork,
        totalAmount: totalFromSynthesis > 0 ? totalFromSynthesis : prev.totalAmount,
      }));
    }
  }, [collectedData]);

  // Calculate deposit when total or percentage changes
  useEffect(() => {
    setContract(prev => ({
      ...prev,
      depositAmount: (prev.totalAmount * prev.depositPercentage) / 100
    }));
  }, [contract.totalAmount, contract.depositPercentage]);

  const updateContract = (field: string, value: any) => {
    setContract(prev => ({ ...prev, [field]: value }));
  };

  const saveContractToDatabase = async (): Promise<string | null> => {
    if (!user) {
      toast.error("Please sign in to save contracts");
      return null;
    }

    setIsSaving(true);
    try {
      const contractData = {
        user_id: user.id,
        project_id: linkedProjectId || null,
        contract_number: contract.contractNumber,
        contract_date: contract.contractDate,
        template_type: selectedTemplate,
        status: contractorSignature && clientSignature ? "signed" : contractorSignature ? "pending_client" : "draft",
        
        contractor_name: contract.contractorName,
        contractor_address: contract.contractorAddress,
        contractor_phone: contract.contractorPhone,
        contractor_email: contract.contractorEmail,
        contractor_license: contract.licenseNumber,
        
        client_name: contract.clientName,
        client_address: contract.clientAddress,
        client_phone: contract.clientPhone,
        client_email: contract.clientEmail,
        
        project_name: contract.projectName,
        project_address: contract.projectAddress,
        scope_of_work: contract.scopeOfWork,
        
        total_amount: contract.totalAmount,
        deposit_percentage: contract.depositPercentage,
        deposit_amount: contract.depositAmount,
        payment_schedule: contract.paymentSchedule,
        
        start_date: contract.startDate || null,
        estimated_end_date: contract.estimatedEndDate || null,
        working_days: contract.workingDays,
        
        warranty_period: contract.warrantyPeriod,
        change_order_policy: contract.changeOrderPolicy,
        cancellation_policy: contract.cancellationPolicy,
        dispute_resolution: contract.disputeResolution,
        additional_terms: contract.additionalTerms,
        materials_included: contract.materialsIncluded,
        has_liability_insurance: contract.hasLiabilityInsurance,
        has_wsib: contract.hasWSIB,
        
        client_signature: clientSignature ? JSON.parse(JSON.stringify(clientSignature)) : null,
        contractor_signature: contractorSignature ? JSON.parse(JSON.stringify(contractorSignature)) : null,
        client_signed_at: clientSignature ? (clientSignature.signedAt || new Date().toISOString()) : null,
      };

      let resultId = savedContractId;
      const isAutoSave = pendingAutoSave;
      
      if (savedContractId) {
        // Update existing contract
        const { error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", savedContractId);

        if (error) throw error;
        if (!isAutoSave) {
          toast.success("Contract updated!");
        } else if (clientSignature && contractorSignature) {
          toast.success("✅ Contract signed and saved!");
        }
      } else {
        // Insert new contract
        const { data, error } = await supabase
          .from("contracts")
          .insert(contractData)
          .select("id")
          .single();

        if (error) throw error;
        setSavedContractId(data.id);
        resultId = data.id;
        if (!isAutoSave) {
          toast.success("Contract saved!");
        } else if (clientSignature || contractorSignature) {
          toast.success("✅ Signature saved!");
        }
      }
      
      // Notify parent to refresh contracts list (syncs Operational Truth)
      onContractGenerated?.({
        id: resultId,
        contract_number: contract.contractNumber,
        total_amount: contract.totalAmount,
        status: contractorSignature && clientSignature ? 'signed' : contractorSignature ? 'pending_client' : 'draft',
        contractor_signature: contractorSignature,
        client_signature: clientSignature,
        start_date: contract.startDate,
        estimated_end_date: contract.estimatedEndDate,
      });
      
      return resultId;
    } catch (error) {
      console.error("Error saving contract:", error);
      toast.error("Failed to save contract");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Save contract and send to team members + upload to project documents + email to client
  const saveAndSendContract = async (selectedMemberIds: string[]) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setIsSaving(true);
    try {
      // Generate share token for client viewing
      const shareToken = crypto.randomUUID();
      
      // First save the contract with share token
      const contractData = {
        user_id: user.id,
        project_id: linkedProjectId || null,
        contract_number: contract.contractNumber,
        contract_date: contract.contractDate,
        template_type: selectedTemplate,
        status: "sent",
        share_token: shareToken,
        sent_to_client_at: new Date().toISOString(),
        
        contractor_name: contract.contractorName,
        contractor_address: contract.contractorAddress,
        contractor_phone: contract.contractorPhone,
        contractor_email: contract.contractorEmail,
        contractor_license: contract.licenseNumber,
        
        client_name: contract.clientName,
        client_address: contract.clientAddress,
        client_phone: contract.clientPhone,
        client_email: contract.clientEmail,
        
        project_name: contract.projectName,
        project_address: contract.projectAddress,
        scope_of_work: contract.scopeOfWork,
        
        total_amount: contract.totalAmount,
        deposit_percentage: contract.depositPercentage,
        deposit_amount: contract.depositAmount,
        payment_schedule: contract.paymentSchedule,
        
        start_date: contract.startDate || null,
        estimated_end_date: contract.estimatedEndDate || null,
        working_days: contract.workingDays,
        
        warranty_period: contract.warrantyPeriod,
        change_order_policy: contract.changeOrderPolicy,
        cancellation_policy: contract.cancellationPolicy,
        dispute_resolution: contract.disputeResolution,
        additional_terms: contract.additionalTerms,
        materials_included: contract.materialsIncluded,
        has_liability_insurance: contract.hasLiabilityInsurance,
        has_wsib: contract.hasWSIB,
        
        client_signature: clientSignature ? JSON.parse(JSON.stringify(clientSignature)) : null,
        contractor_signature: contractorSignature ? JSON.parse(JSON.stringify(contractorSignature)) : null,
        client_signed_at: clientSignature ? (clientSignature.signedAt || new Date().toISOString()) : null,
      };

      let contractId = savedContractId;
      
      if (savedContractId) {
        const { error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", savedContractId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("contracts")
          .insert(contractData)
          .select("id")
          .single();
        if (error) throw error;
        contractId = data.id;
        setSavedContractId(data.id);
      }

      if (!contractId) {
        throw new Error("Failed to save contract");
      }

      // If we have a linked project, upload contract PDF to project documents
      if (linkedProjectId) {
        const htmlContent = buildContractHTML({
          contractNumber: contract.contractNumber,
          contractDate: contract.contractDate,
          templateType: selectedTemplate,
          contractorInfo: {
            name: contract.contractorName,
            address: contract.contractorAddress,
            phone: contract.contractorPhone,
            email: contract.contractorEmail,
            license: contract.licenseNumber || undefined,
          },
          clientInfo: {
            name: contract.clientName,
            address: contract.clientAddress,
            phone: contract.clientPhone,
            email: contract.clientEmail,
          },
          projectInfo: {
            name: contract.projectName,
            address: contract.projectAddress,
            description: contract.scopeOfWork || undefined,
          },
          financialTerms: {
            totalAmount: contract.totalAmount,
            depositPercentage: contract.depositPercentage,
            depositAmount: contract.depositAmount,
            paymentSchedule: contract.paymentSchedule,
          },
          timeline: {
            startDate: contract.startDate,
            estimatedEndDate: contract.estimatedEndDate,
            workingDays: contract.workingDays,
          },
          terms: {
            scopeOfWork: contract.scopeOfWork,
            warrantyPeriod: contract.warrantyPeriod,
            materialsIncluded: contract.materialsIncluded,
            changeOrderPolicy: contract.changeOrderPolicy,
            cancellationPolicy: contract.cancellationPolicy,
            disputeResolution: contract.disputeResolution,
            additionalTerms: contract.additionalTerms || undefined,
            hasLiabilityInsurance: contract.hasLiabilityInsurance,
            hasWSIB: contract.hasWSIB,
          },
          signatures: {
            client: clientSignature,
            contractor: contractorSignature,
          },
          branding: profileData ? {
            companyLogoUrl: profileData.companyLogoUrl || undefined,
            companyName: profileData.companyName || undefined,
          } : undefined,
          formatCurrency,
        });

        const pdfBlob = await generatePDFBlob(htmlContent, {
          filename: `Contract-${contract.contractNumber}.pdf`,
        });

        const fileName = `contract-${contract.contractNumber}-${Date.now()}.pdf`;
        const filePath = `${linkedProjectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (!uploadError) {
          await supabase
            .from("project_documents")
            .insert({
              project_id: linkedProjectId,
              file_name: `Contract #${contract.contractNumber}.pdf`,
              file_path: filePath,
              file_size: pdfBlob.size,
            });
        }
      }

      // Send email to client if email is provided
      if (contract.clientEmail) {
        const contractUrl = `${window.location.origin}/contract/view/${shareToken}`;
        
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-contract-email', {
            body: {
              clientEmail: contract.clientEmail,
              clientName: contract.clientName || 'Client',
              contractorName: contract.contractorName || 'Your Contractor',
              projectName: contract.projectName || 'Your Project',
              contractUrl,
              totalAmount: contract.totalAmount,
            },
          });

          if (emailError) {
            console.error("Email sending error:", emailError);
            toast.warning("Contract saved but email failed to send");
          } else {
            console.log("Contract email sent:", emailResult);
          }
        } catch (emailErr) {
          console.error("Email error:", emailErr);
          toast.warning("Contract saved but email failed to send");
        }
      }

      // Send notifications to selected team members
      if (selectedMemberIds.length > 0) {
        const messagePromises = selectedMemberIds.map(async (memberId) => {
          await supabase
            .from("team_messages")
            .insert({
              sender_id: user.id,
              recipient_id: memberId,
              message: `📄 New contract shared: Contract #${contract.contractNumber} for ${contract.projectName || "project"}. Total: ${formatCurrency(contract.totalAmount)}.`,
            });
        });

        await Promise.all(messagePromises);
      }

      // Success message
      const emailSent = contract.clientEmail ? " and email sent to client" : "";
      const teamNotified = selectedMemberIds.length > 0 ? ` + ${selectedMemberIds.length} team member(s) notified` : "";
      toast.success(`Contract saved${emailSent}${teamNotified}`);

      setIsSendDialogOpen(false);
      onContractGenerated?.({
        id: contractId,
        contract_number: contract.contractNumber,
        total_amount: contract.totalAmount,
        status: 'sent',
      });
    } catch (error: any) {
      console.error("Error in save and send:", error);
      toast.error(error.message || "Failed to save and send contract");
    } finally {
      setIsSaving(false);
    }
  };

  const generateContractPDF = () => {
    setIsGenerating(true);
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate PDF");
      setIsGenerating(false);
      return;
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "_______________";
      return new Date(dateStr).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Construction Contract - ${contract.contractNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            color: #1a1a1a; 
            line-height: 1.6;
            font-size: 11px;
          }
          .header-bar {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 24px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-bar h1 { font-size: 20px; font-weight: 700; margin: 0; }
          .header-bar p { font-size: 12px; opacity: 0.9; margin: 2px 0; }
          .contract-badge {
            background: rgba(255,255,255,0.15);
            padding: 12px 20px;
            border-radius: 8px;
            text-align: center;
          }
          .contract-badge .number { font-size: 18px; font-weight: 700; }
          .contract-badge .label { font-size: 10px; opacity: 0.8; text-transform: uppercase; }
          .content { padding: 24px 40px; }
          .section { margin-bottom: 24px; }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 8px;
            margin-bottom: 16px;
          }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          .party-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
          }
          .party-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .party-name { font-size: 16px; font-weight: 600; color: #1e293b; }
          .party-detail { font-size: 11px; color: #64748b; margin-top: 4px; }
          .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .terms-list { padding-left: 20px; }
          .terms-list li { margin-bottom: 8px; }
          .signature-section {
            margin-top: 48px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sig-box {
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fafafa;
          }
          .sig-line { border-top: 2px solid #1e293b; margin-top: 8px; padding-top: 8px; }
          .info-banner {
            background: #eff6ff;
            border: 1px solid #93c5fd;
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          }
          .info-banner h4 { color: #1e40af; font-size: 12px; margin-bottom: 8px; }
          .info-banner p { color: #1e40af; font-size: 11px; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <!-- Branded Header -->
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 16px;">
            ${profileData?.companyLogoUrl ? `
              <img src="${profileData.companyLogoUrl}" alt="Company Logo" style="height: 60px; width: auto; border-radius: 8px; background: white; padding: 4px;" />
            ` : ''}
            <div>
              <h1>${contract.contractorName || profileData?.companyName || "Your Company Name"}</h1>
              <p>${contract.contractorAddress || "Address"}</p>
              <p style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                ${contract.contractorPhone || profileData?.phone ? `<span>📞 ${contract.contractorPhone || profileData?.phone}</span>` : ''}
                ${contract.contractorEmail || user?.email ? `<span>✉️ ${contract.contractorEmail || user?.email}</span>` : ''}
                ${profileData?.companyWebsite ? `<span>🌐 ${profileData.companyWebsite}</span>` : ''}
              </p>
            </div>
          </div>
          <div class="contract-badge">
            <div class="label">Contract</div>
            <div class="number">${contract.contractNumber}</div>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">${formatDate(contract.contractDate)}</div>
          </div>
        </div>

        <div class="content">
          <!-- Parties Section -->
          <div class="section">
            <div class="section-title">👥 PARTIES TO THIS AGREEMENT</div>
            <div class="grid-2">
              <div class="party-box">
                <div class="party-label">🔨 Contractor</div>
                <div class="party-name">${contract.contractorName || "_______________"}</div>
                <div class="party-detail">${contract.contractorAddress || "Address: _______________"}</div>
                <div class="party-detail">📞 ${contract.contractorPhone || "_______________"}</div>
                <div class="party-detail">✉️ ${contract.contractorEmail || "_______________"}</div>
                ${contract.licenseNumber ? `<div class="party-detail">License #: ${contract.licenseNumber}</div>` : ''}
              </div>
              <div class="party-box">
                <div class="party-label">👤 Client</div>
                <div class="party-name">${contract.clientName || "_______________"}</div>
                <div class="party-detail">${contract.clientAddress || "Address: _______________"}</div>
                <div class="party-detail">📞 ${contract.clientPhone || "_______________"}</div>
                <div class="party-detail">✉️ ${contract.clientEmail || "_______________"}</div>
              </div>
            </div>
          </div>

          <!-- Project Details -->
          <div class="section">
            <div class="section-title">📍 PROJECT DETAILS</div>
            <p><strong>Project Name:</strong> ${contract.projectName || "_______________"}</p>
            <p><strong>Project Location:</strong> ${contract.projectAddress || "_______________"}</p>
            ${contract.projectDescription ? `<p style="margin-top: 8px;"><strong>Description:</strong> ${contract.projectDescription}</p>` : ''}
          </div>

          <!-- Scope of Work -->
          ${contract.scopeOfWork ? `
          <div class="section">
            <div class="section-title">📋 SCOPE OF WORK</div>
            <p style="white-space: pre-line;">${contract.scopeOfWork}</p>
          </div>
          ` : ''}

          <!-- Financial Terms -->
          <div class="section">
            <div class="section-title">💰 FINANCIAL TERMS</div>
            <div class="highlight-box">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Total Contract Amount:</span>
                <strong style="font-size: 18px; color: #92400e;">${formatCurrency(contract.totalAmount)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Deposit Required (${contract.depositPercentage}%):</span>
                <strong>${formatCurrency(contract.depositAmount)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Balance Due Upon Completion:</span>
                <strong>${formatCurrency(contract.totalAmount - contract.depositAmount)}</strong>
              </div>
            </div>
            <p><strong>Payment Schedule:</strong> ${contract.paymentSchedule}</p>
          </div>

          <!-- Timeline -->
          <div class="section">
            <div class="section-title">📅 PROJECT TIMELINE</div>
            <div class="grid-2">
              <p><strong>Start Date:</strong> ${formatDate(contract.startDate)}</p>
              <p><strong>Estimated Completion:</strong> ${formatDate(contract.estimatedEndDate)}</p>
            </div>
            <p style="margin-top: 8px;"><strong>Working Hours:</strong> ${contract.workingDays}</p>
          </div>

          <!-- Terms & Conditions -->
          <div class="section">
            <div class="section-title">📜 TERMS & CONDITIONS</div>
            <ol class="terms-list">
              <li><strong>Warranty:</strong> The Contractor warrants all workmanship for a period of ${contract.warrantyPeriod} from the date of completion.</li>
              <li><strong>Materials:</strong> ${contract.materialsIncluded ? 'All materials are included in the contract price unless otherwise specified.' : 'Materials are NOT included and will be billed separately.'}</li>
              <li><strong>Change Orders:</strong> ${contract.changeOrderPolicy}</li>
              <li><strong>Cancellation:</strong> ${contract.cancellationPolicy}</li>
              <li><strong>Dispute Resolution:</strong> ${contract.disputeResolution}</li>
              ${contract.hasLiabilityInsurance ? '<li><strong>Insurance:</strong> Contractor maintains comprehensive general liability insurance.</li>' : ''}
              ${contract.hasWSIB ? '<li><strong>WSIB:</strong> Contractor maintains valid WSIB coverage for all workers.</li>' : ''}
            </ol>
          </div>

          ${contract.additionalTerms ? `
          <!-- Additional Terms -->
          <div class="section">
            <div class="section-title">📋 ADDITIONAL TERMS & CONDITIONS</div>
            <p style="white-space: pre-line;">${contract.additionalTerms}</p>
          </div>
          ` : ''}

          <!-- Digital Signature Notice -->
          <div class="info-banner">
            <h4>ℹ️ ABOUT DIGITAL SIGNATURES</h4>
            <p>
              <strong>How this works:</strong> This contract uses digital signatures which are legally binding under Canadian law (PIPEDA and provincial e-commerce legislation).
            </p>
            <ul style="margin-top: 8px; padding-left: 20px; font-size: 11px; color: #1e40af;">
              <li><strong>Contractor signs first</strong> - The contractor creates and signs the contract</li>
              <li><strong>Client reviews & signs</strong> - The contract is shared with the client (via PDF, email, or in-person) who then signs their portion</li>
              <li><strong>Both signatures + dates</strong> - Each signature is timestamped to show when it was captured</li>
              <li><strong>Keep copies</strong> - Both parties should retain a signed copy for their records</li>
            </ul>
          </div>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="sig-box">
              <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">👤 CLIENT ACCEPTANCE</p>
              <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">By signing below, the Client agrees to all terms and conditions outlined in this contract.</p>
              ${clientSignature 
                ? clientSignature.type === 'drawn'
                  ? '<img src="' + clientSignature.data + '" alt="Client Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                  : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + clientSignature.data + '</p>'
                : '<div style="height: 50px; border-bottom: 2px solid #1e293b; margin: 8px 0;"></div>'}
              <div class="sig-line">
                <p style="font-size: 11px; color: #64748b;">
                  <strong>Print Name:</strong> ${contract.clientName || "_______________"}<br/>
                  <strong>Date:</strong> ${clientSignature?.signedAt ? new Date(clientSignature.signedAt).toLocaleDateString('en-CA') : "_______________"}
                </p>
              </div>
            </div>
            <div class="sig-box">
              <p style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">🔨 CONTRACTOR AUTHORIZATION</p>
              <p style="font-size: 10px; color: #64748b; margin-bottom: 12px;">By signing below, the Contractor agrees to perform all work as specified in this contract.</p>
              ${contractorSignature 
                ? contractorSignature.type === 'drawn'
                  ? '<img src="' + contractorSignature.data + '" alt="Contractor Signature" style="max-height: 60px; margin: 8px 0; display: block;" />'
                  : '<p style="font-family: \'Dancing Script\', cursive; font-size: 28px; margin: 8px 0; color: #1e293b;">' + contractorSignature.data + '</p>'
                : '<div style="height: 50px; border-bottom: 2px solid #1e293b; margin: 8px 0;"></div>'}
              <div class="sig-line">
                <p style="font-size: 11px; color: #64748b;">
                  <strong>Print Name:</strong> ${contract.contractorName || "_______________"}<br/>
                  <strong>Date:</strong> ${contractorSignature?.signedAt ? new Date(contractorSignature.signedAt).toLocaleDateString('en-CA') : "_______________"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Branded Footer -->
        <div style="margin-top: 48px; padding: 24px 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 16px;">
            ${profileData?.companyLogoUrl ? `
              <img src="${profileData.companyLogoUrl}" alt="Logo" style="height: 40px; width: auto; border-radius: 6px; background: white; padding: 3px;" />
            ` : ''}
            <div>
              <p style="font-weight: 600; font-size: 14px; margin: 0;">${contract.contractorName || profileData?.companyName || 'Your Company'}</p>
              <p style="font-size: 11px; opacity: 0.8; margin: 0;">Licensed & Insured • WSIB Covered</p>
            </div>
          </div>
          <div style="text-align: right; font-size: 12px;">
            <p style="margin: 0; display: flex; gap: 16px; justify-content: flex-end; flex-wrap: wrap;">
              ${contract.contractorPhone || profileData?.phone ? `<span>📞 ${contract.contractorPhone || profileData?.phone}</span>` : ''}
              ${contract.contractorEmail || user?.email ? `<span>✉️ ${contract.contractorEmail || user?.email}</span>` : ''}
            </p>
            ${profileData?.companyWebsite ? `<p style="margin: 4px 0 0 0; opacity: 0.8;">🌐 ${profileData.companyWebsite}</p>` : ''}
            <p style="margin: 8px 0 0 0; font-size: 10px; opacity: 0.6;">Governed by the laws of ${config.name}, Canada</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setIsGenerating(false);
      toast.success("Contract generated!");
      
      if (onContractGenerated) {
        onContractGenerated({
          ...contract,
          clientSignature,
          contractorSignature
        });
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Contract Template Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="w-5 h-5 text-amber-500" />
            Contract Template
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a template to pre-fill terms and conditions for your project type
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CONTRACT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  selectedTemplate === template.id
                    ? "border-amber-500 bg-amber-50"
                    : "border-border hover:border-amber-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={selectedTemplate === template.id ? "text-amber-600" : "text-muted-foreground"}>
                    {template.icon}
                  </span>
                  <span className="font-semibold">{template.name}</span>
                  {selectedTemplate === template.id && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </button>
            ))}
          </div>
          
          {selectedTemplate !== "custom" && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <strong>{CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}</strong> template applied. 
                Terms, warranty, and policies have been pre-filled. You can still edit any field below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Digital Signature Info Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800">How does the digital contract work?</AlertTitle>
        <AlertDescription className="text-blue-700 mt-2 space-y-2">
          <p><strong>1. Contractor creates and signs</strong> - You fill out the contract and sign the contractor section</p>
          <p><strong>2. Share with client</strong> - Send as PDF via email, or show them in person</p>
          <p><strong>3. Client signs</strong> - The client can:</p>
          <ul className="list-disc list-inside ml-4 text-sm">
            <li>Sign in person on your device (phone/tablet)</li>
            <li>Print, sign, and return the document</li>
            <li>Digitally sign and return the PDF</li>
          </ul>
          <p><strong>4. Both signatures are timestamped</strong> - Every signature automatically receives a date/time stamp for legal record-keeping</p>
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" defaultValue={["parties", "project", "financial", "signatures"]} className="space-y-4">
                {/* Parties */}
                <AccordionItem value="parties">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Parties
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-6">
                    {/* Contractor Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Contractor (You)
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company / Contractor Name</Label>
                          <Input
                            value={contract.contractorName}
                            onChange={(e) => updateContract("contractorName", e.target.value)}
                            placeholder="Company name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input
                            value={contract.contractorAddress}
                            onChange={(e) => updateContract("contractorAddress", e.target.value)}
                            placeholder="Business address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={contract.contractorPhone}
                            onChange={(e) => updateContract("contractorPhone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={contract.contractorEmail}
                            onChange={(e) => updateContract("contractorEmail", e.target.value)}
                            placeholder="Email address"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Client Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Client / Customer
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={contract.clientName}
                            onChange={(e) => updateContract("clientName", e.target.value)}
                            placeholder="Client name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <AddressAutocomplete
                            value={contract.clientAddress}
                            onChange={(value) => updateContract("clientAddress", value)}
                            placeholder="Client address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={contract.clientPhone}
                            onChange={(e) => updateContract("clientPhone", e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={contract.clientEmail}
                            onChange={(e) => updateContract("clientEmail", e.target.value)}
                            placeholder="Email address"
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Project */}
                <AccordionItem value="project">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-green-500" />
                      Project Details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input
                          value={contract.projectName}
                          onChange={(e) => updateContract("projectName", e.target.value)}
                          placeholder="e.g., Bathroom Renovation"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project Address</Label>
                        <AddressAutocomplete
                          value={contract.projectAddress}
                          onChange={(value) => updateContract("projectAddress", value)}
                          placeholder="Work site location"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Scope of Work</Label>
                      <Textarea
                        value={contract.scopeOfWork}
                        onChange={(e) => updateContract("scopeOfWork", e.target.value)}
                        placeholder="Detailed description of the work to be performed..."
                        rows={6}
                      />
                      {collectedData && (collectedData.photoEstimate || collectedData.calculatorResults.length > 0) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Pre-filled from Quick Mode synthesis data
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Financial */}
                <AccordionItem value="financial">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      Financial Terms
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Total Amount ($)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter amount"
                          value={contract.totalAmount === 0 ? "" : contract.totalAmount}
                          onChange={(e) => updateContract("totalAmount", parseFloat(e.target.value) || 0)}
                          className="[appearance:textfield]"
                        />
                        {collectedData && (collectedData.calculatorResults.length > 0 || collectedData.templateItems.length > 0) && contract.totalAmount > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            Calculated from synthesis data
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Deposit (%)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={contract.depositPercentage}
                          onChange={(e) => updateContract("depositPercentage", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span>Deposit ({contract.depositPercentage}%):</span>
                        <strong>{formatCurrency(contract.depositAmount)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance Due:</span>
                        <strong>{formatCurrency(contract.totalAmount - contract.depositAmount)}</strong>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Schedule</Label>
                      <Textarea
                        value={contract.paymentSchedule}
                        onChange={(e) => updateContract("paymentSchedule", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Timeline */}
                <AccordionItem value="timeline">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      Timeline
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={contract.startDate}
                          onChange={(e) => updateContract("startDate", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Completion</Label>
                        <Input
                          type="date"
                          value={contract.estimatedEndDate}
                          onChange={(e) => updateContract("estimatedEndDate", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Quick Duration Buttons */}
                    {contract.startDate && !contract.estimatedEndDate && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-lg">
                        <span className="text-sm text-muted-foreground mb-2 block">Quick set duration:</span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: '1 Week', days: 7 },
                            { label: '2 Weeks', days: 14 },
                            { label: '1 Month', days: 30 },
                            { label: '2 Months', days: 60 },
                            { label: '3 Months', days: 90 },
                          ].map((option) => (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => {
                                const start = new Date(contract.startDate);
                                start.setDate(start.getDate() + option.days);
                                updateContract("estimatedEndDate", start.toISOString().split('T')[0]);
                              }}
                              className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Working Days / Hours</Label>
                      <Input
                        value={contract.workingDays}
                        onChange={(e) => updateContract("workingDays", e.target.value)}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Terms */}
                <AccordionItem value="terms">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-500" />
                      Terms & Warranty
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Warranty Period</Label>
                      <Input
                        value={contract.warrantyPeriod}
                        onChange={(e) => updateContract("warrantyPeriod", e.target.value)}
                        placeholder="e.g., 1 year"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Change Order Policy</Label>
                      <Textarea
                        value={contract.changeOrderPolicy}
                        onChange={(e) => updateContract("changeOrderPolicy", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cancellation Policy</Label>
                      <Textarea
                        value={contract.cancellationPolicy}
                        onChange={(e) => updateContract("cancellationPolicy", e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <Label>Additional Terms</Label>
                      <Textarea
                        value={contract.additionalTerms}
                        onChange={(e) => updateContract("additionalTerms", e.target.value)}
                        placeholder="Project-specific terms, special conditions, or notes..."
                        rows={4}
                      />
                      {selectedTemplate !== "custom" && contract.additionalTerms && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Pre-filled from {CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate)?.name} template
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Signatures */}
                <AccordionItem value="signatures">
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-rose-500" />
                      Digital Signatures
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {/* Signature workflow explanation */}
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Signature Workflow
                      </h4>
                      <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                        <li><strong>Contractor:</strong> Sign your section first (on the right)</li>
                        <li><strong>Generate PDF:</strong> Click "Generate Contract PDF"</li>
                        <li><strong>Share:</strong> Send to client via email, or show in person</li>
                        <li><strong>Client signs:</strong> They can sign:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>In person on your device</li>
                            <li>Print and return signed copy</li>
                          </ul>
                        </li>
                      </ol>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Badge className="mb-3 bg-blue-100 text-blue-800">Client</Badge>
                        <SignatureCapture
                          label="Client Signature"
                          placeholder="Client's full name"
                          onSignatureChange={setClientSignature}
                          initialSignature={clientSignature}
                        />
                      </div>
                      <div>
                        <Badge className="mb-3 bg-amber-100 text-amber-800">Contractor</Badge>
                        <SignatureCapture
                          label="Contractor Signature"
                          placeholder="Your name"
                          onSignatureChange={setContractorSignature}
                          initialSignature={contractorSignature}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Contract Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contract Number */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Contract Number</p>
                <p className="text-xl font-bold">#{contract.contractNumber}</p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {contractorSignature && (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Contractor Signed
                  </Badge>
                )}
                {clientSignature && (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Client Signed
                  </Badge>
                )}
                {!contractorSignature && !clientSignature && (
                  <Badge className="bg-amber-100 text-amber-800 gap-1">
                    <Clock className="w-3 h-3" />
                    Awaiting Signatures
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Amount Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(contract.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit ({contract.depositPercentage}%)</span>
                  <span>{formatCurrency(contract.depositAmount)}</span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Save & Send - only when linked to project */}
                {linkedProjectId ? (
                  <Button
                    onClick={() => setIsSendDialogOpen(true)}
                    disabled={isSaving}
                    className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Save & Send Contract
                  </Button>
                ) : (
                  <Button
                    onClick={saveContractToDatabase}
                    disabled={isSaving}
                    variant="outline"
                    className="w-full"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {savedContractId ? "Update Contract" : "Save Contract"}
                  </Button>
                )}

                <Button
                  onClick={generateContractPDF}
                  disabled={isGenerating}
                  className="w-full bg-slate-800 hover:bg-slate-900"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate Contract PDF"}
                </Button>
              </div>

              {savedContractId && (
                <p className="text-xs text-center text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Contract saved to history
                </p>
              )}

              {/* Save to Projects Button - Always visible */}
              {onSaveToProjects && (
                <Button
                  onClick={async () => {
                    try {
                      // Save contract first if not already saved
                      let contractId = savedContractId;
                      if (!contractId) {
                        contractId = await saveContractToDatabase();
                        if (!contractId) {
                          toast.error("Please save the contract first");
                          return;
                        }
                      }

                      // Create project if needed and navigate
                      const projectName = contract.projectName.trim() || contract.clientName.trim() || `Contract ${contract.contractNumber}`;
                      
                      // Create project
                      const { data: project, error: projectError } = await supabase
                        .from('projects')
                        .insert({
                          user_id: user?.id,
                          name: projectName,
                          address: contract.projectAddress || contract.clientAddress,
                          description: contract.scopeOfWork?.substring(0, 500) || "Created from Quick Mode contract",
                          status: 'active',
                        })
                        .select()
                        .single();

                      if (projectError) throw projectError;

                      // Update contract with project_id
                      await supabase
                        .from('contracts')
                        .update({ project_id: project.id })
                        .eq('id', contractId);

                      // Create project summary
                      await supabase
                        .from('project_summaries')
                        .insert({
                          user_id: user?.id,
                          project_id: project.id,
                          mode: 'solo',
                          status: 'active',
                          client_name: contract.clientName,
                          client_email: contract.clientEmail,
                          client_phone: contract.clientPhone,
                          client_address: contract.clientAddress,
                          total_cost: contract.totalAmount,
                          photo_estimate: collectedData?.photoEstimate || null,
                          calculator_results: collectedData?.calculatorResults || null,
                          template_items: collectedData?.templateItems || null,
                        });

                      toast.success("Project saved successfully!");
                      onSaveToProjects(project.id);
                    } catch (error: any) {
                      console.error("Error saving project:", error);
                      toast.error(error.message || "Failed to save project");
                    }
                  }}
                  disabled={isSaving}
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Projects
                    </>
                  )}
                </Button>
              )}

              <Separator />

              {/* Tips */}
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="flex items-start gap-2">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Tip: Sign first, then share with your client</span>
                </p>
                <p className="flex items-start gap-2">
                  <Send className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Save the contract and send PDF via email</span>
                </p>
              </div>

              {/* Continue Button - Save and Continue */}
              {onContinue && (
                <div className="pt-4 border-t border-slate-200">
                  <Button
                    onClick={async () => {
                      // Save contract first if not already saved
                      if (!savedContractId) {
                        await saveContractToDatabase();
                      }
                      // Notify parent about the contract
                      onContractGenerated?.({
                        id: savedContractId,
                        contract_number: contract.contractNumber,
                        total_amount: contract.totalAmount,
                        status: contractorSignature && clientSignature ? 'signed' : contractorSignature ? 'pending_client' : 'draft',
                        contractor_signature: contractorSignature,
                        client_signature: clientSignature,
                        start_date: contract.startDate,
                        estimated_end_date: contract.estimatedEndDate,
                      });
                      // Navigate to AI
                      onContinue();
                    }}
                    disabled={isSaving}
                    className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save & Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save & Send Dialog */}
      {linkedProjectId && (
        <SaveAndSendContractDialog
          open={isSendDialogOpen}
          onOpenChange={setIsSendDialogOpen}
          projectId={linkedProjectId}
          contractNumber={contract.contractNumber}
          onSaveAndSend={saveAndSendContract}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default ContractGenerator;
