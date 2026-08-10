/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MICROSOFT_CLIENT_ID: string;
  readonly VITE_MICROSOFT_AUTHORITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
