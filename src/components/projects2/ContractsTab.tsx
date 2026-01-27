import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Download, 
  Loader2,
  FileSignature,
  Home,
  Building,
  Wrench,
  FileCheck,
  Plus,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { buildContractHTML, generatePDFBlob } from "@/lib/pdfGenerator";
import { useNavigate } from "react-router-dom";

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  project_name: string | null;
  project_address: string | null;
  total_amount: number | null;
  status: string;
  template_type: string | null;
  contractor_name: string | null;
  contractor_address: string | null;
  contractor_phone: string | null;
  contractor_email: string | null;
  contractor_license: string | null;
  client_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  scope_of_work: string | null;
  deposit_percentage: number | null;
  deposit_amount: number | null;
  payment_schedule: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  working_days: string | null;
  warranty_period: string | null;
  materials_included: boolean | null;
  change_order_policy: string | null;
  cancellation_policy: string | null;
  dispute_resolution: string | null;
  additional_terms: string | null;
  has_liability_insurance: boolean | null;
  has_wsib: boolean | null;
  client_signature: any | null;
  contractor_signature: any | null;
  created_at: string;
  updated_at: string;
}

type ContractTemplateType = "custom" | "residential" | "commercial" | "renovation";

interface ContractTemplate {
  id: ContractTemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  depositPercentage: number;
  paymentSchedule: string;
  warrantyPeriod: string;
}

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "custom",
    name: "Custom Contract",
    description: "Start from scratch with your own terms",
    icon: <FileCheck className="w-5 h-5" />,
    depositPercentage: 50,
    paymentSchedule: "50% deposit, 50% on completion",
    warrantyPeriod: "1 year",
  },
  {
    id: "residential",
    name: "Residential",
    description: "Home improvement & residential projects",
    icon: <Home className="w-5 h-5" />,
    depositPercentage: 30,
    paymentSchedule: "30/30/40 milestone payments",
    warrantyPeriod: "2 years",
  },
  {
    id: "commercial",
    name: "Commercial",
    description: "Business & commercial construction",
    icon: <Building className="w-5 h-5" />,
    depositPercentage: 25,
    paymentSchedule: "Monthly progress payments",
    warrantyPeriod: "1-5 years",
  },
  {
    id: "renovation",
    name: "Renovation",
    description: "Remodeling & renovation projects",
    icon: <Wrench className="w-5 h-5" />,
    depositPercentage: 35,
    paymentSchedule: "35% deposit for materials",
    warrantyPeriod: "2 years",
  },
];

interface ContractsTabProps {
  projectId: string;
  isOwner: boolean;
}

const ContractsTab = ({ projectId, isOwner }: ContractsTabProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  useEffect(() => {
    const fetchContracts = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setContracts(data as Contract[] || []);
      } catch (error) {
        console.error("Error fetching contracts:", error);
        toast.error("Failed to load contracts");
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [projectId]);

  const getStatusBadge = (contract: Contract) => {
    if (contract.client_signature && contract.contractor_signature) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Signed
        </Badge>
      );
    } else if (contract.contractor_signature) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <FileSignature className="h-3 w-3 mr-1" />
          Awaiting Client
        </Badge>
      );
    } else if (contract.status === "draft") {
      return (
        <Badge variant="secondary">
          <Edit3 className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    }
    return <Badge variant="outline">{contract.status}</Badge>;
  };

  const getTemplateBadge = (templateType: string | null) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateType);
    if (!template) return null;
    
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        {template.icon}
        {template.name}
      </Badge>
    );
  };

  const handleTemplateSelect = (templateId: ContractTemplateType) => {
    // Navigate to Quick Mode with template pre-selected
    navigate(`/buildunion/quick-mode?projectId=${projectId}&template=${templateId}`);
  };

  const handleDownloadPDF = async (contract: Contract) => {
    setDownloadingId(contract.id);
    try {
      const htmlContent = buildContractHTML({
        contractNumber: contract.contract_number,
        contractDate: contract.contract_date,
        templateType: contract.template_type || "custom",
        contractorInfo: {
          name: contract.contractor_name || "",
          address: contract.contractor_address || "",
          phone: contract.contractor_phone || "",
          email: contract.contractor_email || "",
          license: contract.contractor_license || undefined,
        },
        clientInfo: {
          name: contract.client_name || "",
          address: contract.client_address || "",
          phone: contract.client_phone || "",
          email: contract.client_email || "",
        },
        projectInfo: {
          name: contract.project_name || "",
          address: contract.project_address || "",
          description: contract.scope_of_work || undefined,
        },
        financialTerms: {
          totalAmount: contract.total_amount || 0,
          depositPercentage: contract.deposit_percentage || 50,
          depositAmount: contract.deposit_amount || 0,
          paymentSchedule: contract.payment_schedule || "",
        },
        timeline: {
          startDate: contract.start_date || "",
          estimatedEndDate: contract.estimated_end_date || "",
          workingDays: contract.working_days || "",
        },
        terms: {
          scopeOfWork: contract.scope_of_work || "",
          warrantyPeriod: contract.warranty_period || "1 year",
          materialsIncluded: contract.materials_included ?? true,
          changeOrderPolicy: contract.change_order_policy || "",
          cancellationPolicy: contract.cancellation_policy || "",
          disputeResolution: contract.dispute_resolution || "",
          additionalTerms: contract.additional_terms || undefined,
          hasLiabilityInsurance: contract.has_liability_insurance ?? true,
          hasWSIB: contract.has_wsib ?? true,
        },
        signatures: {
          client: contract.client_signature,
          contractor: contract.contractor_signature,
        },
        branding: {},
        formatCurrency,
      });

      const blob = await generatePDFBlob(htmlContent, {
        filename: `Contract-${contract.contract_number}.pdf`,
      });
      
      // Download the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Contract-${contract.contract_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Contract downloaded successfully");
    } catch (error) {
      console.error("Error downloading contract:", error);
      toast.error("Failed to download contract");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection - Only for Owners */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-500" />
              Create New Contract
            </CardTitle>
            <CardDescription>
              Choose a template to get started quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CONTRACT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-lg border-2 text-left",
                    "bg-card hover:bg-muted/50 transition-all",
                    "hover:border-cyan-500/50 hover:shadow-md",
                    "group"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center mb-3",
                    "bg-gradient-to-br from-cyan-500/10 to-blue-500/10",
                    "text-cyan-600 dark:text-cyan-400",
                    "group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-colors"
                  )}>
                    {template.icon}
                  </div>
                  <h4 className="font-medium text-sm text-foreground mb-1">
                    {template.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>{template.depositPercentage}% deposit</span>
                    <span>{template.warrantyPeriod} warranty</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Use Template <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Contracts */}
      {contracts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-amber-500" />
              Project Contracts
              <Badge variant="secondary" className="ml-2">{contracts.length}</Badge>
            </CardTitle>
            <CardDescription>
              {isOwner 
                ? "All contracts associated with this project"
                : "View and download contracts shared with you"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  "bg-card hover:bg-muted/30 transition-colors"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    contract.client_signature && contract.contractor_signature
                      ? "bg-green-100 dark:bg-green-950/30"
                      : "bg-muted"
                  )}>
                    <FileText className={cn(
                      "h-5 w-5",
                      contract.client_signature && contract.contractor_signature
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        #{contract.contract_number}
                      </p>
                      {getStatusBadge(contract)}
                      {getTemplateBadge(contract.template_type)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(contract.created_at), "MMM d, yyyy")}
                      </span>
                      {contract.total_amount && (
                        <span className="font-medium text-foreground">
                          {formatCurrency(contract.total_amount)}
                        </span>
                      )}
                      {contract.client_name && (
                        <span>Client: {contract.client_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(contract)}
                  disabled={downloadingId === contract.id}
                  className="gap-2"
                >
                  {downloadingId === contract.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        !isOwner && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No Contracts Yet</h3>
              <p className="text-sm text-muted-foreground">
                No contracts have been shared for this project yet
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};

export default ContractsTab;
