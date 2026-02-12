import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Shield, 
  FolderKanban, 
  FileText, 
  Search,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  ArrowLeft,
  RefreshCw,
  Crown,
  UserPlus,
  CreditCard,
  MessageSquare,
  Trash2,
  Eye,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Bot,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
// DatabaseSyncDashboard removed for Project 3.0

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  company_name: string | null;
  role: "admin" | "moderator" | "user" | null;
  subscription_status?: "active" | "inactive" | "cancelled" | null;
  subscription_tier?: string | null;
}

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalContracts: number;
  activeSubscriptions: number;
  totalRevenue: number;
  adminCount: number;
  moderatorCount: number;
  forumPosts: number;
}

interface AiUsageRecord {
  id: string;
  user_id: string;
  function_name: string;
  model_used: string;
  tier: string;
  tokens_used: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface AiUsageStats {
  totalCalls: number;
  byTier: Record<string, number>;
  byFunction: Record<string, number>;
  byModel: Record<string, number>;
  successRate: number;
  totalTokens: number;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  user_id: string;
  replies_count: number;
  author_name?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalContracts: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    adminCount: 0,
    moderatorCount: 0,
    forumPosts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [forumSearchQuery, setForumSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "moderator" | "user">("user");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [postToDelete, setPostToDelete] = useState<ForumPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiUsageData, setAiUsageData] = useState<AiUsageRecord[]>([]);
  const [aiUsageStats, setAiUsageStats] = useState<AiUsageStats>({
    totalCalls: 0, byTier: {}, byFunction: {}, byModel: {}, successRate: 100, totalTokens: 0,
  });
  const [aiUsageLoading, setAiUsageLoading] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate("/buildunion/login");
      } else if (!isAdmin) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/buildunion");
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      // Fetch stats
      const [projectsRes, contractsRes, profilesRes, postsRes] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("contracts").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("forum_posts").select("id", { count: "exact", head: true }),
      ]);

      // Fetch project summaries for total revenue calculation
      const { data: summaries } = await supabase
        .from("project_summaries")
        .select("total_cost");
      
      const totalRevenue = summaries?.reduce((sum, s) => sum + (s.total_cost || 0), 0) || 0;

      // Fetch users with profiles and roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (profilesError) throw profilesError;

      // Fetch bu_profiles for company names
      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name");

      const buProfileMap = new Map(buProfiles?.map(p => [p.user_id, p.company_name]) || []);

      // Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as "admin" | "moderator" | "user"]) || []);
      
      const adminCount = roles?.filter(r => r.role === "admin").length || 0;
      const moderatorCount = roles?.filter(r => r.role === "moderator").length || 0;

      // Get users data
      const usersData: UserWithProfile[] = (profiles || []).map(profile => ({
        id: profile.user_id,
        email: "", 
        created_at: profile.created_at,
        full_name: profile.full_name,
        company_name: buProfileMap.get(profile.user_id) || null,
        role: roleMap.get(profile.user_id) || null,
      }));

      setUsers(usersData);
      
      setStats({
        totalUsers: profilesRes.count || 0,
        totalProjects: projectsRes.count || 0,
        totalContracts: contractsRes.count || 0,
        activeSubscriptions: 0, // Placeholder - would need Stripe check
        totalRevenue,
        adminCount,
        moderatorCount,
        forumPosts: postsRes.count || 0,
      });

      // Fetch forum posts for moderation
      const { data: posts } = await supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Get author names for posts
      const postUserIds = posts?.map(p => p.user_id) || [];
      const { data: postAuthors } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", postUserIds);

      const authorMap = new Map(postAuthors?.map(a => [a.user_id, a.full_name]) || []);

      const postsWithAuthors: ForumPost[] = (posts || []).map(post => ({
        ...post,
        author_name: authorMap.get(post.user_id) || "Unknown User",
      }));

      setForumPosts(postsWithAuthors);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiUsageData = async () => {
    setAiUsageLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_model_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const records = (data || []) as unknown as AiUsageRecord[];
      setAiUsageData(records);

      // Calculate stats
      const byTier: Record<string, number> = {};
      const byFunction: Record<string, number> = {};
      const byModel: Record<string, number> = {};
      let successCount = 0;
      let totalTokens = 0;

      records.forEach(r => {
        byTier[r.tier] = (byTier[r.tier] || 0) + 1;
        byFunction[r.function_name] = (byFunction[r.function_name] || 0) + 1;
        // Split compound model names for stats
        r.model_used.split(" + ").forEach(m => {
          byModel[m.trim()] = (byModel[m.trim()] || 0) + 1;
        });
        if (r.success) successCount++;
        totalTokens += r.tokens_used || 0;
      });

      setAiUsageStats({
        totalCalls: records.length,
        byTier,
        byFunction,
        byModel,
        successRate: records.length > 0 ? Math.round((successCount / records.length) * 100) : 100,
        totalTokens,
      });
    } catch (error) {
      console.error("Error fetching AI usage data:", error);
      toast.error("Failed to load AI usage data");
    } finally {
      setAiUsageLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === "ai-usage") {
      fetchAiUsageData();
    }
  }, [isAdmin, activeTab]);

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", selectedUser.id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", selectedUser.id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: selectedUser.id, role: newRole });

        if (error) throw error;
      }

      toast.success(`Role updated to ${newRole}`);
      setIsRoleDialogOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete replies first
      await supabase
        .from("forum_replies")
        .delete()
        .eq("post_id", postToDelete.id);

      // Delete the post
      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", postToDelete.id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      setPostToDelete(null);
      fetchDashboardData();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = forumPosts.filter(p =>
    p.title.toLowerCase().includes(forumSearchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(forumSearchQuery.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(forumSearchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500 hover:bg-red-600"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
      case "moderator":
        return <Badge className="bg-amber-500 hover:bg-amber-600"><ShieldCheck className="h-3 w-3 mr-1" />Moderator</Badge>;
      case "user":
        return <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />User</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">No role</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-slate-500",
      help: "bg-blue-500",
      showcase: "bg-purple-500",
      jobs: "bg-green-500",
      news: "bg-amber-500",
    };
    return (
      <Badge className={`${colors[category] || "bg-slate-500"} hover:opacity-80`}>
        {category}
      </Badge>
    );
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/buildunion")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-500" />
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Subs</span>
            </TabsTrigger>
            <TabsTrigger value="ai-usage" className="gap-2">
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">AI Usage</span>
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mod</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Sync</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{stats.totalUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{stats.totalProjects}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold">{stats.totalContracts}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Forum Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{stats.forumPosts}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Admin Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold">{stats.adminCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Users with full access</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Moderators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold">{stats.moderatorCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Content moderators</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Registrations
                </CardTitle>
                <CardDescription>Latest users who joined the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name || "Unnamed User"}</p>
                          <p className="text-xs text-muted-foreground">{u.company_name || "No company"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getRoleBadge(u.role)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(u.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription>Manage user roles and permissions</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{u.full_name || "Unnamed User"}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{u.id}</p>
                                </div>
                              </TableCell>
                              <TableCell>{u.company_name || "-"}</TableCell>
                              <TableCell>{getRoleBadge(u.role)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(u.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setNewRole(u.role || "user");
                                    setIsRoleDialogOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Set Role
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{stats.activeSubscriptions}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Free Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-500" />
                    <span className="text-2xl font-bold">{stats.totalUsers - stats.activeSubscriptions}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">
                      {stats.totalUsers > 0 
                        ? `${((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}%`
                        : "0%"
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription Management
                </CardTitle>
                <CardDescription>
                  View and manage user subscriptions via Stripe Dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open("https://dashboard.stripe.com/subscriptions", "_blank")}
                    className="flex-1"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Subscriptions in Stripe
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open("https://dashboard.stripe.com/customers", "_blank")}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Customers in Stripe
                  </Button>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Stripe Dashboard Access Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subscription management is handled through the Stripe Dashboard. 
                      Make sure you have access to the connected Stripe account to view customer details, 
                      manage subscriptions, issue refunds, and view payment analytics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Forum Moderation
                    </CardTitle>
                    <CardDescription>Review and moderate forum posts</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search posts..."
                      value={forumSearchQuery}
                      onChange={(e) => setForumSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No forum posts found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getCategoryBadge(post.category)}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            <h3 className="font-semibold truncate">{post.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {post.author_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {post.replies_count} replies
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/buildunion/forum?post=${post.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setPostToDelete(post)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Usage Tab */}
          <TabsContent value="ai-usage" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                AI Model Usage Analytics
              </h2>
              <Button variant="outline" size="sm" onClick={fetchAiUsageData} disabled={aiUsageLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${aiUsageLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total AI Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{aiUsageStats.totalCalls}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{aiUsageStats.successRate}%</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-bold">{aiUsageStats.totalTokens.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unique Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{Object.keys(aiUsageStats.byModel).length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* By Tier */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Usage by Tier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(aiUsageStats.byTier).sort((a, b) => b[1] - a[1]).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <Badge variant={tier === "premium" ? "default" : tier === "pro" ? "secondary" : "outline"}>
                        {tier.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-sm font-bold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(aiUsageStats.byTier).length === 0 && (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* By Function */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Usage by Function</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(aiUsageStats.byFunction).sort((a, b) => b[1] - a[1]).map(([fn, count]) => (
                    <div key={fn} className="flex items-center justify-between">
                      <span className="text-xs font-mono truncate max-w-[150px]">{fn}</span>
                      <span className="font-mono text-sm font-bold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(aiUsageStats.byFunction).length === 0 && (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* By Model */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Usage by Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(aiUsageStats.byModel).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
                    <div key={model} className="flex items-center justify-between">
                      <span className="text-xs font-mono truncate max-w-[150px]">{model.replace("google/", "").replace("openai/", "")}</span>
                      <span className="font-mono text-sm font-bold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(aiUsageStats.byModel).length === 0 && (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Calls Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent AI Calls (last 500)</CardTitle>
              </CardHeader>
              <CardContent>
                {aiUsageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Function</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Tokens</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiUsageData.slice(0, 50).map(record => (
                          <TableRow key={record.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(record.created_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{record.function_name}</TableCell>
                            <TableCell>
                              <Badge variant={record.tier === "premium" ? "default" : record.tier === "pro" ? "secondary" : "outline"} className="text-xs">
                                {record.tier}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[200px] truncate">
                              {record.model_used.replace(/google\//g, "").replace(/openai\//g, "")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{record.tokens_used}</TableCell>
                            <TableCell>
                              {record.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {aiUsageData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No AI usage data recorded yet. Usage will appear here after AI functions are called.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Sync Tab - removed for Project 3.0 */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Database Sync Dashboard will be rebuilt in Project 3.0
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Role Update Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Set the role for {selectedUser?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "moderator" | "user")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    User - Standard access
                  </div>
                </SelectItem>
                <SelectItem value="moderator">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    Moderator - Can moderate content
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-red-500" />
                    Admin - Full access
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Forum Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{postToDelete?.title}"? 
              This will also delete all {postToDelete?.replies_count || 0} replies. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
