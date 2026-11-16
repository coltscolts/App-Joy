import { Map, Compass, User, Calendar, Briefcase, History } from "lucide-react";
import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  testId: string;
};

const navItems: NavItem[] = [
  { icon: Briefcase, label: t("nav.myTrips"), path: "/trips", testId: "nav-my-trips" },
  { icon: History, label: t("nav.history"), path: "/history", testId: "nav-history" },
  { icon: Calendar, label: t("nav.calendar"), path: "/calendar", testId: "nav-calendar" },
  { icon: Map, label: t("nav.map"), path: "/map", testId: "nav-map" },
  { icon: Compass, label: t("nav.discover"), path: "/discover", testId: "nav-discover" },
  { icon: User, label: t("nav.profile"), path: "/profile", testId: "nav-profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="travel-bottom-nav fixed bottom-0 left-0 right-0 border-t z-50 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
            >
              <button
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all hover-elevate active-elevate-2 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={item.testId}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
