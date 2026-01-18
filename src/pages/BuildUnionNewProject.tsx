import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TRADE_LABELS, ConstructionTrade } from "@/hooks/useBuProfile";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileUp, 
  X, 
  FileText, 
  ArrowLeft, 
  Loader2, 
  CheckCircle,
  ArrowRight,
  MapPin,
  Briefcase,
  Users,
  Mail,
  Plus,
  Sparkles,
  Search,
  UserPlus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  id: string;
}

interface TeamMember {
  email: string;
  id: string;
  userId?: string;
  name?: string;
  avatarUrl?: string | null;
  trade?: string | null;
  isAppUser?: boolean;
}

interface AppUser {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  trade: string | null;
}

const WIZARD_STEPS = [
  { id: 1, title: "Basic Info", icon: Briefcase },
  { id: 2, title: "Documents", icon: FileUp },
  { id: 3, title: "Team", icon: Users },
];

const BuildUnionNewProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Basic Info
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [address, setAddress] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<ConstructionTrade | "">("");
  
  // Step 2: Documents
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Step 3: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  
  // App user search
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error("Please log in to create a project");
      navigate("/buildunion/login");
    }
  }, [user, navigate]);

  // File handling
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

  // Search users in app
  const searchAppUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Search in profiles table joined with bu_profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, username")
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;

      // Get bu_profiles for trade info
      const userIds = profiles?.map(p => p.user_id) || [];
      let buProfiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("bu_profiles")
          .select("user_id, primary_trade")
          .in("user_id", userIds);
        buProfiles = data || [];
      }

      const results: AppUser[] = (profiles || [])
        .filter(p => p.user_id !== user?.id) // Exclude current user
        .map(p => {
          const buProfile = buProfiles.find(bp => bp.user_id === p.user_id);
          return {
            id: p.id,
            userId: p.user_id,
            name: p.full_name || p.username || "Unknown",
            avatarUrl: p.avatar_url,
            trade: buProfile?.primary_trade || null,
          };
        });
      
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchAppUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchAppUsers]);

  // Team handling
  const addTeamMember = () => {
    const email = newMemberEmail.trim().toLowerCase();
    if (!email) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (teamMembers.some(m => m.email === email)) {
      toast.error("This email is already added");
      return;
    }

    setTeamMembers(prev => [...prev, { email, id: crypto.randomUUID(), isAppUser: false }]);
    setNewMemberEmail("");
  };

  const addAppUser = (appUser: AppUser) => {
    if (teamMembers.some(m => m.userId === appUser.userId)) {
      toast.error("This user is already added");
      return;
    }

    setTeamMembers(prev => [
      ...prev, 
      { 
        email: "", 
        id: crypto.randomUUID(), 
        userId: appUser.userId,
        name: appUser.name,
        avatarUrl: appUser.avatarUrl,
        trade: appUser.trade,
        isAppUser: true,
      }
    ]);
    setUserSearchQuery("");
    setSearchResults([]);
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return projectName.trim() && address.trim() && selectedTrade;
      case 2:
        return files.length > 0;
      case 3:
        return true; // Team is optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 3 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Submission
  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // 1. Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          address: address.trim(),
          trade: selectedTrade,
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Upload files
      setIsIndexing(true);
      let uploadedCount = 0;

      for (const uploadedFile of files) {
        const filePath = `${user.id}/${project.id}/${uploadedFile.id}-${uploadedFile.file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, uploadedFile.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        await supabase.from("project_documents").insert({
          project_id: project.id,
          file_name: uploadedFile.file.name,
          file_path: filePath,
          file_size: uploadedFile.file.size,
        });

        uploadedCount++;
        setIndexingProgress((uploadedCount / files.length) * 100);
      }

      // 3. Send team invitations
      for (const member of teamMembers) {
        await supabase.from("team_invitations").insert({
          project_id: project.id,
          email: member.email,
          invited_by: user.id,
          status: "pending",
        });
      }

      // Simulate indexing completion
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success("Project created successfully!");
      navigate(`/buildunion/project/${project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
      setIsIndexing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Indexing screen
  if (isIndexing) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <BuildUnionHeader />
        <div className="max-w-xl mx-auto px-6 py-24">
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                {/* Animated orb */}
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-300 via-teal-300 to-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-200 via-teal-200 to-amber-200" />
                  <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-amber-600" />
                </div>

                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  M.E.S.S.A. Engines are aligning for Operational Truth...
                </h2>
                <p className="text-slate-500 mb-8">
                  Indexing your documents with dual AI engines
                </p>

                <div className="w-full max-w-xs space-y-2">
                  <Progress value={indexingProgress} className="h-2" />
                  <p className="text-sm text-slate-400">
                    {Math.round(indexingProgress)}% Complete
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    Gemini Pro
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    GPT-5
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

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

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  step.id === currentStep
                    ? "bg-amber-600 text-white"
                    : step.id < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step.id < currentStep ? "bg-green-500" : "bg-slate-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {currentStep === 1 && "Project Details"}
              {currentStep === 2 && "Upload Documents"}
              {currentStep === 3 && "Invite Team Members"}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {currentStep === 1 && "Enter the basic information about your construction project"}
              {currentStep === 2 && "Upload PDF plans and specifications for M.E.S.S.A. analysis"}
              {currentStep === 3 && "Invite team members to collaborate on this project"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-slate-700 font-medium">
                    Project Name *
                  </Label>
                  <Input
                    id="projectName"
                    placeholder="e.g., Toronto Downtown Office Tower"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-700 font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Toronto Address *
                  </Label>
                  <Input
                    id="address"
                    placeholder="e.g., 123 King Street West, Toronto, ON M5H 1A1"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Primary Trade *
                  </Label>
                  <Select value={selectedTrade} onValueChange={(v) => setSelectedTrade(v as ConstructionTrade)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select the main trade for this project" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRADE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-medium">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your project..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="border-slate-200 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragging 
                      ? "border-amber-500 bg-amber-50" 
                      : "border-slate-300 hover:border-slate-400 bg-slate-50"
                  }`}
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
              </div>
            )}

            {/* Step 3: Team */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Tabs defaultValue="search" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="search" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Find Users
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Invite by Email
                    </TabsTrigger>
                  </TabsList>

                  {/* Search App Users Tab */}
                  <TabsContent value="search" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="userSearch" className="text-slate-700 font-medium flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Search BuildUnion Users
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="userSearch"
                          placeholder="Search by name or username..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="border-slate-200 pl-10"
                        />
                      </div>
                    </div>

                    {/* Search Results */}
                    {isSearching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                      </div>
                    )}

                    {!isSearching && searchResults.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {searchResults.map((appUser) => (
                          <div
                            key={appUser.id}
                            className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={appUser.avatarUrl || undefined} />
                                <AvatarFallback className="bg-amber-100 text-amber-700">
                                  {appUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{appUser.name}</p>
                                {appUser.trade && (
                                  <p className="text-xs text-slate-400">
                                    {TRADE_LABELS[appUser.trade as ConstructionTrade] || appUser.trade}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addAppUser(appUser)}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isSearching && userSearchQuery.length >= 2 && searchResults.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No users found. Try a different search or invite by email.
                      </p>
                    )}

                    {userSearchQuery.length < 2 && userSearchQuery.length > 0 && (
                      <p className="text-sm text-slate-400 text-center py-2">
                        Type at least 2 characters to search...
                      </p>
                    )}
                  </TabsContent>

                  {/* Email Invite Tab */}
                  <TabsContent value="email" className="space-y-4 mt-4">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="memberEmail" className="text-slate-700 font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Team Member Email
                        </Label>
                        <Input
                          id="memberEmail"
                          type="email"
                          placeholder="colleague@company.com"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTeamMember()}
                          className="border-slate-200"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={addTeamMember}
                        className="mt-7 bg-amber-600 hover:bg-amber-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                      Invite someone who isn't on BuildUnion yet by their email address.
                    </p>
                  </TabsContent>
                </Tabs>

                {/* Invited Members List */}
                {teamMembers.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-slate-700 font-medium">
                      Invited Members ({teamMembers.length})
                    </Label>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2"
                        >
                          <div className="flex items-center gap-3">
                            {member.isAppUser ? (
                              <>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatarUrl || undefined} />
                                  <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                    {member.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{member.name}</p>
                                  {member.trade && (
                                    <p className="text-xs text-slate-400">
                                      {TRADE_LABELS[member.trade as ConstructionTrade] || member.trade}
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-slate-500" />
                                </div>
                                <p className="text-sm text-slate-700">{member.email}</p>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTeamMember(member.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-slate-500 bg-slate-100 p-4 rounded-lg">
                  Team members will be added to this project and can view documents and chat with M.E.S.S.A.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default BuildUnionNewProject;
