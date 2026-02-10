import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import {
  FileCheck,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  User,
  Shield,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { downloadContractPDF, type ContractTemplateData } from "@/lib/pdfGenerator";
import { cn } from "@/lib/utils";

interface ContractData {
  id: string;
  contract_number: string;
  contract_date: string;
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
  contractor_signature: any | null;
  client_signature: any | null;
  status: string;
}

export default function ContractSignature() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signedSuccessfully, setSignedSuccessfully] = useState(false);

  // Fetch contract data
  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError("Invalid contract link. Please check your email for the correct link.");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("view-contract", {
          body: null,
          headers: {},
        });

        // Use query param approach since invoke doesn't support query params well
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/view-contract?token=${token}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load contract");
        }

        setContract(result.contract);
        setAlreadySigned(result.alreadySigned);
      } catch (err: any) {
        console.error("Error fetching contract:", err);
        setError(err.message || "Failed to load contract. The link may have expired.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  // Handle signature submission
  const handleSign = async () => {
    if (!signatureData || !token || !contract) {
      toast.error("Please sign the contract before submitting");
      return;
    }

    setIsSigning(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/view-contract?token=${token}&action=sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signature: {
              data: signatureData,
              signedAt: new Date().toISOString(),
              userAgent: navigator.userAgent,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit signature");
      }

      setSignedSuccessfully(true);
      setAlreadySigned(true);
      toast.success("Contract signed successfully!");
    } catch (err: any) {
      console.error("Signing error:", err);
      toast.error(err.message || "Failed to sign contract");
    } finally {
      setIsSigning(false);
    }
  };

  // Handle PDF download
  const handleDownload = async () => {
    if (!contract) return;

    setIsDownloading(true);
    try {
      const contractData: ContractTemplateData = {
        contractNumber: contract.contract_number,
        contractType: "residential",
        projectName: contract.project_name || "Untitled Project",
        projectAddress: contract.project_address || "",
        gfa: 0,
        gfaUnit: "sq ft",
        trade: contract.scope_of_work || "Not set",
        startDate: contract.start_date
          ? format(new Date(contract.start_date), "MMM dd, yyyy")
          : "TBD",
        endDate: contract.estimated_end_date
          ? format(new Date(contract.estimated_end_date), "MMM dd, yyyy")
          : "TBD",
        teamSize: 0,
        taskCount: 0,
        contractorName: contract.contractor_name || undefined,
        contractorAddress: contract.contractor_address || undefined,
        contractorPhone: contract.contractor_phone || undefined,
        contractorEmail: contract.contractor_email || undefined,
        clientName: contract.client_name || undefined,
        clientAddress: contract.client_address || undefined,
        clientPhone: contract.client_phone || undefined,
        clientEmail: contract.client_email || undefined,
        scopeOfWork: contract.scope_of_work || undefined,
        totalAmount: contract.total_amount || undefined,
        depositPercentage: contract.deposit_percentage || undefined,
        warrantyPeriod: contract.warranty_period || undefined,
        paymentSchedule: contract.payment_schedule || undefined,
      };

      await downloadContractPDF(contractData);
      toast.success("Contract PDF downloaded!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading contract...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Contract</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after signing
  if (signedSuccessfully) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
              Contract Signed!
            </h2>
            <p className="text-muted-foreground mb-6">
              Thank you for signing the contract. A confirmation email will be sent to you shortly.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleDownload} disabled={isDownloading} className="w-full gap-2">
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Signed Contract
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contract) return null;

  const formattedAmount = contract.total_amount
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
        contract.total_amount
      )
    : null;

  const depositAmount =
    contract.total_amount && contract.deposit_percentage
      ? (contract.total_amount * contract.deposit_percentage) / 100
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-4">
            <FileCheck className="h-4 w-4" />
            Contract #{contract.contract_number}
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Contract Review & Signature
          </h1>
          <p className="text-muted-foreground">
            Please review the contract details below and sign at the bottom
          </p>
        </div>

        {/* Already Signed Banner */}
        {alreadySigned && (
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                This contract has already been signed
              </p>
              <p className="text-sm text-green-600/80 dark:text-green-400/80">
                You can download a copy for your records
              </p>
            </div>
          </div>
        )}

        {/* Contractor Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
              Contractor
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{contract.contractor_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">License</p>
              <p className="font-medium">{contract.contractor_license || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">{contract.contractor_address || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="font-medium">
                {contract.contractor_phone || contract.contractor_email || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-amber-600" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Project Name</p>
                <p className="font-medium">{contract.project_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium">{contract.project_address || "—"}</p>
              </div>
            </div>
            {contract.scope_of_work && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Scope of Work</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{contract.scope_of_work}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {contract.start_date
                  ? format(new Date(contract.start_date), "MMM dd, yyyy")
                  : "TBD"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Completion</p>
              <p className="font-medium">
                {contract.estimated_end_date
                  ? format(new Date(contract.estimated_end_date), "MMM dd, yyyy")
                  : "TBD"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Working Days</p>
              <p className="font-medium">{contract.working_days || "Mon-Fri"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Terms */}
        {formattedAmount && (
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2 bg-green-50/50 dark:bg-green-900/20">
              <CardTitle className="flex items-center gap-2 text-lg text-green-700 dark:text-green-300">
                <DollarSign className="h-5 w-5" />
                Financial Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-100/50 dark:bg-green-900/30">
                <span className="font-medium">Total Contract Value</span>
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formattedAmount}
                </span>
              </div>
              {depositAmount && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Deposit Required</p>
                    <p className="font-medium">
                      {contract.deposit_percentage}% (
                      {new Intl.NumberFormat("en-CA", {
                        style: "currency",
                        currency: "CAD",
                      }).format(depositAmount)}
                      )
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Schedule</p>
                    <p className="font-medium">{contract.payment_schedule || "Upon completion"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Terms & Warranty */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-purple-600" />
              Terms & Warranty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Warranty:</strong> {contract.warranty_period || "1 year from completion"}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {contract.materials_included && (
                <Badge variant="outline" className="text-xs">
                  ✓ Materials Included
                </Badge>
              )}
              {contract.has_liability_insurance && (
                <Badge variant="outline" className="text-xs">
                  ✓ Liability Insurance
                </Badge>
              )}
              {contract.has_wsib && (
                <Badge variant="outline" className="text-xs">
                  ✓ WSIB Coverage
                </Badge>
              )}
            </div>
            {contract.additional_terms && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Additional Terms</p>
                <p className="text-sm">{contract.additional_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Signature Section */}
        <Card className={cn(alreadySigned && "opacity-70")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-amber-600" />
              Client Signature
              {alreadySigned && (
                <Badge className="ml-2 bg-green-100 text-green-700">Signed</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Client Name</p>
                <p className="font-medium">{contract.client_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client Address</p>
                <p className="font-medium">{contract.client_address || "—"}</p>
              </div>
            </div>

            {alreadySigned ? (
              <div className="p-6 rounded-lg border-2 border-dashed border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Contract signed by client
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  By signing below, you agree to all terms and conditions outlined in this contract.
                </p>
                <SignatureCanvas
                  onSignatureChange={setSignatureData}
                  disabled={alreadySigned}
                  height={180}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF
          </Button>
          {!alreadySigned && (
            <Button
              className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={handleSign}
              disabled={!signatureData || isSigning}
            >
              {isSigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCheck className="h-4 w-4" />
              )}
              Sign & Submit Contract
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>Powered by BuildUnion • Secure Contract Management</p>
          <p>Contract #{contract.contract_number} • {format(new Date(contract.contract_date), "MMMM dd, yyyy")}</p>
        </div>
      </div>
    </div>
  );
}
