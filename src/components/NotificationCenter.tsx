import { Bell, Check, CheckCheck, Mail, Users, FileText, CalendarClock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { enUS, hu, es, fr, de, zhCN, ar, pt, ru, ja, hi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Locale } from "date-fns";

const localeMap: Record<string, Locale> = {
  en: enUS, hu, es, fr, de, zh: zhCN, ar, pt, ru, ja, hi,
};

const getNotificationIcon = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes("invit") || lower.includes("meghív")) return <Users className="h-4 w-4 text-sky-500" />;
  if (lower.includes("message") || lower.includes("üzenet")) return <Mail className="h-4 w-4 text-blue-500" />;
  if (lower.includes("task") || lower.includes("feladat")) return <CalendarClock className="h-4 w-4 text-amber-500" />;
  if (lower.includes("contract") || lower.includes("szerződés")) return <FileText className="h-4 w-4 text-emerald-500" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
};

const NotificationCenter = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const locale = localeMap[i18n.language] || enUS;

  const handleClick = (notification: { id: string; read_at: string | null; link: string | null }) => {
    if (!notification.read_at) markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-muted-foreground hover:text-foreground px-2"
          aria-label={t("notifications.title", "Notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[9px] flex items-center justify-center rounded-full"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{t("notifications.title", "Notifications")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              {t("notifications.markAllRead", "Mark all read")}
            </Button>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[360px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              {t("common.loading", "Loading...")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{t("notifications.empty", "No notifications yet")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("notifications.emptyDesc", "You'll see updates here")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    !n.read_at && "bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <div className="mt-0.5 shrink-0">{getNotificationIcon(n.title)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-tight", !n.read_at ? "font-medium" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true, locale })}
                    </p>
                  </div>
                  {!n.read_at && (
                    <div className="shrink-0 mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                  )}
                  {n.read_at && (
                    <Check className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
