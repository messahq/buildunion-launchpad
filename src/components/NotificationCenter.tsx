import { Bell, Check, CheckCheck, Mail, Users, FileText, CalendarClock, Inbox, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
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

const NotificationDetail = ({ n, locale, t, onDelete }: { n: Notification; locale: Locale; t: ReturnType<typeof useTranslation>["t"]; onDelete: (id: string) => void }) => {
  return (
    <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs space-y-1.5">
      {n.body && <p className="text-muted-foreground">{n.body}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground/80">
        <span>{t("notifications.status", "Status")}:</span>
        <span className="font-medium text-foreground">{n.status}</span>
        <span>{t("notifications.sentAt", "Sent")}:</span>
        <span>{format(new Date(n.sent_at), "PPp", { locale })}</span>
        {n.read_at && (
          <>
            <span>{t("notifications.readAt", "Read")}:</span>
            <span>{format(new Date(n.read_at), "PPp", { locale })}</span>
          </>
        )}
        {n.link && (
          <>
            <span>{t("notifications.link", "Link")}:</span>
            <span className="truncate text-primary">{n.link}</span>
          </>
        )}
        {n.data && Object.keys(n.data).length > 0 && (
          <>
            <span>{t("notifications.data", "Data")}:</span>
            <span className="truncate">{JSON.stringify(n.data)}</span>
          </>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 px-2 text-xs gap-1 mt-1"
      >
        <Trash2 className="h-3 w-3" />
        {t("notifications.delete", "Delete")}
      </Button>
    </div>
  );
};

const NotificationCenter = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const locale = localeMap[i18n.language] || enUS;

  const handleClick = (notification: Notification) => {
    if (!notification.read_at) markAsRead(notification.id);
    setExpandedId((prev) => (prev === notification.id ? null : notification.id));
  };

  const handleNavigate = (link: string) => {
    navigate(link);
    setOpen(false);
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
          <div className="flex items-center gap-1">
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
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteAllNotifications}
                className="text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                {t("notifications.deleteAll", "Delete all")}
              </Button>
            )}
          </div>
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
                <div key={n.id}>
                  <button
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
                      {n.body && expandedId !== n.id && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true, locale })}
                        </p>
                        {n.link && expandedId === n.id && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-4 px-0 text-[10px] text-primary"
                            onClick={(e) => { e.stopPropagation(); handleNavigate(n.link!); }}
                          >
                            {t("notifications.goToLink", "Open")}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 mt-1.5 flex items-center gap-1">
                      {!n.read_at && <div className="h-2 w-2 rounded-full bg-amber-500" />}
                      {n.read_at && <Check className="h-3 w-3 text-muted-foreground/40" />}
                      {expandedId === n.id ? <ChevronUp className="h-3 w-3 text-muted-foreground/40" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/40" />}
                    </div>
                  </button>
                  {expandedId === n.id && (
                    <NotificationDetail n={n} locale={locale} t={t} onDelete={deleteNotification} />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
