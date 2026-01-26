import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import TeamManagement from "@/components/TeamManagement";
import TaskAssignment from "@/components/TaskAssignment";
import ProjectDocuments from "@/components/ProjectDocuments";
import ProjectAIPanel from "@/components/ProjectAIPanel";
import ContractHistory from "@/components/ContractHistory";
import RequirementsTab from "@/components/RequirementsTab";
import OperationalTruthSummaryCard from "@/components/OperationalTruthSummaryCard";
import { ProjectSummary } from "@/components/ProjectSummary";
import { ProjectModeToggle } from "@/components/ProjectModeToggle";
import { WeatherWidget } from "@/components/WeatherWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, ArrowRight, FileText, Calendar, Loader2, Plus, Trash2,
  AlertCircle, Sparkles,
  Pencil, X, Check,
  Users, User, Image, FileCheck, Briefcase, MapPin,
  Camera, DollarSign, Package, Brain, Crown, Lock, FileUp, ClipboardList, ScrollText,
  Download, Eye
} from "lucide-react";
import { downloadPDF, generatePDFBlob, buildContractHTML } from "@/lib/pdfGenerator";
import { useRegionSettings } from "@/hooks/useRegionSettings";
import { useBuProfile } from "@/hooks/useBuProfile";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { TRADE_LABELS, ConstructionTrade } from "@/hooks/useBuProfile";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  address?: string | null;
  trade?: string | null;
  trades?: string[];
  manpower_requirements?: { trade: string; count: number }[];
  required_certifications?: string[];
  site_images?: string[];
}

interface TeamInvitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

interface ProjectContract {
  id: string;
  contract_number: string;
  contract_date: string;
  template_type: string | null;
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
}

const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { config, formatCurrency } = useRegionSettings();
  const { profile } = useBuProfile();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [siteImageUrls, setSiteImageUrls] = useState<string[]>([]);
  const [projectSummary, setProjectSummary] = useState<any>(null);
  const [projectContracts, setProjectContracts] = useState<ProjectContract[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);
  const [viewingContractId, setViewingContractId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBlueprintPanel, setShowBlueprintPanel] = useState(false);
  const [blueprintTab, setBlueprintTab] = useState<"ai" | "documents" | "facts" | "requirements" | "team" | "contracts">("ai");
  const [showStatsPopup, setShowStatsPopup] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<"pro" | "premium" | null>(null);
  const [projectMode, setProjectMode] = useState<"solo" | "team">("team"); // Team projects are team by default
  
  // Tier access: Pro+ can access Blueprint Analysis
  const isPro = subscription.tier === "pro" || subscription.tier === "premium" || subscription.tier === "enterprise";
  const isPremium = subscription.tier === "premium" || subscription.tier === "enterprise";

  // Tab click handler with tier gating
  const handleTabClick = (tab: typeof blueprintTab, requiredTier: "free" | "pro" | "premium") => {
    if (requiredTier === "pro" && !isPro) {
      setShowUpgradePrompt("pro");
      return;
    }
    if (requiredTier === "premium" && !isPremium) {
      setShowUpgradePrompt("premium");
      return;
    }
    setBlueprintTab(tab);
  };
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTrades, setEditTrades] = useState<string[]>([]);
  const [editManpower, setEditManpower] = useState<{ trade: string; count: number }[]>([]);
  const [editCertifications, setEditCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState("");
  const [editSiteImages, setEditSiteImages] = useState<string[]>([]);
  const [newSiteImages, setNewSiteImages] = useState<{ file: File; id: string; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    const fetchProjectData = async () => {
      try {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (projectError) throw projectError;
        if (!projectData) {
          toast.error("Project not found");
          navigate("/buildunion/workspace");
          return;
        }

        setProject(projectData as unknown as Project);
        setEditName(projectData.name);
        setEditDescription(projectData.description || "");
        setEditStatus(projectData.status);
        setEditAddress(projectData.address || "");
        setEditTrades(projectData.trades || []);
        setEditManpower((projectData.manpower_requirements as { trade: string; count: number }[]) || []);
        setEditCertifications(projectData.required_certifications || []);
        setEditSiteImages(projectData.site_images || []);
        setNewSiteImages([]);

        // Fetch site images URLs
        const siteImages = (projectData as any).site_images || [];
        if (siteImages.length > 0) {
          const urls = await Promise.all(
            siteImages.map(async (path: string) => {
              const { data } = supabase.storage.from("project-documents").getPublicUrl(path);
              return data.publicUrl;
            })
          );
          setSiteImageUrls(urls);
        }

        // Fetch documents
        const { data: docsData, error: docsError } = await supabase
          .from("project_documents")
          .select("*")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false });

        if (docsError) throw docsError;
        setDocuments(docsData || []);

        // Fetch project summary (Quick Mode data)
        const { data: summaryData } = await supabase
          .from("project_summaries")
          .select("*")
          .eq("project_id", projectId)
          .maybeSingle();

        if (summaryData) {
          setProjectSummary(summaryData);
          // Sync project mode from database
          if (summaryData.mode) {
            setProjectMode(summaryData.mode as "solo" | "team");
          }
        }

        // Fetch team invitations
        const { data: inviteData, error: inviteError } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (!inviteError) {
          setTeamInvitations(inviteData || []);
        }

        // Fetch project contracts
        const { data: contractsData } = await supabase
          .from("contracts")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (contractsData) {
          setProjectContracts(contractsData);
        }

        // Fetch project tasks for Timeline view
        const { data: tasksData } = await supabase
          .from("project_tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (tasksData) {
          setProjectTasks(tasksData);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [user, projectId, navigate]);

  // Refresh contracts for Operational Truth sync
  const refreshContracts = async () => {
    if (!projectId) return;
    
    const { data: contractsData } = await supabase
      .from("contracts")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (contractsData) {
      setProjectContracts(contractsData);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Handle contract PDF download
  const handleDownloadContractPDF = async (contract: ProjectContract) => {
    setDownloadingContractId(contract.id);
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
          client: contract.client_signature,
          contractor: contract.contractor_signature
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
      setDownloadingContractId(null);
    }
  };

  // Handle contract PDF view in new tab
  const handleViewContractPDF = async (contract: ProjectContract) => {
    setViewingContractId(contract.id);
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
          client: contract.client_signature,
          contractor: contract.contractor_signature
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

      const blob = await generatePDFBlob(htmlContent, {
        filename: `Contract-${contract.contract_number}.pdf`,
        pageFormat: 'letter'
      });
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Revoke after a short delay to ensure the tab has loaded
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF preview');
    } finally {
      setViewingContractId(null);
    }
  };

  const getContractStatusBadge = (contract: ProjectContract) => {
    const hasBothSignatures = contract.client_signature && contract.contractor_signature;
    const hasContractorSignature = contract.contractor_signature;

    if (hasBothSignatures) {
      return <Badge className="bg-green-100 text-green-800 text-xs">Signed</Badge>;
    } else if (hasContractorSignature) {
      return <Badge className="bg-amber-100 text-amber-800 text-xs">Awaiting Client</Badge>;
    } else {
      return <Badge className="bg-slate-100 text-slate-800 text-xs">Draft</Badge>;
    }
  };

  const handleSaveProject = async () => {
    if (!project || !editName.trim() || !user) return;

    setSaving(true);
    try {
      const uploadedPaths: string[] = [];
      for (const img of newSiteImages) {
        const imgPath = `${user.id}/site-images/${img.id}-${img.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(imgPath, img.file);
        if (!uploadError) {
          uploadedPaths.push(imgPath);
        }
      }

      const removedImages = (project.site_images || []).filter(
        path => !editSiteImages.includes(path)
      );
      if (removedImages.length > 0) {
        await supabase.storage.from("project-documents").remove(removedImages);
      }

      const allSiteImages = [...editSiteImages, ...uploadedPaths];

      const { error } = await supabase
        .from("projects")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
          address: editAddress.trim() || null,
          trades: editTrades,
          manpower_requirements: editManpower as any,
          required_certifications: editCertifications,
          site_images: allSiteImages,
        })
        .eq("id", project.id);

      if (error) throw error;

      setProject({
        ...project,
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        address: editAddress.trim() || null,
        trades: editTrades,
        manpower_requirements: editManpower,
        required_certifications: editCertifications,
        site_images: allSiteImages,
      });

      const urls = await Promise.all(
        allSiteImages.map(async (path: string) => {
          const { data } = supabase.storage.from("project-documents").getPublicUrl(path);
          return data.publicUrl;
        })
      );
      setSiteImageUrls(urls);
      newSiteImages.forEach(img => URL.revokeObjectURL(img.preview));
      setNewSiteImages([]);
      setEditSiteImages(allSiteImages);
      setIsEditing(false);
      toast.success("Project updated");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || "");
      setEditStatus(project.status);
      setEditAddress(project.address || "");
      setEditTrades(project.trades || []);
      setEditManpower(project.manpower_requirements || []);
      setEditCertifications(project.required_certifications || []);
      setEditSiteImages(project.site_images || []);
      newSiteImages.forEach(img => URL.revokeObjectURL(img.preview));
      setNewSiteImages([]);
    }
    setIsEditing(false);
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return;

    try {
      if (documents.length > 0) {
        const paths = documents.map(d => d.file_path);
        await supabase.storage.from("project-documents").remove(paths);
      }
      if (project.site_images && project.site_images.length > 0) {
        await supabase.storage.from("project-documents").remove(project.site_images);
      }
      await supabase.from("team_invitations").delete().eq("project_id", project.id);
      await supabase.from("project_documents").delete().eq("project_id", project.id);
      const { error } = await supabase.from("projects").delete().eq("id", project.id);
      if (error) throw error;
      toast.success("Project deleted");
      navigate("/buildunion/workspace");
    } catch (error) {
      console.error("Delete project error:", error);
      toast.error("Failed to delete project");
    }
  };

  if (loading) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <BuildUnionHeader projectMode={projectMode} />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </div>
      </main>
    );
  }

  if (!project || !user) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <BuildUnionHeader projectMode={projectMode} />
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {!user ? "Please log in to view this project" : "Project not found"}
          </h2>
          <Button onClick={() => navigate(!user ? "/buildunion" : "/buildunion/workspace")} variant="outline">
            {!user ? "Go to Home" : "Back to Workspace"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader 
        projectMode={projectMode}
        summaryId={projectSummary?.id}
        projectId={projectId}
        onModeChange={(newMode) => setProjectMode(newMode)}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Link */}
        <button
          onClick={() => navigate("/buildunion/workspace")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Workspace</span>
        </button>

        {/* Project Header */}
        <Card className="mb-8 border-slate-200 bg-white">
          <CardContent className="pt-6">
            {isEditing ? (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700 font-medium">Project Name *</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Project name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 font-medium">Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Project address"
                    className="mt-1 max-w-lg"
                  />
                </div>

                <div>
                  <Label className="text-slate-700 font-medium">Description</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Project description"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Trades */}
                <div>
                  <Label className="text-slate-700 font-medium flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4" />
                    Required Trades
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(TRADE_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`trade-${key}`}
                          checked={editTrades.includes(key)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditTrades([...editTrades, key]);
                            } else {
                              setEditTrades(editTrades.filter(t => t !== key));
                            }
                          }}
                        />
                        <label htmlFor={`trade-${key}`} className="text-sm text-slate-600 cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manpower Requirements */}
                <div>
                  <Label className="text-slate-700 font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    Manpower Requirements
                  </Label>
                  <div className="space-y-2">
                    {editManpower.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={req.trade}
                          onValueChange={(value) => {
                            const updated = [...editManpower];
                            updated[idx].trade = value;
                            setEditManpower(updated);
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TRADE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          value={req.count}
                          onChange={(e) => {
                            const updated = [...editManpower];
                            updated[idx].count = parseInt(e.target.value) || 1;
                            setEditManpower(updated);
                          }}
                          className="w-20"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditManpower(editManpower.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditManpower([...editManpower, { trade: "general_contractor", count: 1 }])}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Requirement
                    </Button>
                  </div>
                </div>

                {/* Required Certifications */}
                <div>
                  <Label className="text-slate-700 font-medium flex items-center gap-2 mb-2">
                    <FileCheck className="h-4 w-4" />
                    Required Certifications
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editCertifications.map((cert, idx) => (
                      <Badge key={idx} variant="outline" className="border-emerald-200 text-emerald-700 gap-1">
                        {cert}
                        <button
                          onClick={() => setEditCertifications(editCertifications.filter((_, i) => i !== idx))}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Add certification..."
                      className="max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCertification.trim()) {
                          e.preventDefault();
                          if (!editCertifications.includes(newCertification.trim())) {
                            setEditCertifications([...editCertifications, newCertification.trim()]);
                          }
                          setNewCertification("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newCertification.trim() && !editCertifications.includes(newCertification.trim())) {
                          setEditCertifications([...editCertifications, newCertification.trim()]);
                          setNewCertification("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Site Images */}
                <div>
                  <Label className="text-slate-700 font-medium flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    Site Photos
                  </Label>
                  
                  {/* Existing images */}
                  {editSiteImages.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                      {editSiteImages.map((path, idx) => {
                        const url = supabase.storage.from("project-documents").getPublicUrl(path).data.publicUrl;
                        return (
                          <div key={path} className="relative group">
                            <img
                              src={url}
                              alt={`Site ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => setEditSiteImages(editSiteImages.filter(p => p !== path))}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* New images to upload */}
                  {newSiteImages.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                      {newSiteImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.preview}
                            alt="New site"
                            className="w-full h-24 object-cover rounded-lg border-2 border-amber-400"
                          />
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded">
                            New
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(img.preview);
                              setNewSiteImages(newSiteImages.filter(i => i.id !== img.id));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload new images */}
                  <div className="relative border-2 border-dashed rounded-xl p-4 text-center border-slate-300 hover:border-amber-400 bg-slate-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (!e.target.files) return;
                        const files = Array.from(e.target.files).map(file => ({
                          file,
                          id: crypto.randomUUID(),
                          preview: URL.createObjectURL(file),
                        }));
                        setNewSiteImages(prev => [...prev, ...files]);
                        e.target.value = '';
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-500">Add site photos</span>
                    </div>
                  </div>
                </div>

                {/* Save/Cancel buttons */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button onClick={handleSaveProject} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="ml-2">Save Changes</span>
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                    <X className="h-4 w-4" />
                    <span className="ml-2">Cancel</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{project.name}</h1>
                    <Badge className={`${getStatusColor(project.status)}`}>{project.status}</Badge>
                  </div>
                  {project.description && (
                    <p className="text-slate-600 mb-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Created {formatDate(project.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit Project
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDeleteProject} 
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weather Forecast Panel */}
        {project.address && (
          <div className="mb-6">
            <WeatherWidget 
              location={project.address} 
              showForecast={true}
              className="border-slate-200 bg-white"
            />
          </div>
        )}

        {/* Project Requirements Section */}
        {(project.trades?.length || project.manpower_requirements?.length || project.required_certifications?.length || siteImageUrls.length > 0 || teamInvitations.length > 0) && (
          <Card className="mb-6 border-slate-200 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Project Requirements & Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trades */}
              {project.trades && project.trades.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Briefcase className="h-4 w-4" />
                    Required Trades
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.trades.map((trade) => (
                      <Badge key={trade} variant="secondary">
                        {TRADE_LABELS[trade as ConstructionTrade] || trade}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Manpower Requirements */}
              {project.manpower_requirements && project.manpower_requirements.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Users className="h-4 w-4" />
                    Manpower Requirements
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {project.manpower_requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-600">
                          {TRADE_LABELS[req.trade as ConstructionTrade] || req.trade}
                        </span>
                        <Badge className="bg-amber-100 text-amber-700">{req.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Certifications */}
              {project.required_certifications && project.required_certifications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileCheck className="h-4 w-4" />
                    Required Certifications
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.required_certifications.map((cert, idx) => (
                      <Badge key={idx} variant="outline" className="border-emerald-200 text-emerald-700">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Site Images */}
              {siteImageUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Image className="h-4 w-4" />
                    Site Photos
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {siteImageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Site ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Quick Mode Summary - Full Detailed View */}
        {projectSummary && (
          <div className="mb-6">
            <ProjectSummary
              summaryId={projectSummary.id}
              projectId={projectId}
              onClose={() => navigate("/buildunion/workspace")}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Blueprint Analysis / M.E.S.S.A. - Mode and Tier Gated */}
          {projectMode === "solo" ? (
            // Solo Mode - Show unified card with team features + premium preview
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-amber-600" />
                    <div>
                      <CardTitle className="text-base font-medium text-slate-800">
                        Solo Mode Active
                      </CardTitle>
                      <CardDescription>
                        Switch to Team mode to unlock collaboration features
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Mode Toggle above progress bar - right aligned, text style */}
                <div className="flex justify-end">
                  <ProjectModeToggle
                    summaryId={projectSummary?.id}
                    projectId={projectId}
                    initialMode="solo"
                    onModeChange={(newMode) => setProjectMode(newMode)}
                    variant="text"
                  />
                </div>

                {/* Team Readiness Progress Indicator */}
                {(() => {
                  // Calculate readiness based on project data
                  const checks = [
                    { label: "Photo Estimate", done: !!projectSummary?.photo_estimate?.estimatedArea },
                    { label: "Line Items", done: Array.isArray(projectSummary?.line_items) && projectSummary.line_items.length > 0 },
                    { label: "Client Info", done: !!projectSummary?.client_name },
                    { label: "Quote Total", done: (projectSummary?.total_cost || 0) > 0 },
                    { label: "Pro Subscription", done: isPro },
                  ];
                  const completedCount = checks.filter(c => c.done).length;
                  const progressPercent = Math.round((completedCount / checks.length) * 100);
                  
                  return (
                    <div className="bg-white/80 rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-700">Team Mode Readiness</span>
                        <span className="text-xs font-bold text-amber-600">{progressPercent}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {checks.map((check, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                              check.done 
                                ? "bg-green-100 text-green-700" 
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {check.done ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full border border-current" />
                            )}
                            {check.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Team Mode Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-amber-100">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Documents</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-amber-100">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>Team & Tasks</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-amber-100">
                    <Brain className="w-4 h-4 text-amber-500" />
                    <span>AI Synthesis</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-amber-100">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <span>Team Map</span>
                  </div>
                </div>

                {/* Premium Features Section - Integrated */}
                {isPro && !isPremium && (
                  <>
                    <div className="border-t border-amber-200 pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <span className="font-medium text-slate-800">Premium Features</span>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Coming with Premium</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Direct Messaging
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Conflict Visualization
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Priority AI Responses
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Project Reports
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/buildunion/pricing")}
                        className="w-full mt-3 border-amber-300 text-amber-700 hover:bg-amber-50 gap-2"
                      >
                        <Crown className="w-4 h-4" />
                        Upgrade to Premium
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : !isPro ? (
            // Team Mode but no Pro subscription
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        Blueprint Team Project
                        <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white gap-1">
                          <Crown className="w-3 h-3" />
                          Pro
                        </Badge>
                      </CardTitle>
                      <CardDescription>M.E.S.S.A. dual-engine AI analysis</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Unlock advanced blueprint analysis with our dual-engine AI system. Upload PDF blueprints and documents for comprehensive project intelligence.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                        <Brain className="w-4 h-4 text-cyan-500" />
                        <span>Dual-Engine AI</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                        <FileText className="w-4 h-4 text-cyan-500" />
                        <span>PDF Blueprints</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                        <FileCheck className="w-4 h-4 text-cyan-500" />
                        <span>Verified Facts</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                        <Sparkles className="w-4 h-4 text-cyan-500" />
                        <span>Smart Analysis</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate("/buildunion/pricing")}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white gap-2"
                    >
                      <Crown className="w-4 h-4" />
                      Upgrade to Pro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-cyan-200 bg-white">
                {/* Blueprint Team Project Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          Blueprint Team Project
                          <Badge className="bg-white/20 text-white border-0 text-xs gap-1">
                            <Crown className="w-3 h-3" />
                            {isPremium ? "Premium" : "Pro"}
                          </Badge>
                        </h3>
                        <p className="text-white/80 text-xs">M.E.S.S.A. dual-engine AI • Gemini + GPT-5</p>
                      </div>
                    </div>
                    {showBlueprintPanel ? (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setShowBlueprintPanel(false)}
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setShowBlueprintPanel(true)}
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        Expand
                      </Button>
                    )}
                  </div>
                </div>

                {/* Collapsed State - Quick Summary */}
                {!showBlueprintPanel && (
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <button 
                        onClick={() => { setShowBlueprintPanel(true); setBlueprintTab("documents"); }}
                        className="text-center p-3 bg-slate-50 rounded-lg hover:bg-cyan-50 transition-colors cursor-pointer"
                      >
                        <FileText className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-slate-900">{documents.length}</div>
                        <div className="text-xs text-slate-500">Documents</div>
                      </button>
                      <button 
                        onClick={() => setShowStatsPopup(!showStatsPopup)}
                        className="text-center p-3 bg-slate-50 rounded-lg hover:bg-cyan-50 transition-colors cursor-pointer"
                      >
                        <Camera className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-slate-900">{siteImageUrls.length}</div>
                        <div className="text-xs text-slate-500">Site Photos</div>
                      </button>
                      <button 
                        onClick={() => { setShowBlueprintPanel(true); setBlueprintTab("facts"); }}
                        className="text-center p-3 bg-slate-50 rounded-lg hover:bg-cyan-50 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-slate-900">
                          {projectSummary?.verified_facts ? (projectSummary.verified_facts as any[]).length : 0}
                        </div>
                        <div className="text-xs text-slate-500">Operational Truth</div>
                      </button>
                    </div>
                    
                    {/* Stats Popup */}
                    {showStatsPopup && (
                      <div className="mb-4 p-4 bg-white border border-cyan-200 rounded-lg shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-cyan-500" />
                            Project Stats
                          </h4>
                          <button onClick={() => setShowStatsPopup(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Documents</span>
                            <span className="font-medium text-slate-900">{documents.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Site Photos</span>
                            <span className="font-medium text-slate-900">{siteImageUrls.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Total Files</span>
                            <span className="font-medium text-slate-900">{documents.length + siteImageUrls.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Total Size</span>
                            <span className="font-medium text-slate-900">
                              {documents.reduce((acc, d) => acc + (d.file_size || 0), 0) > 0 
                                ? formatFileSize(documents.reduce((acc, d) => acc + (d.file_size || 0), 0))
                                : 'No files'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Status</span>
                            <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-2"
                      onClick={() => setShowBlueprintPanel(true)}
                    >
                      <Brain className="w-4 h-4" />
                      Open Blueprint Team Project
                    </Button>
                  </CardContent>
                )}

                {/* Expanded State - Full M.E.S.S.A. Interface */}
                {showBlueprintPanel && (
                  <CardContent className="p-0">
                    {/* Analysis Tabs */}
                    <div className="border-b border-slate-200 overflow-x-auto">
                      <div className="flex min-w-max">
                        {/* AI Synthesis - First (Core Intelligence Hub) */}
                        <button
                          onClick={() => handleTabClick("ai", "pro")}
                          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                            blueprintTab === "ai" 
                              ? "text-cyan-700 border-b-2 border-cyan-500 bg-cyan-50/50" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Brain className="w-4 h-4" />
                          AI Synthesis
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white">PRO</span>
                        </button>
                        {/* Documents */}
                        <button
                          onClick={() => handleTabClick("documents", "pro")}
                          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                            blueprintTab === "documents" 
                              ? "text-cyan-700 border-b-2 border-cyan-500 bg-cyan-50/50" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <FileUp className="w-4 h-4" />
                          Documents
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white">PRO</span>
                        </button>
                        {/* Team (includes Tasks) */}
                        <button
                          onClick={() => handleTabClick("team", "pro")}
                          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                            blueprintTab === "team" 
                              ? "text-cyan-700 border-b-2 border-cyan-500 bg-cyan-50/50" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          Team
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white">PRO</span>
                        </button>
                        {/* Requirements */}
                        <button
                          onClick={() => handleTabClick("requirements", "free")}
                          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                            blueprintTab === "requirements" 
                              ? "text-cyan-700 border-b-2 border-cyan-500 bg-cyan-50/50" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Briefcase className="w-4 h-4" />
                          Requirements
                        </button>
                        {/* Contracts */}
                        <button
                          onClick={() => handleTabClick("contracts", "free")}
                          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                            blueprintTab === "contracts" 
                              ? "text-cyan-700 border-b-2 border-cyan-500 bg-cyan-50/50" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <ScrollText className="w-4 h-4" />
                          Contracts
                        </button>
                        {/* Operational Truth (Facts) - Last */}
                        <button
                          onClick={() => handleTabClick("facts", "premium")}
                          className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                            blueprintTab === "facts" 
                              ? "text-cyan-700 border-b-2 border-cyan-500 bg-cyan-50/50" 
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Operational Truth
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white">PREMIUM</span>
                        </button>
                      </div>
                    </div>

                    {/* Upgrade Prompt Dialog */}
                    {showUpgradePrompt && (
                      <div className="p-6 bg-gradient-to-br from-slate-50 to-cyan-50/30 border-b">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                            showUpgradePrompt === "premium" 
                              ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/20" 
                              : "bg-gradient-to-br from-cyan-400 to-blue-500 shadow-cyan-500/20"
                          }`}>
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">
                              {showUpgradePrompt === "premium" ? "Premium Feature" : "Pro Feature"}
                            </h4>
                            <p className="text-sm text-slate-600 mt-1">
                              {showUpgradePrompt === "premium" 
                                ? "Verified Facts and advanced analytics are available with Premium. Get dual-engine AI verification and comprehensive project insights."
                                : "This feature requires a Pro subscription. Unlock AI Analysis, Document Management, Team Collaboration, and Task Assignment."}
                            </p>
                            <div className="flex items-center gap-3 mt-4">
                              <Button
                                onClick={() => navigate("/buildunion/pricing")}
                                className={`gap-2 ${
                                  showUpgradePrompt === "premium"
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                                } text-white`}
                              >
                                <Crown className="w-4 h-4" />
                                Upgrade to {showUpgradePrompt === "premium" ? "Premium" : "Pro"}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setShowUpgradePrompt(null)}
                              >
                                Maybe Later
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab Content */}
                    <div className="min-h-[500px]">
                      {blueprintTab === "ai" && (
                        <div className="p-4">
                          {/* Back button */}
                          <div className="flex justify-start mb-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlueprintTab("contracts")}
                              className="gap-2 text-slate-600 hover:text-slate-900"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Back
                            </Button>
                          </div>
                          <ProjectAIPanel
                            projectId={project.id}
                            projectName={project.name}
                            projectAddress={project.address}
                            userId={user.id}
                            documents={documents}
                            siteImages={project.site_images || []}
                            projectSummary={projectSummary}
                            projectContracts={projectContracts.map(c => ({
                              id: c.id,
                              contract_number: c.contract_number,
                              status: c.status,
                              total_amount: c.total_amount,
                              start_date: c.start_date,
                              estimated_end_date: c.estimated_end_date,
                              created_at: c.contract_date
                            }))}
                            tasks={projectTasks.map(t => ({
                              id: t.id,
                              title: t.title,
                              status: t.status,
                              due_date: t.due_date,
                              priority: t.priority,
                              assigned_to: t.assigned_to
                            }))}
                            isOwner={project.user_id === user.id}
                            isPremium={isPremium}
                            onTabChange={(tab) => setBlueprintTab(tab)}
                          />
                          {/* Continue to Facts */}
                          <div className="flex justify-end mt-6">
                            <Button
                              onClick={() => setBlueprintTab("facts")}
                              className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
                            >
                              Continue
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {blueprintTab === "documents" && (
                        <div className="p-4">
                          <ProjectDocuments
                            projectId={project.id}
                            userId={user.id}
                            documents={documents}
                            onDocumentsChange={setDocuments}
                            isOwner={project.user_id === user.id}
                          />
                          {/* Continue to Requirements */}
                          <div className="flex justify-end mt-6">
                            <Button
                              onClick={() => setBlueprintTab("requirements")}
                              className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
                            >
                              Continue
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {blueprintTab === "requirements" && (
                        <div className="p-4">
                          {/* Back button */}
                          <div className="flex justify-start mb-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlueprintTab("documents")}
                              className="gap-2 text-slate-600 hover:text-slate-900"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Back
                            </Button>
                          </div>
                          <RequirementsTab 
                            project={project}
                            onProjectUpdate={setProject}
                            TRADE_LABELS={TRADE_LABELS}
                          />
                          {/* Continue to Contracts */}
                          <div className="flex justify-end mt-6">
                            <Button
                              onClick={() => setBlueprintTab("contracts")}
                              className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
                            >
                              Continue
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {blueprintTab === "team" && (
                        <div className="p-4 space-y-6">
                          {/* Team Management */}
                          <TeamManagement projectId={project.id} isOwner={project.user_id === user.id} />
                          
                          {/* Task Assignment - Integrated */}
                          <div className="border-t border-slate-200 pt-6">
                            <TaskAssignment projectId={project.id} isOwner={project.user_id === user.id} projectAddress={project.address || undefined} />
                          </div>
                        </div>
                      )}

                      {blueprintTab === "facts" && (
                        <div className="p-4">
                          {/* Back button */}
                          <div className="flex justify-start mb-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlueprintTab("ai")}
                              className="gap-2 text-slate-600 hover:text-slate-900"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Back
                            </Button>
                          </div>
                          {/* Summary Card */}
                          <OperationalTruthSummaryCard 
                            facts={projectSummary?.verified_facts as any[] || []} 
                          />
                          
                          {/* Verified Facts from M.E.S.S.A. */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-500" />
                                Operational Truth
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {projectSummary?.verified_facts ? (projectSummary.verified_facts as any[]).length : 0} facts
                              </Badge>
                            </div>
                            
                            {projectSummary?.verified_facts && (projectSummary.verified_facts as any[]).length > 0 ? (
                              <div className="space-y-3">
                                {(projectSummary.verified_facts as any[]).map((fact: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                                        <FileCheck className="w-3 h-3 text-cyan-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900">{fact.question || fact.title || `Fact ${idx + 1}`}</p>
                                        <p className="text-sm text-slate-600 mt-1">{fact.answer || fact.value || fact.content}</p>
                                        {fact.verification_status && (
                                          <Badge 
                                            variant="outline" 
                                            className={`mt-2 text-xs ${
                                              fact.verification_status === "verified" 
                                                ? "border-green-300 text-green-700 bg-green-50" 
                                                : "border-amber-300 text-amber-700 bg-amber-50"
                                            }`}
                                          >
                                            {fact.verification_status === "verified" ? "✓ Verified" : "⚠ Unverified"}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-700">No verified facts yet</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Use the AI Analysis tab to extract and verify project facts
                                </p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-4 gap-2"
                                  onClick={() => setBlueprintTab("ai")}
                                >
                                  <Brain className="w-4 h-4" />
                                  Start AI Analysis
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {blueprintTab === "contracts" && (
                        <div className="p-4">
                          {/* Back button */}
                          <div className="flex justify-start mb-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlueprintTab("requirements")}
                              className="gap-2 text-slate-600 hover:text-slate-900"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Back
                            </Button>
                          </div>
                          <ContractHistory 
                            projectId={project.id} 
                            showTitle={false}
                            onNavigateToAI={() => setBlueprintTab("ai")}
                            templateItems={projectSummary?.template_items as any[] || []}
                            onContractSaved={refreshContracts}
                            projectData={{
                              name: project.name,
                              address: project.address || undefined,
                              description: project.description || undefined,
                              totalAmount: projectSummary?.total_cost || 0,
                              scopeOfWork: project.description || undefined,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    );
  };

export default BuildUnionProjectDetails;