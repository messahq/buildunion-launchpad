import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { useBuProfile } from "@/hooks/useBuProfile";
import { toast } from "sonner";
import { downloadPDF, buildContractHTML } from "@/lib/pdfGenerator";
import {
  FileText,
  Calendar,
  DollarSign,
  Trash2,
  Clock,
  CheckCircle2,
  User,
  Building2,
  Loader2,
  Plus,
  Home,
  Building,
  Wrench,
  FileCheck,
  ArrowLeft,
  Pencil,
  Download,
  Copy,
  ArrowRight,
  Brain
} from "lucide-react";
import ContractGenerator from "@/components/quick-mode/ContractGenerator";

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  template_type: string;
  status: string;
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
  created_at: string;
}

interface ContractHistoryProps {
  projectId?: string;
  showTitle?: boolean;
  onNavigateToAI?: () => void;
}

type ContractTemplateType = "custom" | "residential" | "commercial" | "renovation";

const CONTRACT_TEMPLATES = [
  {
    id: "custom" as ContractTemplateType,
    name: "Custom Contract",
    description: "Start from scratch with your own terms",
    icon: <FileCheck className="w-6 h-6" />,
  },
  {
    id: "residential" as ContractTemplateType,
    name: "Residential",
    description: "Home improvement & residential projects",
    icon: <Home className="w-6 h-6" />,
  },
  {
    id: "commercial" as ContractTemplateType,
    name: "Commercial",
    description: "Business & commercial construction",
    icon: <Building className="w-6 h-6" />,
  },
  {
    id: "renovation" as ContractTemplateType,
    name: "Renovation",
    description: "Remodeling & renovation projects",
    icon: <Wrench className="w-6 h-6" />,
  },
];

const ContractHistory = ({ projectId, showTitle = true, onNavigateToAI }: ContractHistoryProps) => {
  const { user } = useAuth();
  const { formatCurrency, config } = useRegionSettings();
  const { profile } = useBuProfile();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateType | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [duplicatingContract, setDuplicatingContract] = useState<Contract | null>(null);

const fetchContracts = async () => {
    if (!user) return;

    try {
      let query = (supabase
        .from("contracts" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })) as any;

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [user, projectId]);

const handleDelete = async (contractId: string) => {
    setDeletingId(contractId);
    try {
      const { error } = await (supabase
        .from("contracts" as any)
        .delete()
        .eq("id", contractId)) as any;

      if (error) throw error;

      setContracts(prev => prev.filter(c => c.id !== contractId));
      toast.success("Contract deleted");
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (contract: Contract) => {
    const hasBothSignatures = contract.client_signature && contract.contractor_signature;
    const hasContractorSignature = contract.contractor_signature;

    if (hasBothSignatures) {
      return <Badge className="bg-green-100 text-green-800">Signed</Badge>;
    } else if (hasContractorSignature) {
      return <Badge className="bg-amber-100 text-amber-800">Awaiting Client</Badge>;
    } else {
      return <Badge className="bg-slate-100 text-slate-800">Draft</Badge>;
    }
  };

  const getTemplateLabel = (templateType: string) => {
    const labels: Record<string, string> = {
      custom: "Custom",
      residential: "Residential",
      commercial: "Commercial",
      renovation: "Renovation"
    };
    return labels[templateType] || templateType;
  };

  const handleTemplateSelect = (templateId: ContractTemplateType) => {
    setSelectedTemplate(templateId);
    setShowTemplateSelector(false);
  };

const handleContractGenerated = () => {
    setSelectedTemplate(null);
    setEditingContract(null);
    setDuplicatingContract(null);
    fetchContracts();
  };

  const handleBackToList = () => {
    setSelectedTemplate(null);
    setEditingContract(null);
    setDuplicatingContract(null);
    setShowTemplateSelector(false);
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
  };

  const handleDuplicateContract = (contract: Contract) => {
    // Create a new contract based on the existing one (without ID and with new number)
    const duplicated = {
      ...contract,
      id: '', // Will be generated on save
      contract_number: `C-${Date.now().toString().slice(-6)}`,
      contract_date: new Date().toISOString().split('T')[0],
      client_signature: null, // Clear signatures for new contract
      contractor_signature: null,
      status: 'draft'
    };
    setDuplicatingContract(duplicated);
  };

  const handleDownloadPDF = async (contract: Contract) => {
    setDownloadingId(contract.id);
    try {
      const htmlContent = buildContractHTML({
        contractNumber: contract.contract_number,
        contractDate: contract.contract_date,
        templateType: contract.template_type || 'custom',
        contractorInfo: {
          name: contract.contractor_name || '',
          address: contract.contractor_address || '',
          phone: contract.contractor_phone || '',
          email: contract.contractor_email || '',
          license: contract.contractor_license || undefined
        },
        clientInfo: {
          name: contract.client_name || '',
          address: contract.client_address || '',
          phone: contract.client_phone || '',
          email: contract.client_email || ''
        },
        projectInfo: {
          name: contract.project_name || '',
          address: contract.project_address || '',
          description: contract.scope_of_work || undefined
        },
        financialTerms: {
          totalAmount: contract.total_amount || 0,
          depositPercentage: contract.deposit_percentage || 50,
          depositAmount: contract.deposit_amount || 0,
          paymentSchedule: contract.payment_schedule || ''
        },
        timeline: {
          startDate: contract.start_date || '',
          estimatedEndDate: contract.estimated_end_date || '',
          workingDays: contract.working_days || ''
        },
        terms: {
          scopeOfWork: contract.scope_of_work || '',
          warrantyPeriod: contract.warranty_period || '1 year',
          materialsIncluded: contract.materials_included ?? true,
          changeOrderPolicy: contract.change_order_policy || '',
          cancellationPolicy: contract.cancellation_policy || '',
          disputeResolution: contract.dispute_resolution || '',
          additionalTerms: contract.additional_terms || undefined,
          hasLiabilityInsurance: contract.has_liability_insurance ?? true,
          hasWSIB: contract.has_wsib ?? true
        },
        signatures: {
          client: contract.client_signature as any,
          contractor: contract.contractor_signature as any
        },
        branding: {
          companyLogoUrl: profile?.company_logo_url,
          companyName: profile?.company_name || contract.contractor_name,
          companyPhone: profile?.phone || contract.contractor_phone,
          companyEmail: contract.contractor_email,
          companyWebsite: profile?.company_website
        },
        formatCurrency,
        regionName: config?.name
      });

      await downloadPDF(htmlContent, {
        filename: `Contract-${contract.contract_number}.pdf`,
        pageFormat: 'letter'
      });

      toast.success('Contract PDF downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

// Show Contract Generator when duplicating a contract
  if (duplicatingContract) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contracts
        </Button>
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mb-2">
          <p className="text-sm text-cyan-800 flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Creating a copy of contract <strong>#{duplicatingContract.contract_number}</strong> — signatures have been cleared
          </p>
        </div>
        <ContractGenerator
          existingContract={{
            ...duplicatingContract,
            id: '', // Clear ID to create new
            client_signature: null,
            contractor_signature: null
          }}
          onContractGenerated={handleContractGenerated}
        />
      </div>
    );
  }

// Show Contract Generator when editing existing contract
  if (editingContract) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contracts
        </Button>
        <ContractGenerator
          existingContract={editingContract}
          onContractGenerated={handleContractGenerated}
        />
      </div>
    );
  }

  // Show Contract Generator when template is selected
  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contracts
        </Button>
        <ContractGenerator
          onContractGenerated={handleContractGenerated}
        />
      </div>
    );
  }

  // Show template selector
  if (showTemplateSelector) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Choose Contract Template</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplateSelector(false)}
          >
            Cancel
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONTRACT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className="p-4 border rounded-lg hover:border-cyan-400 hover:bg-cyan-50/50 transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-colors">
                  {template.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{template.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Contracts
            </h3>
          </div>
        )}
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        {showTitle && (
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Contracts
            {contracts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{contracts.length}</Badge>
            )}
          </h3>
        )}
        <Button
          size="sm"
          onClick={() => setShowTemplateSelector(true)}
          className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Button>
      </div>

      {/* Empty State */}
      {contracts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No contracts yet</p>
          <p className="text-sm mt-1">Click "New Contract" to create your first one</p>
        </div>
      )}

      {/* Contract List */}
      {contracts.length > 0 && (
        <div className="space-y-3">
          {contracts.map((contract, index) => {
            // Calculate contract status for progress tracker
            const hasContractorSig = !!contract.contractor_signature;
            const hasClientSig = !!contract.client_signature;
            const getContractStage = () => {
              if (hasContractorSig && hasClientSig) return 4; // Complete
              if (hasContractorSig && !hasClientSig) return 2; // Sent (awaiting client)
              return 1; // Draft
            };
            const stage = getContractStage();

            return (
            <div key={contract.id} className="p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow">
              {/* Contract Status Progress Tracker */}
              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  {/* Stage 1: Draft */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      stage >= 1 ? "bg-cyan-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      1
                    </div>
                    <span className={`text-xs mt-1 ${stage >= 1 ? "text-cyan-600 font-medium" : "text-slate-400"}`}>
                      Draft
                    </span>
                  </div>

                  {/* Connector 1-2 */}
                  <div className={`h-1 flex-1 mx-1 rounded transition-all ${
                    stage >= 2 ? "bg-cyan-500" : "bg-slate-200"
                  }`} />

                  {/* Stage 2: Sent */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      stage >= 2 ? "bg-cyan-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      2
                    </div>
                    <span className={`text-xs mt-1 ${stage >= 2 ? "text-cyan-600 font-medium" : "text-slate-400"}`}>
                      Sent
                    </span>
                  </div>

                  {/* Connector 2-3 */}
                  <div className={`h-1 flex-1 mx-1 rounded transition-all ${
                    stage >= 3 ? "bg-amber-500" : "bg-slate-200"
                  }`} />

                  {/* Stage 3: Client Signed */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      stage >= 3 ? "bg-amber-500 text-white" : stage >= 2 && hasClientSig ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      3
                    </div>
                    <span className={`text-xs mt-1 text-center ${
                      (stage >= 3 || hasClientSig) ? "text-amber-600 font-medium" : "text-slate-400"
                    }`}>
                      Client Signed
                    </span>
                  </div>

                  {/* Connector 3-4 */}
                  <div className={`h-1 flex-1 mx-1 rounded transition-all ${
                    stage >= 4 ? "bg-green-500" : "bg-slate-200"
                  }`} />

                  {/* Stage 4: Complete */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      stage >= 4 ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className={`text-xs mt-1 ${stage >= 4 ? "text-green-600 font-medium" : "text-slate-400"}`}>
                      Complete
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">#{contract.contract_number}</span>
                    {getStatusBadge(contract)}
                    <Badge variant="outline" className="text-xs">
                      {getTemplateLabel(contract.template_type || "custom")}
                    </Badge>
                  </div>

                  {/* Project/Client Info */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    {contract.project_name && (
                      <p className="flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {contract.project_name}
                      </p>
                    )}
                    {contract.client_name && (
                      <p className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {contract.client_name}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(contract.contract_date).toLocaleDateString("en-CA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </p>
                  </div>

                  {/* Amount */}
                  {contract.total_amount && contract.total_amount > 0 && (
                    <p className="flex items-center gap-2 font-semibold text-amber-600">
                      <DollarSign className="w-4 h-4" />
                      {formatCurrency(contract.total_amount)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(contract)}
                    disabled={downloadingId === contract.id}
                    className="gap-1"
                    title="Download PDF"
                  >
                    {downloadingId === contract.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateContract(contract)}
                    className="gap-1"
                    title="Duplicate Contract"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Duplicate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditContract(contract)}
                    className="gap-1"
                    title="Edit Contract"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingId === contract.id}
                        title="Delete Contract"
                      >
                        {deletingId === contract.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete contract #{contract.contract_number}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(contract.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Continue to Operational Truth */}
      {onNavigateToAI && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <Button
            onClick={onNavigateToAI}
            className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
          >
            <Brain className="w-4 h-4" />
            Continue to Operational Truth
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
          <p className="text-xs text-slate-500 text-center mt-2">
            Review all 8 elements and verify project data with AI
          </p>
        </div>
      )}
    </div>
  );
};

export default ContractHistory;
