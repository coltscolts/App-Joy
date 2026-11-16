import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { notificationService } from "@/lib/notifications";
import { t } from "@/lib/i18n";

export type NotificationTiming = "15min" | "30min" | "1hour" | "2hours" | "1day";

const timingKeys: Record<NotificationTiming, keyof typeof import("@/lib/i18n")["t"] extends never ? string : string> = {
  "15min": "notificationSettings.timing15min",
  "30min": "notificationSettings.timing30min",
  "1hour": "notificationSettings.timing1hour",
  "2hours": "notificationSettings.timing2hours",
  "1day": "notificationSettings.timing1day",
};

function getTimingLabel(timing: NotificationTiming): string {
  const map: Record<NotificationTiming, string> = {
    "15min": t("notificationSettings.timing15min"),
    "30min": t("notificationSettings.timing30min"),
    "1hour": t("notificationSettings.timing1hour"),
    "2hours": t("notificationSettings.timing2hours"),
    "1day": t("notificationSettings.timing1day"),
  };
  return map[timing];
}

interface NotificationSettingsProps {
  onSave?: (settings: { enabled: boolean; timings: NotificationTiming[] }) => void;
}

export function NotificationSettings({ onSave }: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(true);
  const [selectedTimings, setSelectedTimings] = useState<NotificationTiming[]>(["1hour", "1day"]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    const permission = await notificationService.checkPermissions();
    setPermissionGranted(permission.granted);
    setPushEnabled(permission.granted);
  };

  const handleEnablePushNotifications = async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      setPushEnabled(true);
      setPermissionGranted(true);
      console.log('Push notifications enabled, token:', token);
    } else {
      setPushEnabled(false);
    }
  };

  const toggleTiming = (timing: NotificationTiming) => {
    setSelectedTimings(prev =>
      prev.includes(timing)
        ? prev.filter(t => t !== timing)
        : [...prev, timing]
    );
  };

  const handleSave = async () => {
    onSave?.({ enabled, timings: selectedTimings });
    console.log('Notification settings saved:', { enabled, timings: selectedTimings });

    if (enabled && pushEnabled) {
      console.log('Scheduling notifications for upcoming activities...');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{t("notificationSettings.title")}</h3>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          data-testid="switch-notifications-master"
          aria-label={t("notificationSettings.title")}
        />
      </div>

      {enabled ? (
        <>
          {/* iOS Push Notifications */}
          <Card className="p-3 mb-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{t("notificationSettings.iosPush")}</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {permissionGranted
                    ? t("notificationSettings.pushEnabled")
                    : t("notificationSettings.pushDisabled")
                  }
                </p>
                {!permissionGranted && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnablePushNotifications}
                    className="gap-2"
                    data-testid="button-enable-push"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {t("notificationSettings.enablePush")}
                  </Button>
                )}
                {permissionGranted && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Bell className="w-3 h-3" />
                    {t("notificationSettings.active")}
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          <p className="text-sm text-muted-foreground mb-4">
            {t("notificationSettings.chooseReminders")}
          </p>

          <div className="space-y-2 mb-4">
            <Label className="text-sm font-medium">{t("notificationSettings.reminderTimes")}</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(timingKeys) as NotificationTiming[]).map((timing) => (
                <Badge
                  key={timing}
                  variant={selectedTimings.includes(timing) ? "default" : "outline"}
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => toggleTiming(timing)}
                  data-testid={`timing-${timing}`}
                  aria-pressed={selectedTimings.includes(timing)}
                >
                  {getTimingLabel(timing)}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <Label className="text-sm font-medium">{t("notificationSettings.notificationTypes")}</Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="flights" className="text-sm">{t("notificationSettings.flightsTrains")}</Label>
              <Switch id="flights" defaultChecked data-testid="switch-flights" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hotels" className="text-sm">{t("notificationSettings.hotelCheckin")}</Label>
              <Switch id="hotels" defaultChecked data-testid="switch-hotels" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="activities" className="text-sm">{t("notificationSettings.activitiesTours")}</Label>
              <Switch id="activities" defaultChecked data-testid="switch-activities" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="restaurants" className="text-sm">{t("notificationSettings.restaurantRes")}</Label>
              <Switch id="restaurants" defaultChecked data-testid="switch-restaurants" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="fitness" className="text-sm">{t("notificationSettings.fitnessWellness")}</Label>
              <Switch id="fitness" defaultChecked data-testid="switch-fitness" />
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleSave}
            data-testid="button-save-notifications"
          >
            <Bell className="w-4 h-4" />
            {t("notificationSettings.save")}
          </Button>
        </>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <BellOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("notificationSettings.disabled")}</p>
        </div>
      )}
    </Card>
  );
}
