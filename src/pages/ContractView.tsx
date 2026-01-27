import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignatureCapture, { SignatureData } from "@/components/SignatureCapture";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText,
  User,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  CheckCircle2,
  Clock,
  PenLine,
  Download,
  Loader2,
  AlertTriangle,
} from "lucide-react";

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

const ContractView = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [clientSignature, setClientSignature] = useState<SignatureData | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError("Invalid contract link");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("view-contract", {
          body: null,
          headers: {},
          method: "GET",
        });

        // Use fetch directly for GET with query params
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
          setError(result.error || "Failed to load contract");
          return;
        }

        setContract(result.contract);
        setAlreadySigned(result.alreadySigned);
      } catch (err) {
        console.error("Error fetching contract:", err);
        setError("Failed to load contract");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  const handleSign = async () => {
    if (!clientSignature || !token) return;

    setIsSigning(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/view-contract?token=${token}&action=sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ signature: clientSignature }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to sign contract");
        return;
      }

      toast.success("Contract signed successfully!");
      setAlreadySigned(true);
      setContract((prev) =>
        prev ? { ...prev, client_signature: clientSignature, status: "signed" } : null
      );
    } catch (err) {
      console.error("Error signing contract:", err);
      toast.error("Failed to sign contract");
    } finally {
      setIsSigning(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Contract Not Found</h2>
            <p className="text-muted-foreground">
              {error || "This contract link may have expired or is invalid."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>Contract #{contract.contract_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(contract.contract_date)}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  alreadySigned
                    ? "bg-green-500/20 text-green-700"
                    : "bg-amber-500/20 text-amber-700"
                }
              >
                {alreadySigned ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Signed
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-1" />
                    Awaiting Signature
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Parties */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Contractor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{contract.contractor_name || "—"}</p>
              <p className="text-muted-foreground">{contract.contractor_address}</p>
              <p className="text-muted-foreground">{contract.contractor_phone}</p>
              <p className="text-muted-foreground">{contract.contractor_email}</p>
              {contract.contractor_license && (
                <p className="text-muted-foreground">
                  License: {contract.contractor_license}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{contract.client_name || "—"}</p>
              <p className="text-muted-foreground">{contract.client_address}</p>
              <p className="text-muted-foreground">{contract.client_phone}</p>
              <p className="text-muted-foreground">{contract.client_email}</p>
            </CardContent>
          </Card>
        </div>

        {/* Project Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Project Name</p>
                <p className="font-medium">{contract.project_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project Address</p>
                <p className="font-medium">{contract.project_address || "—"}</p>
              </div>
            </div>

            {contract.scope_of_work && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Scope of Work</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {contract.scope_of_work}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Terms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Financial Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(contract.total_amount)}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Deposit</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(contract.deposit_amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({contract.deposit_percentage}%)
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(
                    (contract.total_amount || 0) - (contract.deposit_amount || 0)
                  )}
                </p>
              </div>
            </div>

            {contract.payment_schedule && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Payment Schedule</p>
                <p className="text-sm">{contract.payment_schedule}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Completion</p>
                <p className="font-medium">{formatDate(contract.estimated_end_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Working Days</p>
                <p className="font-medium">{contract.working_days || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {contract.materials_included && (
                <Badge variant="secondary">Materials Included</Badge>
              )}
              {contract.has_liability_insurance && (
                <Badge variant="secondary">Liability Insurance</Badge>
              )}
              {contract.has_wsib && <Badge variant="secondary">WSIB Coverage</Badge>}
            </div>

            {contract.warranty_period && (
              <div>
                <p className="font-medium">Warranty Period</p>
                <p className="text-muted-foreground">{contract.warranty_period}</p>
              </div>
            )}

            {contract.change_order_policy && (
              <div>
                <p className="font-medium">Change Order Policy</p>
                <p className="text-muted-foreground">{contract.change_order_policy}</p>
              </div>
            )}

            {contract.cancellation_policy && (
              <div>
                <p className="font-medium">Cancellation Policy</p>
                <p className="text-muted-foreground">{contract.cancellation_policy}</p>
              </div>
            )}

            {contract.dispute_resolution && (
              <div>
                <p className="font-medium">Dispute Resolution</p>
                <p className="text-muted-foreground">{contract.dispute_resolution}</p>
              </div>
            )}

            {contract.additional_terms && (
              <div>
                <p className="font-medium">Additional Terms</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {contract.additional_terms}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signatures */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Signatures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contractor Signature */}
            <div>
              <p className="text-sm font-medium mb-2">Contractor Signature</p>
              {contract.contractor_signature ? (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <img
                    src={contract.contractor_signature.dataUrl}
                    alt="Contractor signature"
                    className="max-h-20"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Signed by {contract.contractor_signature.name}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Awaiting contractor signature
                </p>
              )}
            </div>

            <Separator />

            {/* Client Signature */}
            <div>
              <p className="text-sm font-medium mb-2">Client Signature</p>
              {alreadySigned || contract.client_signature ? (
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                  {contract.client_signature && (
                    <img
                      src={contract.client_signature.dataUrl}
                      alt="Client signature"
                      className="max-h-20"
                    />
                  )}
                  <div className="flex items-center gap-2 mt-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-sm font-medium">Contract Signed</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Please review the contract above and sign below to accept the terms.
                    </AlertDescription>
                  </Alert>

                  <SignatureCapture
                    label="Your Signature"
                    onSignatureChange={setClientSignature}
                  />

                  <Button
                    onClick={handleSign}
                    disabled={!clientSignature || isSigning}
                    className="w-full"
                    size="lg"
                  >
                    {isSigning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <PenLine className="w-4 h-4 mr-2" />
                        Sign Contract
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractView;
