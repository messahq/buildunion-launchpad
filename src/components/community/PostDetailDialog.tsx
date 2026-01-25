import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author?: {
    full_name?: string;
    avatar_url?: string;
    company_name?: string;
  };
}

interface PostDetailDialogProps {
  post: {
    id: string;
    title: string;
    content: string;
    category: string;
    created_at: string;
    user_id: string;
    author?: {
      full_name?: string;
      avatar_url?: string;
      company_name?: string;
      primary_trade?: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostDeleted?: () => void;
}

export const PostDetailDialog = ({ post, open, onOpenChange, onPostDeleted }: PostDetailDialogProps) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (post && open) {
      fetchReplies();
    }
  }, [post, open]);

  const fetchReplies = async () => {
    if (!post) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch author info for replies
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const repliesWithAuthors = (data || []).map(reply => ({
        ...reply,
        author: profiles?.find(p => p.user_id === reply.user_id),
      }));

      setReplies(repliesWithAuthors);
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!user || !post || !newReply.trim()) return;

    if (newReply.trim().length < 5) {
      toast.error("Reply must be at least 5 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("forum_replies").insert({
        post_id: post.id,
        user_id: user.id,
        content: newReply.trim(),
      });

      if (error) throw error;

      setNewReply("");
      fetchReplies();
      toast.success("Reply posted!");
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user || !post || post.user_id !== user.id) return;

    try {
      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post deleted");
      onOpenChange(false);
      onPostDeleted?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  if (!post) return null;

  const authorName = post.author?.full_name || post.author?.company_name || "Anonymous";
  const initials = authorName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <DialogTitle className="text-xl">{post.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{post.category}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            {user?.id === post.user_id && (
              <Button variant="ghost" size="icon" onClick={handleDeletePost}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Original post */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.author?.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{authorName}</p>
                  {post.author?.primary_trade && (
                    <p className="text-xs text-muted-foreground">
                      {post.author.primary_trade.replace(/_/g, " ")}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
            </div>

            <Separator />

            {/* Replies section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                <span>{replies.length} Replies</span>
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading replies...</p>
              ) : replies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond!</p>
              ) : (
                <div className="space-y-4">
                  {replies.map((reply) => {
                    const replyAuthorName = reply.author?.full_name || reply.author?.company_name || "Anonymous";
                    const replyInitials = replyAuthorName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

                    return (
                      <div key={reply.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={reply.author?.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">{replyInitials}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{replyAuthorName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Reply input */}
        {user ? (
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              placeholder="Write a reply..."
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button 
              onClick={handleSubmitReply} 
              disabled={isSubmitting || !newReply.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-4 border-t">
            Please log in to reply to this discussion.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
