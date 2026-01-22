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
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  DollarSign,
  Trash2,
  Eye,
  Download,
  Clock,
  CheckCircle2,
  User,
  Building2,
  Loader2
} from "lucide-react";

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  template_type: string;
  status: string;
  contractor_name: string | null;
  client_name: string | null;
  project_name: string | null;
  total_amount: number | null;
  client_signature: any | null;
  contractor_signature: any | null;
  created_at: string;
}

interface ContractHistoryProps {
  projectId?: string;
  showTitle?: boolean;
}

const ContractHistory = ({ projectId, showTitle = true }: ContractHistoryProps) => {
  const { user } = useAuth();
  const { formatCurrency } = useRegionSettings();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContracts(data || []);
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
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractId);

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

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Contract History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Contract History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No contracts yet</p>
          <p className="text-sm mt-1">Generate your first contract in Quick Mode</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Contract History
            <Badge variant="secondary" className="ml-2">{contracts.length}</Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {contracts.map((contract, index) => (
          <div key={contract.id}>
            {index > 0 && <Separator className="my-4" />}
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

                {/* Signature Status */}
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${contract.contractor_signature ? "text-green-600" : "text-muted-foreground"}`}>
                    {contract.contractor_signature ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    Contractor
                  </span>
                  <span className={`flex items-center gap-1 ${contract.client_signature ? "text-green-600" : "text-muted-foreground"}`}>
                    {contract.client_signature ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    Client
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={deletingId === contract.id}
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
        ))}
      </CardContent>
    </Card>
  );
};

export default ContractHistory;
