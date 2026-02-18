import { useState, useEffect, useCallback, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Folder, User, FileText, X } from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface SearchResult {
  id: string;
  type: "project" | "user" | "document";
  title: string;
  subtitle?: string;
  avatar?: string;
  badge?: string;
  projectId?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalSearch = forwardRef<HTMLDivElement, GlobalSearchProps>(({ open, onOpenChange }, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bu_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save to recent searches
  const addToRecent = useCallback((result: SearchResult) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.id !== result.id);
      const updated = [result, ...filtered].slice(0, 5);
      localStorage.setItem("bu_recent_searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search projects (user's own projects)
        if (user) {
          const { data: projects } = await supabase
            .from("projects")
            .select("id, name, address, trade, status")
            .eq("user_id", user.id)
            .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
            .limit(5);

          if (projects) {
            projects.forEach((project) => {
              searchResults.push({
                id: project.id,
                type: "project",
                title: project.name,
                subtitle: project.address || project.trade || undefined,
                badge: project.status,
              });
            });
          }

          // Also search projects where user is a member
          const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id, projects!inner(id, name, address, trade, status)")
            .eq("user_id", user.id);

          if (memberProjects) {
            memberProjects.forEach((mp: any) => {
              const project = mp.projects;
              if (
                project &&
                (project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  project.address?.toLowerCase().includes(searchQuery.toLowerCase()))
              ) {
                // Don't add duplicates
                if (!searchResults.find((r) => r.id === project.id)) {
                  searchResults.push({
                    id: project.id,
                    type: "project",
                    title: project.name,
                    subtitle: project.address || project.trade || undefined,
                    badge: "shared",
                  });
                }
              }
            });
          }

          // Search documents
          const { data: documents } = await supabase
            .from("project_documents")
            .select("id, file_name, project_id, projects!inner(name, user_id)")
            .ilike("file_name", `%${searchQuery}%`)
            .limit(5);

          if (documents) {
            documents.forEach((doc: any) => {
              // Only show documents from user's projects
              if (doc.projects?.user_id === user.id) {
                searchResults.push({
                  id: doc.id,
                  type: "document",
                  title: doc.file_name,
                  subtitle: doc.projects?.name,
                  projectId: doc.project_id,
                });
              }
            });
          }
        }

        // Search public profiles (bu_profiles)
        const { data: profiles } = await supabase
          .from("bu_profiles")
          .select("id, user_id, company_name, primary_trade, avatar_url, is_public_profile, profile_completed")
          .eq("is_public_profile", true)
          .eq("profile_completed", true)
          .or(`company_name.ilike.%${searchQuery}%,primary_trade.ilike.%${searchQuery}%`)
          .limit(5);

        if (profiles) {
          profiles.forEach((profile) => {
            searchResults.push({
              id: profile.user_id,
              type: "user",
              title: profile.company_name || "Unnamed Contractor",
              subtitle: profile.primary_trade?.replace(/_/g, " ") || undefined,
              avatar: profile.avatar_url || undefined,
            });
          });
        }

        // Also search by profile names from profiles table
        const { data: basicProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, avatar_url")
          .ilike("full_name", `%${searchQuery}%`)
          .limit(5);

        if (basicProfiles) {
          basicProfiles.forEach((profile) => {
            // Don't add duplicates
            if (!searchResults.find((r) => r.id === profile.user_id)) {
              searchResults.push({
                id: profile.user_id,
                type: "user",
                title: profile.full_name || "User",
                avatar: profile.avatar_url || undefined,
              });
            }
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    addToRecent(result);
    onOpenChange(false);
    setQuery("");

    switch (result.type) {
      case "project":
        navigate(`/buildunion/workspace/project/${result.id}`);
        break;
      case "user":
        navigate(`/buildunion/profile/${result.id}`);
        break;
      case "document":
        if (result.projectId) {
          navigate(`/buildunion/workspace/project/${result.projectId}?tab=documents`);
        }
        break;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "project":
        return <Folder className="h-4 w-4 text-amber-500" />;
      case "user":
        return <User className="h-4 w-4 text-blue-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "project":
        return t("search.project", "Project");
      case "user":
        return t("search.user", "User");
      case "document":
        return t("search.document", "Document");
      default:
        return "";
    }
  };

  const projectResults = results.filter((r) => r.type === "project");
  const userResults = results.filter((r) => r.type === "user");
  const documentResults = results.filter((r) => r.type === "document");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t("search.placeholder", "Search projects, users, documents...")}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <HardHatSpinner size="sm" />
          </div>
        )}

        {!loading && !query && recentSearches.length > 0 && (
          <CommandGroup heading={t("search.recent", "Recent Searches")}>
            {recentSearches.map((result) => (
              <CommandItem
                key={`recent-${result.id}`}
                value={`${result.type}-${result.id}-${result.title}`}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {result.type === "user" && result.avatar ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={result.avatar} />
                    <AvatarFallback>{result.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  getTypeIcon(result.type)
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {getTypeLabel(result.type)}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && query && results.length === 0 && (
          <CommandEmpty>{t("search.noResults", "No results found.")}</CommandEmpty>
        )}

        {!loading && projectResults.length > 0 && (
          <CommandGroup heading={t("search.projects", "Projects")}>
            {projectResults.map((result) => (
              <CommandItem
                key={`project-${result.id}`}
                value={`project-${result.id}-${result.title}`}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Folder className="h-4 w-4 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  )}
                </div>
                {result.badge && (
                  <Badge
                    variant={result.badge === "shared" ? "secondary" : "outline"}
                    className="text-xs shrink-0"
                  >
                    {result.badge}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && projectResults.length > 0 && (userResults.length > 0 || documentResults.length > 0) && (
          <CommandSeparator />
        )}

        {!loading && userResults.length > 0 && (
          <CommandGroup heading={t("search.users", "Users")}>
            {userResults.map((result) => (
              <CommandItem
                key={`user-${result.id}`}
                value={`user-${result.id}-${result.title}`}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {result.avatar ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={result.avatar} />
                    <AvatarFallback>{result.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : (
                  <User className="h-4 w-4 text-blue-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground truncate capitalize">{result.subtitle}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && userResults.length > 0 && documentResults.length > 0 && <CommandSeparator />}

        {!loading && documentResults.length > 0 && (
          <CommandGroup heading={t("search.documents", "Documents")}>
            {documentResults.map((result) => (
              <CommandItem
                key={`doc-${result.id}`}
                value={`doc-${result.id}-${result.title}`}
                onSelect={() => handleSelect(result)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.title}</p>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t border-border p-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
          <span>{t("search.openShortcut", "to open")}</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            ESC
          </kbd>
          <span>{t("search.closeShortcut", "to close")}</span>
        </div>
      </div>
    </CommandDialog>
  );
});

GlobalSearch.displayName = "GlobalSearch";

// Search trigger button component
export const GlobalSearchTrigger = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative h-9 w-9 md:w-64 md:justify-start md:px-3 md:py-2 text-muted-foreground"
    >
      <Search className="h-4 w-4 md:mr-2" />
      <span className="hidden md:inline-flex">{t("search.placeholder", "Search...")}</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
};
