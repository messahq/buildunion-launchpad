import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDbTrialUsage } from "@/hooks/useDbTrialUsage";
import { useSubscription } from "@/hooks/useSubscription";
import { TRADE_LABELS, ConstructionTrade } from "@/hooks/useBuProfile";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import AddressAutocomplete from "@/components/AddressAutocomplete";
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
  UserPlus,
  Image,
  FileCheck,
  Trash2,
  Minus,
  Lock,
  Crown,
  Wand2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrialLimitUpgradeModal } from "@/components/TrialLimitUpgradeModal";

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

interface ManpowerRequirement {
  trade: ConstructionTrade;
  count: number;
}

interface SiteImage {
  file: File;
  id: string;
  preview: string;
}

const COMMON_CERTIFICATIONS = [
  "OSHA 10-Hour",
  "OSHA 30-Hour",
  "First Aid/CPR",
  "Scaffolding Certification",
  "Fall Protection",
  "Confined Space Entry",
  "Forklift Operator",
  "Welding Certification",
  "Electrical License",
  "Plumbing License",
  "Working at Heights",
  "WHMIS",
];

const WIZARD_STEPS = [
  { id: 1, title: "Basic Info", icon: Briefcase },
  { id: 2, title: "Requirements", icon: Users },
  { id: 3, title: "Documents", icon: FileUp },
  { id: 4, title: "Team", icon: Users },
];

const BuildUnionNewProject = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { remainingTrials, hasTrialsRemaining, useOneTrial, maxTrials } = useDbTrialUsage("project_creation");
  const isPremium = subscription?.subscribed === true;
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Basic Info
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [address, setAddress] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<ConstructionTrade[]>([]);
  
  // Step 2: Requirements
  const [manpowerRequirements, setManpowerRequirements] = useState<ManpowerRequirement[]>([]);
  const [requiredCertifications, setRequiredCertifications] = useState<string[]>([]);
  const [siteImages, setSiteImages] = useState<SiteImage[]>([]);
  
  // Step 3: Documents
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Step 4: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  
  // App user search
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Quick Mode upgrade state
  const [isFromQuickMode, setIsFromQuickMode] = useState(false);
  const [quickModeSummaryId, setQuickModeSummaryId] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Parse Quick Mode data from URL and auto-fill form
  useEffect(() => {
    const fromQuickModeParam = searchParams.get("fromQuickMode");
    if (fromQuickModeParam) {
      try {
        const quickModeData = JSON.parse(decodeURIComponent(fromQuickModeParam));
        setIsFromQuickMode(true);
        setQuickModeSummaryId(quickModeData.summaryId || null);
        
        // Auto-fill project name
        if (quickModeData.name) {
          setProjectName(quickModeData.name);
        }
        
        // Auto-fill address from client address
        if (quickModeData.address) {
          setAddress(quickModeData.address);
        }
        
        // Auto-detect trades from photo estimate project type
        if (quickModeData.photoEstimate?.projectType) {
          const projectType = quickModeData.photoEstimate.projectType.toLowerCase();
          const detectedTrades: ConstructionTrade[] = [];
          
          if (projectType.includes("paint")) {
            detectedTrades.push("painter" as ConstructionTrade);
          }
          if (projectType.includes("floor") || projectType.includes("tile") || projectType.includes("carpet")) {
            detectedTrades.push("flooring_specialist" as ConstructionTrade);
          }
          if (projectType.includes("electric")) {
            detectedTrades.push("electrician" as ConstructionTrade);
          }
          if (projectType.includes("plumb")) {
            detectedTrades.push("plumber" as ConstructionTrade);
          }
          if (projectType.includes("roof")) {
            detectedTrades.push("roofer" as ConstructionTrade);
          }
          if (projectType.includes("drywall")) {
            detectedTrades.push("drywall_installer" as ConstructionTrade);
          }
          if (projectType.includes("hvac") || projectType.includes("heating") || projectType.includes("cooling")) {
            detectedTrades.push("hvac_technician" as ConstructionTrade);
          }
          if (projectType.includes("deck")) {
            detectedTrades.push("carpenter" as ConstructionTrade);
          }
          if (projectType.includes("concrete") || projectType.includes("mason")) {
            detectedTrades.push("mason" as ConstructionTrade);
          }
          
          if (detectedTrades.length > 0) {
            setSelectedTrades(detectedTrades);
          }
        }
        
        // Generate AI description from Quick Mode data
        generateAIDescription(quickModeData);
        
      } catch (error) {
        console.error("Failed to parse Quick Mode data:", error);
      }
    }
  }, [searchParams]);

  // AI-powered description generation
  const generateAIDescription = async (quickModeData: any) => {
    setIsGeneratingDescription(true);
    try {
      const projectInfo = {
        name: quickModeData.name || "Construction Project",
        address: quickModeData.address || "",
        clientName: quickModeData.clientName || "",
        lineItemsCount: quickModeData.lineItemsCount || 0,
        totalAmount: quickModeData.totalAmount || 0,
        photoEstimate: quickModeData.photoEstimate || {},
        calculatorResults: quickModeData.calculatorResults || [],
      };

      // Build a comprehensive context string for AI
      let context = `Project: ${projectInfo.name}`;
      if (projectInfo.address) context += `\nLocation: ${projectInfo.address}`;
      if (projectInfo.clientName) context += `\nClient: ${projectInfo.clientName}`;
      if (projectInfo.lineItemsCount > 0) context += `\n${projectInfo.lineItemsCount} line items`;
      if (projectInfo.totalAmount > 0) context += `\nEstimated value: $${projectInfo.totalAmount.toLocaleString()}`;
      
      if (projectInfo.photoEstimate?.estimatedArea) {
        context += `\nEstimated area: ${projectInfo.photoEstimate.estimatedArea} ${projectInfo.photoEstimate.areaUnit || 'sq ft'}`;
      }
      if (projectInfo.photoEstimate?.projectType) {
        context += `\nProject type: ${projectInfo.photoEstimate.projectType}`;
      }
      if (projectInfo.photoEstimate?.materials?.length > 0) {
        context += `\nMaterials: ${projectInfo.photoEstimate.materials.map((m: any) => m.name).join(", ")}`;
      }
      if (projectInfo.calculatorResults?.length > 0) {
        context += `\nCalculator estimates: ${projectInfo.calculatorResults.map((c: any) => c.name || c.material).filter(Boolean).join(", ")}`;
      }

      // Call AI to generate description
      const response = await supabase.functions.invoke("ask-messa", {
        body: {
          message: `Based on this Quick Mode project data, write a brief 2-3 sentence professional project description for a construction team project. Focus on scope and key details. Data:\n${context}`,
          context: "team_project_description",
        },
      });

      if (response.data?.answer) {
        setProjectDescription(response.data.answer);
      } else {
        // Fallback description
        setProjectDescription(`Upgraded from Quick Mode estimate. ${projectInfo.photoEstimate?.projectType ? `Project type: ${projectInfo.photoEstimate.projectType}.` : ""} ${projectInfo.lineItemsCount > 0 ? `Includes ${projectInfo.lineItemsCount} line items.` : ""}`);
      }
    } catch (error) {
      console.error("AI description generation failed:", error);
      // Fallback description
      setProjectDescription("Upgraded from Quick Mode for team collaboration. Review and customize project details as needed.");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Check project creation limit for non-premium users
  useEffect(() => {
    if (user && !isPremium && !hasTrialsRemaining) {
      setShowUpgradeModal(true);
    }
  }, [user, isPremium, hasTrialsRemaining]);

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

  // Team handling - supports multiple emails (comma, space, or newline separated)
  const addTeamMember = () => {
    const input = newMemberEmail.trim();
    if (!input) return;
    
    // Split by comma, space, semicolon, or newline
    const emails = input.split(/[,;\s\n]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];
    
    for (const email of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        invalidEmails.push(email);
      } else if (teamMembers.some(m => m.email === email)) {
        // Already added, skip silently
      } else {
        validEmails.push(email);
      }
    }
    
    if (invalidEmails.length > 0 && validEmails.length === 0) {
      toast.error(`Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`);
      return;
    }
    
    if (validEmails.length > 0) {
      const newMembers = validEmails.map(email => ({
        email,
        id: crypto.randomUUID(),
        isAppUser: false,
      }));
      setTeamMembers(prev => [...prev, ...newMembers]);
      toast.success(`Added ${validEmails.length} team member${validEmails.length > 1 ? 's' : ''}`);
    }
    
    if (invalidEmails.length > 0 && validEmails.length > 0) {
      toast.warning(`Skipped invalid: ${invalidEmails.join(', ')}`);
    }

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
  };

  const addSelectedUsers = () => {
    const usersToAdd = searchResults.filter(u => 
      selectedUsers.has(u.userId) && !teamMembers.some(m => m.userId === u.userId)
    );
    
    if (usersToAdd.length === 0) {
      toast.error("No new users to add");
      return;
    }

    const newMembers = usersToAdd.map(appUser => ({
      email: "",
      id: crypto.randomUUID(),
      userId: appUser.userId,
      name: appUser.name,
      avatarUrl: appUser.avatarUrl,
      trade: appUser.trade,
      isAppUser: true,
    }));

    setTeamMembers(prev => [...prev, ...newMembers]);
    setSelectedUsers(new Set());
    setUserSearchQuery("");
    setSearchResults([]);
    toast.success(`Added ${usersToAdd.length} team member${usersToAdd.length > 1 ? 's' : ''}`);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllSearchResults = () => {
    const newSelected = new Set(selectedUsers);
    searchResults.forEach(u => {
      if (!teamMembers.some(m => m.userId === u.userId)) {
        newSelected.add(u.userId);
      }
    });
    setSelectedUsers(newSelected);
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return projectName.trim() && address.trim() && selectedTrades.length > 0;
      case 2:
        return true; // Requirements are optional
      case 3:
        return true; // Documents now optional, can add later
      case 4:
        return true; // Team is optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 4 && canProceed()) {
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

    // Check project creation limit for non-premium users
    if (!isPremium && !hasTrialsRemaining) {
      toast.error("You've reached your free project limit. Upgrade to Pro for unlimited projects!");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use one trial for non-premium users
      if (!isPremium) {
        await useOneTrial();
      }
      // 1. Upload site images first
      const siteImagePaths: string[] = [];
      for (const siteImg of siteImages) {
        // Use timestamp + random UUID to ensure unique filename
        const uniqueId = `${Date.now()}-${crypto.randomUUID()}`;
        const safeFileName = siteImg.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const imgPath = `${user.id}/site-images/${uniqueId}-${safeFileName}`;
        const { error: imgError } = await supabase.storage
          .from("project-documents")
          .upload(imgPath, siteImg.file, { upsert: true });
        if (imgError) {
          console.error("Site image upload error:", imgError);
          toast.error(`Failed to upload image: ${siteImg.file.name}`);
        } else {
          siteImagePaths.push(imgPath);
        }
      }
      
      console.log("Uploaded site images:", siteImagePaths);

      // 2. Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          address: address.trim(),
          trade: selectedTrades[0] || null,
          trades: selectedTrades,
          manpower_requirements: manpowerRequirements as unknown as Record<string, unknown>,
          required_certifications: requiredCertifications,
          site_images: siteImagePaths,
          user_id: user.id,
          status: "active",
        } as any)
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Upload files
      setIsIndexing(true);
      let uploadedCount = 0;

      for (const uploadedFile of files) {
        const safeFileName = uploadedFile.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${user.id}/${project.id}/${uploadedFile.id}-${safeFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, uploadedFile.file, { upsert: true });

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

      // 4. Link Quick Mode summary to the new project if upgrading
      if (isFromQuickMode && quickModeSummaryId) {
        const { error: linkError } = await supabase
          .from("project_summaries")
          .update({
            project_id: project.id,
            status: "upgraded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", quickModeSummaryId);
          
        if (linkError) {
          console.error("Failed to link Quick Mode summary:", linkError);
        } else {
          console.log("Quick Mode summary linked to project:", project.id);
        }
      }

      // Simulate indexing completion
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success(isFromQuickMode ? "✅ Project upgraded to Team Mode!" : "Project created successfully!");
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
              {currentStep === 2 && "Manpower & Requirements"}
              {currentStep === 3 && "Upload Documents"}
              {currentStep === 4 && "Invite Team Members"}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {currentStep === 1 && "Enter the basic information about your construction project"}
              {currentStep === 2 && "Specify required workers, certifications, and upload site photos"}
              {currentStep === 3 && "Upload PDF plans and specifications for M.E.S.S.A. analysis"}
              {currentStep === 4 && "Invite team members to collaborate on this project"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Quick Mode Upgrade Banner */}
                {isFromQuickMode && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-900">Upgrading from Quick Mode</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Your project data has been auto-extracted. AI is generating a description from your estimate.
                          Review and customize the fields below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
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
                    Location *
                  </Label>
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    placeholder="e.g., Toronto, ON"
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Trades Required *
                  </Label>
                  <p className="text-sm text-slate-500">Select all trades needed for this project</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {Object.entries(TRADE_LABELS).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTrades.includes(value as ConstructionTrade)
                            ? "bg-amber-100 border-amber-300 border"
                            : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={selectedTrades.includes(value as ConstructionTrade)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTrades(prev => [...prev, value as ConstructionTrade]);
                            } else {
                              setSelectedTrades(prev => prev.filter(t => t !== value));
                            }
                          }}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  {selectedTrades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTrades.map(trade => (
                        <Badge key={trade} variant="secondary" className="gap-1">
                          {TRADE_LABELS[trade]}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => setSelectedTrades(prev => prev.filter(t => t !== trade))}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-medium flex items-center gap-2">
                    Description (optional)
                    {isGeneratingDescription && (
                      <Badge variant="secondary" className="gap-1 text-xs animate-pulse">
                        <Wand2 className="h-3 w-3" />
                        AI generating...
                      </Badge>
                    )}
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="description"
                      placeholder={isGeneratingDescription ? "AI is generating description from Quick Mode data..." : "Brief description of your project..."}
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="border-slate-200 resize-none"
                      rows={3}
                      disabled={isGeneratingDescription}
                    />
                    {isGeneratingDescription && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 rounded-md">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                      </div>
                    )}
                  </div>
                  {isFromQuickMode && projectDescription && !isGeneratingDescription && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Auto-generated from Quick Mode data - edit as needed
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Requirements */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Manpower Requirements */}
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Manpower Requirements
                  </Label>
                  <p className="text-sm text-slate-500">Specify how many workers you need per trade</p>
                  
                  {manpowerRequirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Select
                        value={req.trade}
                        onValueChange={(v) => {
                          const updated = [...manpowerRequirements];
                          updated[idx].trade = v as ConstructionTrade;
                          setManpowerRequirements(updated);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRADE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const updated = [...manpowerRequirements];
                            updated[idx].count = Math.max(1, updated[idx].count - 1);
                            setManpowerRequirements(updated);
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{req.count}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const updated = [...manpowerRequirements];
                            updated[idx].count += 1;
                            setManpowerRequirements(updated);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setManpowerRequirements(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const availableTrade = selectedTrades.find(t => 
                        !manpowerRequirements.some(r => r.trade === t)
                      ) || selectedTrades[0] || "general_contractor";
                      setManpowerRequirements(prev => [...prev, { trade: availableTrade as ConstructionTrade, count: 1 }]);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Trade Requirement
                  </Button>
                </div>

                {/* Required Certifications */}
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Required Certifications
                  </Label>
                  <p className="text-sm text-slate-500">Select certifications workers must have</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {COMMON_CERTIFICATIONS.map((cert) => (
                      <label
                        key={cert}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          requiredCertifications.includes(cert)
                            ? "bg-amber-100 border-amber-300 border"
                            : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={requiredCertifications.includes(cert)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRequiredCertifications(prev => [...prev, cert]);
                            } else {
                              setRequiredCertifications(prev => prev.filter(c => c !== cert));
                            }
                          }}
                        />
                        <span className="text-sm">{cert}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Site Photos */}
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Site Photos
                  </Label>
                  <p className="text-sm text-slate-500">Upload photos of the job site (optional)</p>
                  
                  <div className="relative border-2 border-dashed rounded-xl p-6 text-center border-slate-300 hover:border-slate-400 bg-slate-50">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (!e.target.files) return;
                        const newImages = Array.from(e.target.files).map(file => ({
                          file,
                          id: crypto.randomUUID(),
                          preview: URL.createObjectURL(file),
                        }));
                        setSiteImages(prev => [...prev, ...newImages]);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Image className="h-8 w-8 text-slate-400" />
                      <p className="text-sm text-slate-500">Click to upload site images</p>
                    </div>
                  </div>

                  {siteImages.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {siteImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.preview}
                            alt="Site"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(img.preview);
                              setSiteImages(prev => prev.filter(i => i.id !== img.id));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
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
                        Upload multiple plans & specs (max 50MB per file)
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

                <p className="text-sm text-slate-500 bg-slate-100 p-4 rounded-lg">
                  You can upload multiple documents now or add more later from the project page.
                </p>
              </div>
            )}

            {/* Step 4: Team */}
            {currentStep === 4 && (
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
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={selectAllSearchResults}
                            className="text-sm text-amber-600 hover:underline"
                          >
                            Select All
                          </button>
                          {selectedUsers.size > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={addSelectedUsers}
                              className="bg-amber-600 hover:bg-amber-700 gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add {selectedUsers.size} Selected
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {searchResults.map((appUser) => {
                            const isAlreadyAdded = teamMembers.some(m => m.userId === appUser.userId);
                            const isSelected = selectedUsers.has(appUser.userId);
                            
                            return (
                              <div
                                key={appUser.id}
                                onClick={() => !isAlreadyAdded && toggleUserSelection(appUser.userId)}
                                className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors cursor-pointer ${
                                  isAlreadyAdded 
                                    ? "bg-slate-100 opacity-50 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-amber-50 border-2 border-amber-400"
                                      : "bg-white border border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected || isAlreadyAdded}
                                    disabled={isAlreadyAdded}
                                    onCheckedChange={() => !isAlreadyAdded && toggleUserSelection(appUser.userId)}
                                  />
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={appUser.avatarUrl || undefined} />
                                    <AvatarFallback className="bg-amber-100 text-amber-700">
                                      {appUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">
                                      {appUser.name}
                                      {isAlreadyAdded && <span className="text-slate-400 ml-2">(already added)</span>}
                                    </p>
                                    {appUser.trade && (
                                      <p className="text-xs text-slate-400">
                                        {TRADE_LABELS[appUser.trade as ConstructionTrade] || appUser.trade}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {!isAlreadyAdded && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addAppUser(appUser);
                                    }}
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
                    <div className="space-y-2">
                      <Label htmlFor="memberEmail" className="text-slate-700 font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Team Member Emails
                      </Label>
                      <Textarea
                        id="memberEmail"
                        placeholder="Enter multiple emails separated by comma, space, or new line:&#10;john@company.com, jane@company.com&#10;mike@company.com"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="border-slate-200 resize-none"
                        rows={3}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addTeamMember}
                      disabled={!newMemberEmail.trim()}
                      className="bg-amber-600 hover:bg-amber-700 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Email{newMemberEmail.includes(',') || newMemberEmail.includes(' ') || newMemberEmail.includes('\n') ? 's' : ''}
                    </Button>
                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                      Paste multiple emails at once - they'll be separated automatically.
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

              {currentStep < 4 ? (
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

      {/* Upgrade Modal */}
      <TrialLimitUpgradeModal
        open={showUpgradeModal}
        onOpenChange={(open) => {
          setShowUpgradeModal(open);
          if (!open && !hasTrialsRemaining) {
            navigate("/buildunion/workspace");
          }
        }}
        feature="project_creation"
      />
    </main>
  );
};

export default BuildUnionNewProject;
