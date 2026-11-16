/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MS_CLIENT_ID?: string;
  readonly VITE_MS_TENANT?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CLERK_PROXY_URL?: string;
  readonly VITE_API_URL?: string;
}
