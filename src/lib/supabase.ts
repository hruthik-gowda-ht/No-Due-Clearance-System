import { createClient } from '@supabase/supabase-js';

const globalAny = globalThis as any;

const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof globalAny.process !== 'undefined' && globalAny.process.env?.VITE_SUPABASE_URL) || 
  'https://placeholder.supabase.co';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof globalAny.process !== 'undefined' && globalAny.process.env?.VITE_SUPABASE_ANON_KEY) || 
  'placeholder-anon-key';

export const isLiveSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  !supabaseUrl.includes('placeholder') && 
  Boolean(supabaseAnonKey) && 
  !supabaseAnonKey.includes('placeholder');

if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class MockWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
});
