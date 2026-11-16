import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ClerkProvider, Show, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark, shadcn } from "@clerk/themes";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Switch, Route, Redirect, Router as WouterRouter, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { BottomNav } from "@/components/BottomNav";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { Button } from "@/components/ui/button";
import Itinerary from "@/pages/Itinerary";
import Calendar from "@/pages/Calendar";
import MapView from "@/pages/MapView";
import Discover from "@/pages/Discover";
import Share from "@/pages/Share";
import Profile from "@/pages/Profile";
import MyTrips from "@/pages/MyTrips";
import NotFound from "@/pages/not-found";
import { t, lang } from "@/lib/i18n";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL
  || (import.meta.env.PROD
    ? `${window.location.origin}${basePath}/api/__clerk`
    : undefined);

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

function Landing() {
  return (
    <main className="travel-landing min-h-[100dvh] px-5 py-8">
      <div className="travel-topography" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col justify-center">
        <img src={`${basePath}/logo-joyplann.png`} alt="JoyPlann" className="h-16 w-16 rounded-2xl object-cover" />
        <p className="travel-landing-eyebrow mt-8 text-xs font-bold tracking-[0.22em]">JOYPLANN</p>
        <h1 className="travel-landing-title mt-3 text-5xl font-bold tracking-[-0.06em] sm:text-6xl">Plan. Travel. Enjoy.</h1>
        <p className="travel-landing-copy mt-5 max-w-md text-lg leading-8">
          {t("auth.landingDescription")}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up" className="inline-flex">
            <Button className="h-12 w-full bg-[#8d466f] px-6 text-base font-bold hover:bg-[#a95883]">{t("auth.createAccount")}</Button>
          </Link>
          <Link href="/sign-in" className="inline-flex">
            <Button variant="outline" className="travel-landing-secondary h-12 w-full px-6 text-base">{t("auth.signIn")}</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

function SignInPage() {
  return <div className="travel-auth-shell flex min-h-[100dvh] items-center justify-center px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="travel-auth-shell flex min-h-[100dvh] items-center justify-center px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/trips" /></Show><Show when="signed-out"><Landing /></Show></>;
}

function ProtectedPage({ component: Component }: { component: React.ComponentType }) {
  return <><Show when="signed-in"><Component /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
    previousUserId.current = userId;
  }), [addListener, client]);
  return null;
}

function ClerkApiTokenBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const activeUserId = userId ?? null;
  const [configuredUserId, setConfiguredUserId] = useState<string | null | undefined>(undefined);

  useLayoutEffect(() => {
    setAuthTokenGetter(isSignedIn ? () => getToken() : null);
    setConfiguredUserId(activeUserId);
    return () => {
      setAuthTokenGetter(null);
    };
  }, [activeUserId, getToken, isSignedIn]);

  if (!isLoaded || configuredUserId !== activeUserId) return null;
  return children;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/trips"><ProtectedPage component={MyTrips} /></Route>
      <Route path="/history"><ProtectedPage component={() => <MyTrips mode="history" />} /></Route>
      <Route path="/trip/:id"><ProtectedPage component={Itinerary} /></Route>
      <Route path="/calendar"><ProtectedPage component={Calendar} /></Route>
      <Route path="/map"><ProtectedPage component={MapView} /></Route>
      <Route path="/discover"><ProtectedPage component={Discover} /></Route>
      <Route path="/share"><ProtectedPage component={Share} /></Route>
      <Route path="/profile"><ProtectedPage component={Profile} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const clerkAppearance = {
    theme: shadcn,
    baseTheme: isDark ? dark : undefined,
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl: `${window.location.origin}${basePath}/logo-joyplann.png`,
      socialButtonsPlacement: "bottom" as const,
      socialButtonsVariant: "blockButton" as const,
    },
    variables: {
      colorPrimary: isDark ? "#8d466f" : "#0879f9",
      colorForeground: isDark ? "#edf6fc" : "#0f172a",
      colorMutedForeground: isDark ? "#b4c3d2" : "#64748b",
      colorDanger: isDark ? "#ef5f6c" : "#dc2626",
      colorBackground: isDark ? "#102139" : "#ffffff",
      colorInput: isDark ? "#162e4d" : "#f8fafc",
      colorInputForeground: isDark ? "#edf6fc" : "#0f172a",
      colorNeutral: isDark ? "#55708e" : "#94a3b8",
      colorText: isDark ? "#edf6fc" : "hsl(222, 47%, 11%)",
      fontFamily: "Inter, sans-serif",
      borderRadius: "0.75rem",
    },
    elements: {
      rootBox: { width: "100%", display: "flex", justifyContent: "center" },
      cardBox: {
        backgroundColor: isDark ? "#102139" : "#ffffff",
        border: isDark ? "1px solid #385675" : "1px solid hsl(214, 32%, 91%)",
        borderRadius: "1rem",
        width: "440px",
        maxWidth: "100%",
        overflow: "hidden",
        boxShadow: isDark ? "0 24px 70px rgba(0,0,0,.35)" : "0 4px 12px rgba(0,0,0,.05)",
      },
      card: { backgroundColor: "transparent", boxShadow: "none", border: "0" },
      footer: { backgroundColor: "transparent", boxShadow: "none", border: "0" },
      headerTitle: { color: isDark ? "#edf6fc" : "#0f172a", fontWeight: "700" },
      headerSubtitle: { color: isDark ? "#b4c3d2" : "#64748b" },
      socialButtonsBlockButtonText: { color: isDark ? "#edf6fc" : "#0f172a" },
      formFieldLabel: { color: isDark ? "#edf6fc" : "#0f172a" },
      footerActionLink: { color: isDark ? "#79d3e4" : "#0879f9", fontWeight: "600" },
      footerActionText: { color: isDark ? "#b4c3d2" : "#64748b" },
      dividerText: { color: isDark ? "#b4c3d2" : "#64748b" },
      identityPreviewEditButton: { color: isDark ? "#79d3e4" : "#0879f9" },
      logoBox: { display: "flex", justifyContent: "center", marginBottom: "0.5rem", width: "100%" },
      logoImage: { width: "52px", height: "52px", marginInline: "auto" },
      socialButtonsBlockButton: { backgroundColor: isDark ? "#162e4d" : "#f8fafc", borderColor: isDark ? "#55708e" : "#cbd5e1" },
      formButtonPrimary: { backgroundColor: isDark ? "#8d466f" : "#0879f9", color: "#fff", fontWeight: "700" },
      formFieldInput: { backgroundColor: isDark ? "#162e4d" : "#f8fafc", borderColor: isDark ? "#55708e" : "#cbd5e1", color: isDark ? "#edf6fc" : "#0f172a" },
      footerAction: { backgroundColor: "transparent" },
      dividerLine: { backgroundColor: isDark ? "#385675" : "#e2e8f0" },
      alert: { backgroundColor: isDark ? "#243b58" : "#f1f5f9", borderColor: isDark ? "#55708e" : "#cbd5e1" },
      otpCodeFieldInput: { backgroundColor: isDark ? "#162e4d" : "#f8fafc", borderColor: isDark ? "#55708e" : "#cbd5e1", color: isDark ? "#edf6fc" : "#0f172a" },
      formFieldRow: { color: isDark ? "#edf6fc" : "#0f172a" },
      main: { color: isDark ? "#edf6fc" : "#0f172a" },
    },
  };

  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={lang === "es" ? { signIn: { start: { title: "Te damos la bienvenida", subtitle: "Inicia sesión para acceder a tu cuenta" } }, signUp: { start: { title: "Crea tu cuenta", subtitle: "Comienza a planificar hoy" } } } : { signIn: { start: { title: "Welcome back", subtitle: "Sign in to access your account" } }, signUp: { start: { title: "Create your account", subtitle: "Start planning today" } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkApiTokenBridge><ClerkQueryClientCacheInvalidator /><TooltipProvider><div className="min-h-screen bg-background"><Router /><Show when="signed-in"><BottomNav /></Show></div><NotificationPermissionPrompt /><Toaster /></TooltipProvider></ClerkApiTokenBridge></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="joyplann-theme">
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
