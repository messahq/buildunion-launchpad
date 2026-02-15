import { Bell, BellOff, Loader2 } from "lucide-react";
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

  const handleToggle = async () => {
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
              {isSubscribed ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={permission === "denied"}
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
        {permission === "denied" ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-3">
            <p className="text-sm text-red-700">
              Notifications are blocked for this site. Please enable them in your browser settings.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-100"
              onClick={() => {
                // Try to re-request permission (works if user dismissed, not if explicitly blocked)
                Notification.requestPermission().then((result) => {
                  if (result === "granted") {
                    window.location.reload();
                  }
                });
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Re-enable Notifications
            </Button>
            <p className="text-xs text-red-500">
              If this doesn't work: click the lock/info icon in the browser address bar → Notifications → Allow
            </p>
          </div>
        ) : (
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
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
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
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
