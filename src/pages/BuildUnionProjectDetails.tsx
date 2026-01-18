import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, FileText, Calendar, Loader2, Download, Trash2, 
  Brain, AlertCircle, Clock, Sparkles,
  Pencil, X, Check, ShieldCheck, Send, Zap, BookOpen,
  Users, Mail, Image, FileCheck, Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TRADE_LABELS, ConstructionTrade } from "@/hooks/useBuProfile";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-messa`;

const VerificationBadge = ({ verification }: { verification?: MessaMessage["verification"] }) => {
  if (!verification) return null;

  const badges: Record<VerificationStatus, { icon: React.ReactNode; text: string; className: string }> = {
    verified: {
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      text: "Operational Truth Verified",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    "not-verified": {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Could not be verified",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    "gemini-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "Gemini Response",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    "openai-only": {
      icon: <Zap className="h-3.5 w-3.5" />,
      text: "OpenAI Response",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: "Processing Error",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };

  const badge = badges[verification.status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
      {badge.icon}
      <span>{badge.text}</span>
    </div>
  );
};

const SourceTags = ({ sources }: { sources?: SourceReference[] }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((source, i) => (
        <div key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
          <BookOpen className="h-3 w-3" />
          <span>{source.document}</span>
          {source.page && <span className="text-slate-400">• p.{source.page}</span>}
        </div>
      ))}
    </div>
  );
};

const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [siteImageUrls, setSiteImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<MessaMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

        // Fetch team invitations
        const { data: inviteData, error: inviteError } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (!inviteError) {
          setTeamInvitations(inviteData || []);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleSaveProject = async () => {
    if (!project || !editName.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
        })
        .eq("id", project.id);

      if (error) throw error;

      setProject({
        ...project,
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
      });
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
    }
    setIsEditing(false);
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) return;

    try {
      // Delete associated documents from storage
      if (documents.length > 0) {
        const paths = documents.map(d => d.file_path);
        await supabase.storage.from("project-documents").remove(paths);
      }

      // Delete site images from storage
      if (project.site_images && project.site_images.length > 0) {
        await supabase.storage.from("project-documents").remove(project.site_images);
      }

      // Delete team invitations
      await supabase.from("team_invitations").delete().eq("project_id", project.id);

      // Delete project documents records
      await supabase.from("project_documents").delete().eq("project_id", project.id);

      // Delete project
      const { error } = await supabase.from("projects").delete().eq("id", project.id);

      if (error) throw error;

      toast.success("Project deleted");
      navigate("/buildunion/workspace");
    } catch (error) {
      console.error("Delete project error:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("project-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;

    try {
      await supabase.storage.from("project-documents").remove([doc.file_path]);

      const { error } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Document deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  // M.E.S.S.A. Chat functions
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: MessaMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const documentNames = documents.map(d => d.file_name);
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMessage.content }],
          dualEngine: true,
          projectContext: {
            projectId,
            projectName: project?.name,
            documents: documentNames,
          },
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to connect to Messa");
      }

      const data = await resp.json();
      
      // Determine verification status based on consensus
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
        content: data.verification?.verified 
          ? data.content 
          : status === "not-verified"
            ? "Information could not be verified by both engines. Please check the source documents manually."
            : data.content,
        verification: {
          ...data.verification,
          status,
        },
        sources: data.sources,
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Connection error");
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
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

  if (loading) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <BuildUnionHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <BuildUnionHeader />
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Project not found</h2>
          <Button onClick={() => navigate("/buildunion/workspace")} variant="outline">
            Back to Workspace
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader />

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
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Project Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Project name"
                    className="max-w-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Project description"
                    className="max-w-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveProject} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="ml-2">Save</span>
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
                <div className="flex gap-2">
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

              {/* Team Invitations */}
              {teamInvitations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4" />
                    Team Invitations ({teamInvitations.length})
                  </div>
                  <div className="space-y-2">
                    {teamInvitations.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{invite.email}</span>
                        </div>
                        <Badge 
                          className={
                            invite.status === 'pending' 
                              ? 'bg-amber-100 text-amber-700' 
                              : invite.status === 'accepted'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }
                        >
                          {invite.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Documents Column */}
          <div className="space-y-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Documents
                    </CardTitle>
                    <CardDescription>
                      {documents.length} file{documents.length !== 1 ? "s" : ""} uploaded
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatFileSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Stats */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Project Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Documents</span>
                  <span className="text-sm font-medium text-slate-900">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total Size</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatFileSize(documents.reduce((acc, d) => acc + (d.file_size || 0), 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                    {project.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* M.E.S.S.A. Analysis Column - Embedded Chat */}
          <Card className="border-slate-200 bg-white flex flex-col h-[700px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-3 rounded-t-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">M.E.S.S.A. Analysis</h3>
                <p className="text-white/80 text-xs">Dual-Engine AI • Document Analysis</p>
              </div>
            </div>

            {/* Dual-Engine Indicator */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-slate-600">Gemini Pro</span>
              </div>
              <div className="text-slate-300">+</div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-slate-600">GPT-5</span>
              </div>
              <div className="text-slate-300">=</div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-slate-600 font-medium">Verified</span>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {documents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <Brain className="h-12 w-12 text-slate-300 mb-4" />
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    Upload Documents First
                  </h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Upload project documents to enable AI analysis with dual-engine verification.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 mb-4 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    Ask About Your Documents
                  </h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">
                    I analyze your project documents using dual AI engines. Only verified information is shown.
                  </p>
                  {/* Quick Questions */}
                  <div className="space-y-2 w-full max-w-xs">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Quick Questions
                    </p>
                    <button
                      onClick={() => handleQuickQuestion("Summarize key project details from the documents")}
                      className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      📋 Summarize key project details
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Identify potential risks mentioned in documents")}
                      className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      ⚠️ Identify potential risks
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Extract timeline and milestones from the documents")}
                      className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      📅 Extract timeline & milestones
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Review budget and cost information")}
                      className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      💰 Review budget & costs
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
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
                        <div className="mt-1.5 ml-1 space-y-1">
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
                          <span className="text-xs text-slate-500">Verifying with dual engines...</span>
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
                  placeholder={documents.length === 0 ? "Upload documents first..." : "Ask about your documents..."}
                  className="flex-1"
                  disabled={isLoading || documents.length === 0 || !user}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading || documents.length === 0 || !user}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default BuildUnionProjectDetails;