import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BuildUnionHeader from "@/components/BuildUnionHeader";
import BuildUnionFooter from "@/components/BuildUnionFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  X
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

  const getStatusBadge = (status: string) => {
    if (status === "verified") {
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-300 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    if (status === "conflict_notified") {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Conflict
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <FileText className="h-3 w-3" />
        Saved
      </Badge>
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
                  onClick={() => navigate(`/buildunion/project/${fact.project_id}`)}
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
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Gemini
                          </span>
                        )}
                        {fact.openai_response && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            GPT-5
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        View in project <ChevronRight className="h-3 w-3 ml-1" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <BuildUnionFooter />
    </main>
  );
};

export default BuildUnionProjectFacts;
