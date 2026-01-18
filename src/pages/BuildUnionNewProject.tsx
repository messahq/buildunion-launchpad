import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, X, FileText, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  id: string;
}

const BuildUnionNewProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === "application/pdf"
    );
    
    if (droppedFiles.length === 0) {
      toast.error("Only PDF files are allowed");
      return;
    }

    const newFiles = droppedFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type === "application/pdf"
    );

    if (selectedFiles.length === 0) {
      toast.error("Only PDF files are allowed");
      return;
    }

    const newFiles = selectedFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to create a project");
      navigate("/buildunion/login");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    if (files.length === 0) {
      toast.error("Please upload at least one PDF document");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Upload files to storage
      for (const uploadedFile of files) {
        const filePath = `${user.id}/${project.id}/${uploadedFile.id}-${uploadedFile.file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, uploadedFile.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // 3. Save document record
        await supabase.from("project_documents").insert({
          project_id: project.id,
          file_name: uploadedFile.file.name,
          file_path: filePath,
          file_size: uploadedFile.file.size,
        });
      }

      toast.success("Project created successfully!");
      navigate("/buildunion/workspace");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader />
      
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back Link */}
        <button
          onClick={() => navigate("/buildunion/workspace")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Workspace</span>
        </button>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl md:text-3xl font-display font-bold text-slate-900">
              Start New Project
            </CardTitle>
            <CardDescription className="text-slate-500">
              Upload your construction documents and let M.E.S.S.A. analyze them
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="projectName" className="text-slate-700 font-medium">
                  Project Name *
                </Label>
                <Input
                  id="projectName"
                  type="text"
                  placeholder="e.g., Toronto Downtown Office Tower"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <Label htmlFor="projectDescription" className="text-slate-700 font-medium">
                  Description (optional)
                </Label>
                <Textarea
                  id="projectDescription"
                  placeholder="Brief description of your project..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="border-slate-200 focus:border-amber-500 focus:ring-amber-500 resize-none"
                  rows={3}
                />
              </div>

              {/* File Upload Zone */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Upload Documents (PDF) *
                </Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                    ${isDragging 
                      ? "border-amber-500 bg-amber-50" 
                      : "border-slate-300 hover:border-slate-400 bg-slate-50"
                    }
                  `}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                      <FileUp className="h-7 w-7 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">
                        Drag & drop PDF files here
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        or click to browse (max 50MB per file)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">
                    Uploaded Files ({files.length})
                  </Label>
                  <div className="space-y-2">
                    {files.map((uploadedFile) => (
                      <div
                        key={uploadedFile.id}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700 truncate max-w-xs">
                              {uploadedFile.file.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatFileSize(uploadedFile.file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(uploadedFile.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !projectName.trim() || files.length === 0}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Create Project & Start Analysis
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-center text-sm text-slate-500">
                  You need to{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/buildunion/login")}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    log in
                  </button>{" "}
                  to create a project
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default BuildUnionNewProject;