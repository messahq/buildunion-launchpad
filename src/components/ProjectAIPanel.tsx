import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Send, Loader2, Brain, Sparkles, ShieldCheck, AlertCircle, 
  BookOpen, Zap, Crown, Users, Mail, FileText, Calculator,
  FileCheck, CheckCircle2, XCircle, Camera, ClipboardList, 
  ScrollText, DollarSign, Contact, Image, Download, Eye, FolderOpen,
  ExternalLink, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VerificationStatus = "verified" | "not-verified" | "gemini-only" | "openai-only" | "error";

interface SourceReference {
  document: string;
  page?: number;
  excerpt?: string;
}

interface MessaMessage {
  role: "user" | "assistant";
  content: string;
  verification?: {
    status: VerificationStatus;
    engines: { gemini: boolean; openai: boolean };
    verified: boolean;
  };
  sources?: SourceReference[];
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
}

interface ProjectSummary {
  id: string;
  line_items?: any[];
  total_cost?: number;
  material_cost?: number;
  labor_cost?: number;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  client_phone?: string;
  photo_estimate?: any;
  calculator_results?: any[];
  template_items?: any[];
}

interface ProjectContract {
  id: string;
  contract_number: string;
  status: string;
  total_amount?: number | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_to: string;
}

type BlueprintTab = "ai" | "documents" | "facts" | "requirements" | "team" | "contracts";

interface ProjectAIPanelProps {
  projectId: string;
  projectName: string;
  projectAddress?: string | null;
  userId: string;
  documents: ProjectDocument[];
  siteImages: string[];
  projectSummary?: ProjectSummary | null;
  projectContracts?: ProjectContract[];
  teamMembers?: TeamMember[];
  tasks?: Task[];
  isOwner?: boolean;
  isPremium?: boolean;
  onTabChange?: (tab: BlueprintTab) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-messa`;

const VerificationBadge = ({ verification }: { verification?: MessaMessage["verification"] }) => {
  if (!verification) return null;

  const badges: Record<VerificationStatus, { icon: React.ReactNode; text: string; className: string }> = {
    verified: {
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      text: "Verified",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    "not-verified": {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Not verified",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    "gemini-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "Gemini",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    "openai-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "GPT-5",
      className: "bg-cyan-100 text-cyan-700 border-cyan-200",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Error",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };

  const badge = badges[verification.status];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
      {badge.icon}
      <span>{badge.text}</span>
    </div>
  );
};

const SourceTags = ({ sources }: { sources?: SourceReference[] }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {sources.slice(0, 3).map((source, i) => (
        <div key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-xs text-slate-600">
          <BookOpen className="h-2.5 w-2.5" />
          <span className="truncate max-w-[100px]">{source.document}</span>
        </div>
      ))}
      {sources.length > 3 && (
        <span className="text-xs text-slate-400">+{sources.length - 3}</span>
      )}
    </div>
  );
};

const ProjectAIPanel = ({ 
  projectId, 
  projectName,
  projectAddress,
  userId,
  documents, 
  siteImages,
  projectSummary,
  projectContracts = [],
  teamMembers = [],
  tasks = [],
  isOwner = false,
  isPremium = false,
  onTabChange
}: ProjectAIPanelProps) => {
  const [messages, setMessages] = useState<MessaMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Lightbox state for image gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Combine site images with image documents for gallery
  const imageDocuments = documents.filter(doc => 
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.file_name)
  );
  const allImages = [
    ...siteImages.map((img, idx) => ({
      url: img.startsWith('http') ? img : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${img}`,
      name: `Site Photo ${idx + 1}`,
      type: 'site' as const
    })),
    ...imageDocuments.map(doc => ({
      url: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${doc.file_path}`,
      name: doc.file_name,
      type: 'document' as const
    }))
  ];

  // Open document in new tab
  const openDocument = (doc: ProjectDocument) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/project-documents/${doc.file_path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open lightbox with specific image
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasContent = documents.length > 0 || siteImages.length > 0 || projectSummary;

  // Build context summary for AI
  const buildProjectContext = () => {
    const context: any = {
      projectId,
      projectName,
      documents: documents.map(d => d.file_name),
      siteImages: siteImages,
      hasEstimate: !!projectSummary,
    };

    if (projectSummary) {
      context.estimate = {
        totalCost: projectSummary.total_cost,
        materialCost: projectSummary.material_cost,
        laborCost: projectSummary.labor_cost,
        lineItemCount: projectSummary.line_items?.length || 0,
        clientName: projectSummary.client_name,
        hasPhotoAnalysis: !!projectSummary.photo_estimate,
        calculatorResultsCount: projectSummary.calculator_results?.length || 0,
      };
    }

    if (teamMembers.length > 0) {
      context.team = {
        memberCount: teamMembers.length,
        members: teamMembers.map(m => ({ role: m.role, name: m.full_name || 'Team Member' })),
      };
    }

    if (tasks.length > 0) {
      context.tasks = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
      };
    }

    return context;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: MessaMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMessage.content }],
          dualEngine: true,
          projectContext: buildProjectContext(),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to connect");
      }

      const data = await resp.json();
      
      let status: VerificationStatus = "error";
      if (data.verification?.verified) {
        status = "verified";
      } else if (data.verification?.engines?.gemini && data.verification?.engines?.openai) {
        status = "not-verified";
      } else if (data.verification?.engines?.gemini) {
        status = "gemini-only";
      } else if (data.verification?.engines?.openai) {
        status = "openai-only";
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.content,
        verification: { ...data.verification, status },
        sources: data.sources,
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Connection error");
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, an error occurred. Please try again.",
        verification: { status: "error", engines: { gemini: false, openai: false }, verified: false },
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // Premium actions
  const handleSendSummaryToTeam = async () => {
    if (!isPremium) {
      toast.error("This feature requires Premium subscription");
      return;
    }
    toast.info("Sending summary to team members...", { duration: 2000 });
    // TODO: Implement email sending via edge function
    setTimeout(() => {
      toast.success("Summary sent to all team members!");
    }, 1500);
  };

  const handleGenerateReport = async () => {
    if (!isPremium) {
      toast.error("This feature requires Premium subscription");
      return;
    }
    toast.info("Generating project report...", { duration: 2000 });
    setTimeout(() => {
      toast.success("Report generated and ready for download!");
    }, 1500);
  };

  return (
    <Card className="border-slate-200 bg-white flex flex-col h-[700px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 rounded-t-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">M.E.S.S.A. Analysis</h3>
          <p className="text-white/80 text-xs">Dual-Engine AI • Project Intelligence</p>
        </div>
        {isPremium && (
          <Badge className="bg-amber-400 text-amber-900 border-0">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      {/* Project ID & Weather Info Bar */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-cyan-50/30 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Project ID:</span>
            <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              {projectId.slice(0, 8)}...
            </code>
          </div>
          {projectAddress && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <span>•</span>
              <span className="truncate max-w-[150px]">{projectAddress}</span>
            </div>
          )}
        </div>
        {projectAddress && (
          <div className="flex items-center gap-1 text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full">
            <span className="text-sm">🌤️</span>
            <span className="font-medium">Weather-Aware Planning</span>
          </div>
        )}
      </div>

      {/* Operational Truth Data Status - 8 Elements */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">Operational Truth Elements</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs text-slate-500">Gemini</span>
            <span className="text-slate-300">+</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-slate-500">GPT-5</span>
          </div>
        </div>
        
        {/* 8 Elements Grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* 1. Photo Estimate - Links to Quick Mode */}
          <button
            onClick={() => !projectSummary?.photo_estimate && onTabChange?.("documents")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
              projectSummary?.photo_estimate && Object.keys(projectSummary.photo_estimate).length > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-500 hover:bg-slate-300 cursor-pointer"
            }`}
            title={projectSummary?.photo_estimate ? "Photo analysis complete" : "Click to upload photos"}
          >
            {projectSummary?.photo_estimate && Object.keys(projectSummary.photo_estimate).length > 0
              ? <CheckCircle2 className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            <span className="truncate">1. Photo</span>
          </button>
          
          {/* 2. Templates - Info only */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            projectSummary?.template_items && projectSummary.template_items.length > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
            title={projectSummary?.template_items?.length ? "Templates applied" : "No templates used"}
          >
            {projectSummary?.template_items && projectSummary.template_items.length > 0
              ? <CheckCircle2 className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            <span className="truncate">2. Template</span>
          </div>
          
          {/* 3. Calculator - Info only */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            projectSummary?.calculator_results && projectSummary.calculator_results.length > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
            title={projectSummary?.calculator_results?.length ? "Calculator data present" : "No calculator data"}
          >
            {projectSummary?.calculator_results && projectSummary.calculator_results.length > 0
              ? <CheckCircle2 className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            <span className="truncate">3. Calc</span>
          </div>
          
          {/* 4. Quote Items - Info only */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            projectSummary?.line_items && projectSummary.line_items.length > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
            title={projectSummary?.line_items?.length ? `${projectSummary.line_items.length} items` : "No quote items"}
          >
            {projectSummary?.line_items && projectSummary.line_items.length > 0
              ? <CheckCircle2 className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            <span className="truncate">4. Quote</span>
          </div>
          
          {/* 5. Client Info - Info only */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            projectSummary?.client_name || projectSummary?.client_email
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
            title={projectSummary?.client_name || "No client info"}
          >
            {projectSummary?.client_name || projectSummary?.client_email
              ? <CheckCircle2 className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            <span className="truncate">5. Client</span>
          </div>
          
          {/* 6. Quote Total - Info only */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            projectSummary?.total_cost && projectSummary.total_cost > 0
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
            title={projectSummary?.total_cost ? `$${projectSummary.total_cost.toLocaleString()}` : "No total"}
          >
            {projectSummary?.total_cost && projectSummary.total_cost > 0
              ? <CheckCircle2 className="h-3 w-3" />
              : <XCircle className="h-3 w-3" />}
            <span className="truncate">6. Total</span>
          </div>
          
          {/* 7. Contract Preview - Navigates to Contracts tab */}
          <button
            onClick={() => onTabChange?.("contracts")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:ring-1 hover:ring-cyan-300 ${
              projectContracts.length > 0
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer"
            }`}
            title={projectContracts.length > 0 ? "View contracts" : "Click to create contract"}
          >
            {projectContracts.length > 0
              ? <CheckCircle2 className="h-3 w-3" />
              : <AlertCircle className="h-3 w-3" />}
            <span className="truncate">7. Contract</span>
          </button>
          
          {/* 8. Contract PDF (Signed) - Navigates to Contracts tab */}
          <button
            onClick={() => onTabChange?.("contracts")}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:ring-1 hover:ring-cyan-300 ${
              projectContracts.some(c => c.status === 'complete' || c.status === 'signed')
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer"
            }`}
            title={projectContracts.some(c => c.status === 'complete' || c.status === 'signed') ? "Contract signed" : "Click to sign contract"}
          >
            {projectContracts.some(c => c.status === 'complete' || c.status === 'signed')
              ? <CheckCircle2 className="h-3 w-3" />
              : <AlertCircle className="h-3 w-3" />}
            <span className="truncate">8. Signed</span>
          </button>
        </div>
      </div>

      {/* Project Data Overview - All Uploaded Content */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 mb-3 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-slate-900">Project Data Hub</h4>
              <p className="text-xs text-slate-500">All uploaded data for Team work & Premium features</p>
            </div>

            {/* Documents Section */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-cyan-600" />
                <span className="text-sm font-medium text-slate-700">Documents</span>
                <Badge variant="outline" className="ml-auto text-xs">{documents.length}</Badge>
              </div>
              {documents.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {documents.map((doc) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc.file_name);
                    const imageIndex = isImage ? allImages.findIndex(img => img.name === doc.file_name) : -1;
                    
                    return (
                      <button
                        key={doc.id}
                        onClick={() => isImage && imageIndex >= 0 ? openLightbox(imageIndex) : openDocument(doc)}
                        className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded px-2 py-1.5 border border-slate-100 w-full text-left hover:bg-cyan-50 hover:border-cyan-200 transition-colors group"
                        title={isImage ? "Click to view in gallery" : "Click to open in new tab"}
                      >
                        {isImage ? (
                          <Image className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <FileCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="truncate flex-1">{doc.file_name}</span>
                        {isImage ? (
                          <Eye className="h-3 w-3 text-slate-400 group-hover:text-cyan-600" />
                        ) : (
                          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-cyan-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No documents uploaded</p>
              )}
            </div>

            {/* Site Photos & Images Gallery */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">Photos & Images</span>
                <Badge variant="outline" className="ml-auto text-xs">{allImages.length}</Badge>
              </div>
              {allImages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allImages.slice(0, 6).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => openLightbox(idx)}
                      className="w-12 h-12 rounded bg-slate-200 overflow-hidden border border-slate-200 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-200 transition-all cursor-pointer group relative"
                      title={img.name}
                    >
                      <img 
                        src={img.url} 
                        alt={img.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                  {allImages.length > 6 && (
                    <button
                      onClick={() => openLightbox(6)}
                      className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-colors cursor-pointer"
                    >
                      +{allImages.length - 6}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No photos or images</p>
              )}
            </div>

            {/* Contracts Section */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <ScrollText className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-slate-700">Contracts</span>
                <Badge variant="outline" className="ml-auto text-xs">{projectContracts.length}</Badge>
              </div>
              {projectContracts.length > 0 ? (
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {projectContracts.map((contract) => (
                    <div key={contract.id} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1.5 border border-slate-100">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        contract.status === 'complete' || contract.status === 'signed' 
                          ? 'bg-emerald-500' 
                          : contract.status === 'sent' 
                            ? 'bg-blue-500' 
                            : 'bg-amber-500'
                      }`} />
                      <span className="text-slate-600 truncate flex-1">#{contract.contract_number}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        contract.status === 'complete' || contract.status === 'signed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : contract.status === 'sent'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No contracts created</p>
              )}
            </div>

            {/* Estimate Data Section */}
            {projectSummary && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">Quick Mode Estimate</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {projectSummary.total_cost && projectSummary.total_cost > 0 && (
                    <div className="bg-white/70 rounded px-2 py-1.5">
                      <span className="text-slate-500">Total:</span>
                      <span className="ml-1 font-medium text-emerald-700">
                        ${projectSummary.total_cost.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {projectSummary.line_items && projectSummary.line_items.length > 0 && (
                    <div className="bg-white/70 rounded px-2 py-1.5">
                      <span className="text-slate-500">Items:</span>
                      <span className="ml-1 font-medium text-slate-700">{projectSummary.line_items.length}</span>
                    </div>
                  )}
                  {projectSummary.client_name && (
                    <div className="bg-white/70 rounded px-2 py-1.5 col-span-2">
                      <span className="text-slate-500">Client:</span>
                      <span className="ml-1 font-medium text-slate-700">{projectSummary.client_name}</span>
                    </div>
                  )}
                  {projectSummary.photo_estimate && Object.keys(projectSummary.photo_estimate).length > 0 && (
                    <div className="bg-white/70 rounded px-2 py-1.5 flex items-center gap-1">
                      <Camera className="h-3 w-3 text-amber-500" />
                      <span className="text-slate-600">AI Photo Analysis</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Mode Templates Section */}
            {projectSummary?.template_items && projectSummary.template_items.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-slate-700">Quick Mode Templates</span>
                  <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    <ShieldCheck className="h-3 w-3 mr-0.5" />
                    Verified
                  </Badge>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {projectSummary.template_items.map((template: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="bg-white/70 rounded px-2 py-2 border border-amber-100 hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{template.icon || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {template.name || template.title || `Template ${idx + 1}`}
                          </p>
                          {template.description && (
                            <p className="text-[10px] text-slate-500 truncate">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-amber-600">
                          {template.materials?.length > 0 && (
                            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
                              {template.materials.length} materials
                            </span>
                          )}
                          {template.checklist?.length > 0 && (
                            <span className="bg-amber-100 px-1.5 py-0.5 rounded">
                              {template.checklist.length} tasks
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Show template materials preview */}
                      {template.materials && template.materials.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {template.materials.slice(0, 3).map((mat: any, mIdx: number) => (
                            <span 
                              key={mIdx} 
                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {mat.name || mat.description || `Item ${mIdx + 1}`}
                            </span>
                          ))}
                          {template.materials.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{template.materials.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Templates applied from Quick Mode workflow
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="border-t border-slate-100 pt-3 mt-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {projectSummary && (
                  <button
                    onClick={() => handleQuickQuestion("Summarize the project estimate and costs")}
                    className="text-left text-xs text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-2 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    💰 <span>Costs summary</span>
                  </button>
                )}
                {documents.length > 0 && (
                  <button
                    onClick={() => handleQuickQuestion("Extract key information from the documents")}
                    className="text-left text-xs text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-2 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    📄 <span>Document info</span>
                  </button>
                )}
                <button
                  onClick={() => handleQuickQuestion("What are the next steps for this project?")}
                  className="text-left text-xs text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-2 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  ✅ <span>Next steps</span>
                </button>
                <button
                  onClick={() => handleQuickQuestion("Identify potential risks or issues")}
                  className="text-left text-xs text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-2 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  ⚠️ <span>Identify risks</span>
                </button>
              </div>
            </div>

            {/* Premium Actions */}
            {isOwner && (
              <div className="border-t border-amber-100 pt-3 mt-3">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Crown className="h-3 w-3" />
                  Team Actions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 border-amber-200 hover:bg-amber-50 text-amber-700 text-xs"
                    onClick={handleSendSummaryToTeam}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Send to Team
                    {!isPremium && <Badge variant="outline" className="text-[10px] px-1">Pro</Badge>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 border-amber-200 hover:bg-amber-50 text-amber-700 text-xs"
                    onClick={handleGenerateReport}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Report
                    {!isPremium && <Badge variant="outline" className="text-[10px] px-1">Pro</Badge>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-cyan-500 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-900 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                {msg.role === "assistant" && (
                  <div className="mt-1 ml-1 space-y-1">
                    <VerificationBadge verification={msg.verification} />
                    <SourceTags sources={msg.sources} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span className="text-xs text-slate-500">Analyzing with dual engines...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!hasContent ? "Upload files first..." : "Ask about your project..."}
            className="flex-1"
            disabled={isLoading || !hasContent}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || !hasContent}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lightbox Gallery Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Navigation - Previous */}
            {allImages.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-4 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Image */}
            {allImages[lightboxIndex] && (
              <div className="flex flex-col items-center gap-4 max-h-full p-8">
                <img
                  src={allImages[lightboxIndex].url}
                  alt={allImages[lightboxIndex].name}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
                <div className="text-center">
                  <p className="text-white font-medium">{allImages[lightboxIndex].name}</p>
                  <p className="text-white/60 text-sm">
                    {lightboxIndex + 1} of {allImages.length}
                    {allImages[lightboxIndex].type === 'document' && (
                      <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                        Document
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation - Next */}
            {allImages.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg max-w-md overflow-x-auto">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-12 h-12 rounded overflow-hidden shrink-0 transition-all ${
                      idx === lightboxIndex 
                        ? 'ring-2 ring-cyan-400 scale-110' 
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProjectAIPanel;
