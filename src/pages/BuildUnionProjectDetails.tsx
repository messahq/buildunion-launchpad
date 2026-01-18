import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, FileText, Calendar, Loader2, Download, Trash2, 
  Brain, MessageSquare, CheckCircle, AlertCircle, Clock, Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AskMessaChat from "@/components/AskMessaChat";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    const fetchProjectData = async () => {
      try {
        // Fetch project details
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

        setProject(projectData);

        // Fetch documents
        const { data: docsData, error: docsError } = await supabase
          .from("project_documents")
          .select("*")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false });

        if (docsError) throw docsError;
        setDocuments(docsData || []);
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [user, projectId, navigate]);

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
      // Delete from storage
      await supabase.storage.from("project-documents").remove([doc.file_path]);

      // Delete from database
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

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back Link */}
        <button
          onClick={() => navigate("/buildunion/workspace")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Workspace</span>
        </button>

        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
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

          {/* Ask M.E.S.S.A. Button */}
          <Button
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Ask M.E.S.S.A.
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Documents Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents Card */}
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
          </div>

          {/* M.E.S.S.A. Analysis Column */}
          <div className="space-y-6">
            {/* M.E.S.S.A. Analysis Card */}
            <Card className="border-slate-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-300 via-teal-300 to-amber-300 opacity-80" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    M.E.S.S.A. Analysis
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center py-6">
                    <Brain className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      Upload documents to enable AI analysis
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Analysis Status */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700">Analysis pending</span>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Quick Questions
                      </p>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                      >
                        📋 Summarize key project details
                      </button>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                      >
                        ⚠️ Identify potential risks
                      </button>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                      >
                        📅 Extract timeline & milestones
                      </button>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="w-full text-left text-sm text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-lg transition-colors"
                      >
                        💰 Review budget & costs
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Project Stats Card */}
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
        </div>
      </div>

      {/* M.E.S.S.A. Chat */}
      <AskMessaChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </main>
  );
};

export default BuildUnionProjectDetails;
