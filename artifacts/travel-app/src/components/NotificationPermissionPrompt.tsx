import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notificationService } from "@/lib/notifications";
import { t } from "@/lib/i18n";

const NOTIFICATION_PERMISSION_PROMPT_KEY = "joyplann.notification-permission-prompt-v1";

function hasPromptBeenAnswered(): boolean {
  try {
    return window.localStorage.getItem(NOTIFICATION_PERMISSION_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberPromptDecision() {
  try {
    window.localStorage.setItem(NOTIFICATION_PERMISSION_PROMPT_KEY, "1");
  } catch {
    // A storage failure should not block the permission request.
  }
}

export function NotificationPermissionPrompt() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || typeof Notification === "undefined") {
      setIsVisible(false);
      return;
    }

    if (Notification.permission === "default" && !hasPromptBeenAnswered()) {
      setIsVisible(true);
    }
  }, [isLoaded, isSignedIn]);

  if (!isVisible) return null;

  const handleEnable = async () => {
    rememberPromptDecision();
    setIsRequesting(true);
    const granted = await notificationService.requestPermissions();
    setIsRequesting(false);
    setIsVisible(false);
    if (!granted) {
      // The existing Notification Settings panel remains available for retrying.
    }
  };

  const handleLater = () => {
    rememberPromptDecision();
    setIsVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-6">
      <Card
        role="dialog"
        aria-labelledby="notification-permission-title"
        aria-describedby="notification-permission-description"
        className="pointer-events-auto relative w-full max-w-lg border-primary/30 bg-card/95 p-5 shadow-2xl backdrop-blur"
        data-testid="notification-permission-prompt"
      >
        <button
          type="button"
          onClick={handleLater}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("notificationPrompt.close")}
          data-testid="button-dismiss-notification-prompt"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <div className="mt-0.5 rounded-full bg-primary/15 p-2 text-primary">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="notification-permission-title" className="font-semibold">
              {t("notificationPrompt.title")}
            </h2>
            <p id="notification-permission-description" className="mt-1 text-sm text-muted-foreground">
              {t("notificationPrompt.description")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleLater} disabled={isRequesting}>
            {t("notificationPrompt.later")}
          </Button>
          <Button type="button" onClick={() => void handleEnable()} disabled={isRequesting} data-testid="button-enable-first-notifications">
            <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
            {isRequesting ? t("notificationPrompt.enabling") : t("notificationPrompt.enable")}
          </Button>
        </div>
      </Card>
    </div>
  );
}