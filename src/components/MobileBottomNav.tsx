import { useNavigate, useLocation } from "react-router-dom";
import { Folder, Users, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const navItems = [
    {
      label: "Projects",
      icon: Folder,
      path: "/buildunion/workspace",
      isActive: location.pathname === "/buildunion/workspace",
    },
    {
      label: "Community",
      icon: Users,
      path: "/buildunion/community",
      isActive: ["/buildunion/community", "/buildunion/forum", "/buildunion/members"].includes(location.pathname),
    },
    {
      label: "Messages",
      icon: MessageSquare,
      path: "/buildunion/messages",
      isActive: location.pathname === "/buildunion/messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
      requiresAuth: true,
    },
    {
      label: "Profile",
      icon: User,
      path: user ? "/buildunion/profile" : "/buildunion/login",
      isActive: location.pathname === "/buildunion/profile" || location.pathname === "/buildunion/profile/view",
    },
  ];

  // Filter out items that require auth if user is not logged in
  const visibleItems = navItems.filter(item => !item.requiresAuth || user);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full px-2 transition-colors relative",
              item.isActive
                ? "text-cyan-600"
                : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-t hover:from-cyan-50/60 hover:to-transparent dark:hover:from-cyan-950/20"
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                "h-5 w-5 transition-transform",
                item.isActive && "scale-110"
              )} />
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[9px] flex items-center justify-center rounded-full"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              item.isActive && "font-semibold"
            )}>
              {item.label}
            </span>
            {item.isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
