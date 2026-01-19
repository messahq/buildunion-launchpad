import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Search,
  Download,
  Filter,
  Calendar,
  FileText,
  ChevronRight,
  ArrowUpDown,
  X,
  ExternalLink,
  Brain
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Custom icons for the engines
const GeminiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const OpenAIIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6465 4.4708 4.4708 0 0 1 .5765 3.0137zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5056-2.6067-1.4998z" />
  </svg>
);

interface Project {
  id: string;
  name: string;
}

interface ProjectSynthesis {
  id: string;
  project_id: string;
  question: string;
  answer: string;
  gemini_response: string | null;
  openai_response: string | null;
  verification_status: string;
  created_at: string;
  sources: any;
  project?: Project;
}

const BuildUnionProjectFacts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facts, setFacts] = useState<ProjectSynthesis[]>([]);
  const [filteredFacts, setFilteredFacts] = useState<ProjectSynthesis[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFact, setSelectedFact] = useState<ProjectSynthesis | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [facts, searchQuery, selectedProject, selectedStatus, sortOrder]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);

      if (!projectsData || projectsData.length === 0) {
        setFacts([]);
        setIsLoading(false);
        return;
      }

      const projectIds = projectsData.map(p => p.id);
      const projectMap = Object.fromEntries(projectsData.map(p => [p.id, p]));

      // Fetch all syntheses
      const { data: synthesesData, error: synthesesError } = await supabase
        .from("project_syntheses")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (synthesesError) throw synthesesError;

      const factsWithProjects = (synthesesData || []).map(fact => ({
        ...fact,
        project: projectMap[fact.project_id]
      }));

      setFacts(factsWithProjects);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load project facts");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...facts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        f =>
          f.question.toLowerCase().includes(query) ||
          f.answer.toLowerCase().includes(query) ||
          f.project?.name.toLowerCase().includes(query)
      );
    }

    // Project filter
    if (selectedProject !== "all") {
      result = result.filter(f => f.project_id === selectedProject);
    }

    // Status filter
    if (selectedStatus !== "all") {
      result = result.filter(f => f.verification_status === selectedStatus);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredFacts(result);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedProject("all");
    setSelectedStatus("all");
    setSortOrder("newest");
  };

  const hasActiveFilters = searchQuery || selectedProject !== "all" || selectedStatus !== "all";

  const exportToCSV = () => {
    if (filteredFacts.length === 0) {
      toast.error("No facts to export");
      return;
    }

    const headers = ["Project", "Question", "Answer", "Status", "Date"];
    const rows = filteredFacts.map(f => [
      f.project?.name || "Unknown",
      `"${f.question.replace(/"/g, '""')}"`,
      `"${f.answer.replace(/"/g, '""')}"`,
      f.verification_status,
      format(new Date(f.created_at), "yyyy-MM-dd HH:mm")
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-facts-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredFacts.length} facts to CSV`);
  };

  const exportToJSON = () => {
    if (filteredFacts.length === 0) {
      toast.error("No facts to export");
      return;
    }

    const exportData = filteredFacts.map(f => ({
      project: f.project?.name || "Unknown",
      question: f.question,
      answer: f.answer,
      gemini_response: f.gemini_response,
      openai_response: f.openai_response,
      verification_status: f.verification_status,
      sources: f.sources,
      created_at: f.created_at
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-facts-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredFacts.length} facts to JSON`);
  };

  const openFactDetail = (fact: ProjectSynthesis, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFact(fact);
    setIsDetailOpen(true);
  };

  // Navigate to next/previous fact
  const navigateToFact = useCallback((direction: 'next' | 'prev') => {
    if (!selectedFact || filteredFacts.length === 0) return;
    
    const currentIndex = filteredFacts.findIndex(f => f.id === selectedFact.id);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = currentIndex < filteredFacts.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredFacts.length - 1;
    }
    
    setSelectedFact(filteredFacts[newIndex]);
  }, [selectedFact, filteredFacts]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDetailOpen) return;
      
      switch (e.key) {
        case 'Escape':
          setIsDetailOpen(false);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          navigateToFact('next');
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          navigateToFact('prev');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen, navigateToFact]);

  const getStatusBadge = (status: string, size: "sm" | "lg" = "sm") => {
    const iconSize = size === "lg" ? "h-4 w-4" : "h-3 w-3";
    const badgeClass = size === "lg" ? "text-sm py-1.5 px-3" : "";
    
    if (status === "verified") {
      return (
        <Badge className={`bg-green-500/10 text-green-700 border-green-300 gap-1 ${badgeClass}`}>
          <CheckCircle2 className={iconSize} />
          Verified
        </Badge>
      );
    }
    if (status === "conflict_notified") {
      return (
        <Badge className={`bg-amber-500/10 text-amber-700 border-amber-300 gap-1 ${badgeClass}`}>
          <AlertTriangle className={iconSize} />
          Conflict
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={`gap-1 ${badgeClass}`}>
        <FileText className={iconSize} />
        Saved
      </Badge>
    );
  };

  const renderFactDetailSheet = () => {
    if (!selectedFact) return null;

    return (
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Badge variant="outline" className="text-xs text-cyan-700 border-cyan-300 bg-cyan-50">
                {selectedFact.project?.name || "Unknown Project"}
              </Badge>
              {getStatusBadge(selectedFact.verification_status, "lg")}
            </div>
            <SheetTitle className="text-left text-xl">
              {selectedFact.question}
            </SheetTitle>
            <SheetDescription className="text-left flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(selectedFact.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-6 -mx-6 px-6">
            <div className="space-y-6 pb-6">
              {/* Synthesized Answer */}
              <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-900">Synthesized Answer</h4>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedFact.answer}
                </p>
              </div>

              {/* Engine Responses */}
              {(selectedFact.gemini_response || selectedFact.openai_response) && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>Individual Engine Responses</span>
                    {selectedFact.verification_status === "verified" && (
                      <span className="text-xs font-normal text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Consensus reached
                      </span>
                    )}
                  </h4>

                  {/* Gemini Response */}
                  {selectedFact.gemini_response && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-400/50">
                          <GeminiIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium text-blue-700">Gemini Pro</span>
                          <span className="text-xs text-blue-500 block">Primary Analysis</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedFact.gemini_response}
                      </p>
                    </div>
                  )}

                  {/* OpenAI Response */}
                  {selectedFact.openai_response && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center ring-2 ring-emerald-400/50">
                          <OpenAIIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <span className="font-medium text-emerald-700">GPT-5</span>
                          <span className="text-xs text-emerald-500 block">Verification Engine</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedFact.openai_response}
                      </p>
                    </div>
                  )}

                  {/* Comparison indicator */}
                  {selectedFact.gemini_response && selectedFact.openai_response && (
                    <div className={`rounded-lg p-3 flex items-center gap-3 ${
                      selectedFact.verification_status === "verified"
                        ? "bg-green-100 border border-green-200"
                        : "bg-amber-100 border border-amber-200"
                    }`}>
                      {selectedFact.verification_status === "verified" ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800">Both engines reached similar conclusions</p>
                            <p className="text-xs text-green-600">This fact has been verified through dual-engine consensus</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Responses differ between engines</p>
                            <p className="text-xs text-amber-600">Manual review may be required for accuracy</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sources */}
              {selectedFact.sources && Array.isArray(selectedFact.sources) && selectedFact.sources.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Sources</h4>
                  <div className="space-y-2">
                    {selectedFact.sources.map((source: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded px-3 py-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>{source.document || source}</span>
                        {source.page && <span className="text-xs text-muted-foreground">(Page {source.page})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex-shrink-0 pt-4 border-t mt-auto space-y-3">
            {/* Navigation hint */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">→</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setIsDetailOpen(false);
                navigate(`/buildunion/project/${selectedFact.project_id}`);
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Open in Project
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  if (isLoading) {
    return (
      <main className="bg-slate-50 min-h-screen">
        <BuildUnionHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
        <BuildUnionFooter />
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      <BuildUnionHeader />

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-amber-400 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-slate-900">
                  Project Facts
                </h1>
              </div>
              <p className="text-slate-600">
                All verified insights from M.E.S.S.A. dual-engine analysis across your projects
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredFacts.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToJSON}
                disabled={filteredFacts.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions, answers, or projects..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Project Filter */}
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full lg:w-[160px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="conflict_notified">Conflict</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(s => (s === "newest" ? "oldest" : "newest"))}
                  title={sortOrder === "newest" ? "Showing newest first" : "Showing oldest first"}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Results count */}
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {filteredFacts.length} of {facts.length} facts
                {sortOrder === "oldest" && " (oldest first)"}
              </div>
            </CardContent>
          </Card>

          {/* Facts List */}
          {filteredFacts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  {facts.length === 0 ? "No saved facts yet" : "No facts match your filters"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {facts.length === 0
                    ? "Use M.E.S.S.A. to analyze documents and save verified insights"
                    : "Try adjusting your search or filter criteria"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFacts.map(fact => (
                <Card
                  key={fact.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={(e) => openFactDetail(fact, e)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs text-cyan-700 border-cyan-300 bg-cyan-50">
                            {fact.project?.name || "Unknown Project"}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(fact.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {fact.question}
                        </h3>
                      </div>
                      {getStatusBadge(fact.verification_status)}
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-3 mb-3">
                      {fact.answer}
                    </p>

                    {/* Engine indicators */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {fact.gemini_response && (
                          <span className="flex items-center gap-1">
                            <GeminiIcon className="w-3 h-3 text-blue-500" />
                            Gemini
                          </span>
                        )}
                        {fact.openai_response && (
                          <span className="flex items-center gap-1">
                            <OpenAIIcon className="w-3 h-3 text-emerald-500" />
                            GPT-5
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        View details <ChevronRight className="h-3 w-3 ml-1" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Fact Detail Sheet */}
      {renderFactDetailSheet()}

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionProjectFacts;
