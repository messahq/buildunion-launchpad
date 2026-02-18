import { Bell, BellOff } from "lucide-react";
import { HardHatSpinner } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NotificationSettingsProps {
  compact?: boolean;
}

const NotificationSettings = ({ compact = false }: NotificationSettingsProps) => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  console.log("[NotifSettings] isSupported:", isSupported, "isSubscribed:", isSubscribed, "isLoading:", isLoading, "permission:", permission);

  const handleToggle = async () => {
    console.log("[NotifSettings] handleToggle called, isSubscribed:", isSubscribed);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return compact ? null : (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-700">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-amber-500" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed ? "Enabled" : permission === "denied" ? "Blocked - tap to fix" : "Disabled"}
            </p>
          </div>
        </div>
        {isLoading ? (
          <HardHatSpinner size="sm" />
        ) : (
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
          />
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications about project updates, team messages, and important alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {isSubscribed ? "Notifications Enabled" : "Enable Notifications"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? "You'll receive push notifications for updates"
                : "Stay updated with project changes and team activity"}
            </p>
          </div>
          {isLoading ? (
            <HardHatSpinner size="sm" />
          ) : (
            <Button
              onClick={handleToggle}
              variant={isSubscribed ? "outline" : "default"}
              className={
                isSubscribed
                  ? ""
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              }
            >
              {isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          )}
        </div>
        {permission === "denied" && !isSubscribed && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ Notifications are currently blocked for this site. To fix: click the 🔒 lock icon in your browser's address bar → find "Notifications" → change to "Allow" → then refresh the page and click Enable again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
