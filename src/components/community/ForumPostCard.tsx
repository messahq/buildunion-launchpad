import { formatDistanceToNow } from "date-fns";
import { MessageSquare, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ForumPostCardProps {
  post: {
    id: string;
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
  };
  onClick: () => void;
}

const categoryColors: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  electrical: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  plumbing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  carpentry: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  masonry: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  hvac: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  safety: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  tools: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  jobs: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export const ForumPostCard = ({ post, onClick }: ForumPostCardProps) => {
  const authorName = post.author?.full_name || post.author?.company_name || "Anonymous";
  const initials = authorName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card 
      className="cursor-pointer hover:border-amber-200 dark:hover:border-amber-700 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2">{post.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className={categoryColors[post.category] || categoryColors.general}>
                {post.category}
              </Badge>
              {post.author?.primary_trade && (
                <span className="text-xs text-muted-foreground">
                  {post.author.primary_trade.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {post.content}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span>{authorName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{post.replies_count}</span>
            </div>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
