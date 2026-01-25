import { useState, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ForumPostCard } from "./ForumPostCard";
import { CreatePostDialog } from "./CreatePostDialog";
import { PostDetailDialog } from "./PostDetailDialog";

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  replies_count: number;
  created_at: string;
  author?: {
    full_name?: string;
    avatar_url?: string;
    company_name?: string;
    primary_trade?: string;
  };
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General Discussion" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "carpentry", label: "Carpentry" },
  { value: "masonry", label: "Masonry" },
  { value: "hvac", label: "HVAC" },
  { value: "safety", label: "Safety" },
  { value: "tools", label: "Tools & Equipment" },
  { value: "jobs", label: "Jobs & Opportunities" },
];

export const CommunityForum = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const { user } = useAuth();

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Fetch author info
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const { data: buProfiles } = await supabase
        .from("bu_profiles")
        .select("user_id, company_name, primary_trade")
        .in("user_id", userIds);

      const postsWithAuthors = (data || []).map(post => ({
        ...post,
        author: {
          ...profiles?.find(p => p.user_id === post.user_id),
          ...buProfiles?.find(p => p.user_id === post.user_id),
        },
      }));

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery !== "") {
        fetchPosts();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("forum_posts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_posts" },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, searchQuery]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsPostDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Discussion Forum</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions, share knowledge, and connect with fellow professionals
          </p>
        </div>
        {user && <CreatePostDialog onPostCreated={fetchPosts} />}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No discussions found</p>
          <p className="text-sm">
            {user ? "Be the first to start a conversation!" : "Log in to start a discussion"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <ForumPostCard
              key={post.id}
              post={post}
              onClick={() => handlePostClick(post)}
            />
          ))}
        </div>
      )}

      {/* Post Detail Dialog */}
      <PostDetailDialog
        post={selectedPost}
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        onPostDeleted={fetchPosts}
      />
    </div>
  );
};
