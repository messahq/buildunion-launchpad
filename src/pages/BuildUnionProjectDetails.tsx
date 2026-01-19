import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import TeamManagement from "@/components/TeamManagement";
import TaskAssignment from "@/components/TaskAssignment";
import ProjectDocuments from "@/components/ProjectDocuments";
import ProjectAIPanel from "@/components/ProjectAIPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, FileText, Calendar, Loader2, Plus, Trash2,
  AlertCircle, Sparkles,
  Pencil, X, Check,
  Users, Image, FileCheck, Briefcase, MapPin,
  Camera, DollarSign, Package
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const BuildUnionProjectDetails = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [siteImageUrls, setSiteImageUrls] = useState<string[]>([]);
  const [projectSummary, setProjectSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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

            </CardContent>
          </Card>
        )}

        {/* Team Management Card - Only visible to owner */}
        {project && user && project.user_id === user.id && (
          <div className="space-y-6">
            <TeamManagement projectId={project.id} isOwner={true} />
            <TaskAssignment projectId={project.id} isOwner={true} />
          </div>
        )}

        {/* Team Members Card - Visible to non-owners */}
        {project && user && project.user_id !== user.id && (
          <div className="space-y-6">
            <TeamManagement projectId={project.id} isOwner={false} />
            <TaskAssignment projectId={project.id} isOwner={false} />
          </div>
        )}

        {/* Quick Mode Summary - Shows data from Quick Mode flow */}
        {projectSummary && (
          <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Quick Mode Estimate
                  </CardTitle>
                  <CardDescription>
                    Created from Quick Mode flow
                  </CardDescription>
                </div>
                <Badge className="ml-auto bg-green-100 text-green-700 border-green-200">
                  ✓ Saved
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Estimate Results */}
              {projectSummary.photo_estimate?.materials?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Camera className="h-4 w-4 text-amber-600" />
                    AI Photo Analysis
                    {projectSummary.photo_estimate?.areaConfidence && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {projectSummary.photo_estimate.areaConfidence} confidence
                      </Badge>
                    )}
                  </div>
                  <div className="bg-white rounded-lg border border-green-100 p-4">
                    {projectSummary.photo_estimate.summary && (
                      <p className="text-sm text-slate-600 mb-3">{projectSummary.photo_estimate.summary}</p>
                    )}
                    <div className="grid gap-2">
                      {projectSummary.photo_estimate.materials.map((mat: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2">
                          <span className="text-sm font-medium">{mat.item}</span>
                          <Badge variant="secondary">{mat.quantity} {mat.unit}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items from Quote */}
              {projectSummary.line_items?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Package className="h-4 w-4 text-blue-600" />
                    Line Items ({projectSummary.line_items.length})
                  </div>
                  <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                          <th className="text-center py-2 px-3 font-medium text-slate-600">Qty</th>
                          <th className="text-center py-2 px-3 font-medium text-slate-600">Unit</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-600">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectSummary.line_items.slice(0, 5).map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-50">
                            <td className="py-2 px-3">{item.name || item.description}</td>
                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-center">{item.unit}</td>
                            <td className="py-2 px-3 text-right">${(item.unit_price || item.unitPrice || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {projectSummary.line_items.length > 5 && (
                      <div className="text-center py-2 text-xs text-slate-500">
                        +{projectSummary.line_items.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client Info */}
              {(projectSummary.client_name || projectSummary.client_email) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Users className="h-4 w-4 text-purple-600" />
                    Client Information
                  </div>
                  <div className="bg-white rounded-lg border border-green-100 p-4">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      {projectSummary.client_name && (
                        <div>
                          <span className="text-slate-500">Name:</span>{" "}
                          <span className="font-medium">{projectSummary.client_name}</span>
                        </div>
                      )}
                      {projectSummary.client_email && (
                        <div>
                          <span className="text-slate-500">Email:</span>{" "}
                          <span className="font-medium">{projectSummary.client_email}</span>
                        </div>
                      )}
                      {projectSummary.client_phone && (
                        <div>
                          <span className="text-slate-500">Phone:</span>{" "}
                          <span className="font-medium">{projectSummary.client_phone}</span>
                        </div>
                      )}
                      {projectSummary.client_address && (
                        <div>
                          <span className="text-slate-500">Address:</span>{" "}
                          <span className="font-medium">{projectSummary.client_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Totals */}
              {(projectSummary.total_cost > 0 || projectSummary.material_cost > 0) && (
                <div className="bg-white rounded-lg border border-green-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Total Estimate</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      ${(projectSummary.total_cost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {projectSummary.notes && (
                <div className="text-sm text-slate-600 bg-white rounded-lg border border-green-100 p-3">
                  <span className="font-medium">Notes: </span>
                  {projectSummary.notes}
                </div>
              )}

              {/* View Full Summary Button */}
              <Button 
                variant="outline" 
                className="w-full gap-2 border-green-200 hover:bg-green-50"
                onClick={() => navigate(`/buildunion/summary?summaryId=${projectSummary.id}`)}
              >
                <FileText className="h-4 w-4" />
                View Full Summary & Edit
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Documents Column */}
          <div className="space-y-6">
            <ProjectDocuments
              projectId={project.id}
              userId={user.id}
              documents={documents}
              onDocumentsChange={setDocuments}
              isOwner={project.user_id === user.id}
            />

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
                  <span className="text-sm text-slate-500">Site Photos</span>
                  <span className="text-sm font-medium text-slate-900">{siteImageUrls.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total Files</span>
                  <span className="text-sm font-medium text-slate-900">{documents.length + siteImageUrls.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total Size</span>
                  <span className="text-sm font-medium text-slate-900">
                    {documents.reduce((acc, d) => acc + (d.file_size || 0), 0) > 0 
                      ? formatFileSize(documents.reduce((acc, d) => acc + (d.file_size || 0), 0))
                      : siteImageUrls.length > 0 
                        ? `${siteImageUrls.length} image${siteImageUrls.length !== 1 ? 's' : ''}`
                        : 'No files'}
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

          {/* M.E.S.S.A. Analysis Column */}
          <ProjectAIPanel
            projectId={project.id}
            projectName={project.name}
            userId={user.id}
            documents={documents}
            siteImages={project.site_images || []}
            projectSummary={projectSummary}
            isOwner={project.user_id === user.id}
            isPremium={false}
          />
        </div>
      </div>
    </main>
  );
};

export default BuildUnionProjectDetails;