/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SWAP_MODE: "mock" | "local" | "cloud" | undefined;
  readonly VITE_LOCAL_SWAP_WS: string | undefined;
  readonly VITE_SIGNALING_WS: string | undefined;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string | undefined;
  readonly VITE_SUPPORT_TELEGRAM: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
