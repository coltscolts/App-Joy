import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Mail, User, Moon, Sun, Monitor } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { t } from "@/lib/i18n";
import { useTheme } from "@/components/theme-provider";

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();
  const initials = user?.fullName?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "JP";

  return (
    <div className="travel-shell min-h-screen pb-24">
      <div className="travel-topography" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-xl px-5 pt-8">
        <header className="travel-header">
          <div className="flex items-center gap-3">
            <div className="travel-brand-mark"><User className="h-6 w-6" /></div>
            <div><p className="travel-eyebrow">JOYPLANN</p><h1 className="travel-page-title">{t("nav.profile")}</h1></div>
          </div>
        </header>

        <Card className="travel-trip-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground">{isLoaded ? user?.fullName || user?.username || t("nav.profile") : "…"}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </Card>

        <h2 className="travel-section-title text-sm uppercase tracking-wider text-muted-foreground mb-3 px-1">{t("profile.darkMode")}</h2>
        <Card className="travel-trip-card overflow-hidden mb-6">
          <div className="flex divide-x divide-border">
            <button
              onClick={() => setTheme("system")}
              aria-pressed={theme === "system"}
              data-testid="button-theme-system"
              className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 transition-colors ${theme === "system" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              <Monitor className="h-5 w-5" />
              <span className="text-sm font-medium">{t("profile.themeSystem")}</span>
            </button>
            <button
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              data-testid="button-theme-light"
              className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 transition-colors ${theme === "light" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              <Sun className="h-5 w-5" />
              <span className="text-sm font-medium">{t("profile.themeLight")}</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              data-testid="button-theme-dark"
              className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 transition-colors ${theme === "dark" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              <Moon className="h-5 w-5" />
              <span className="text-sm font-medium">{t("profile.themeDark")}</span>
            </button>
          </div>
        </Card>

        <Button
          variant="outline" className="travel-outline-action mt-6 w-full gap-2"
          onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" })}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" /> {t("profile.logout")}
        </Button>
      </div>
    </div>
  );
}
