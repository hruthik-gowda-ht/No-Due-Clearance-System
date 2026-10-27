/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_COLLEGE_NAME: string;
  readonly VITE_COLLEGE_ACRONYM: string;
  readonly VITE_DEFAULT_ATTENDANCE_THRESHOLD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
