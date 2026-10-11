/**
 * Supabase Configuration
 * 
 * This file is loaded dynamically and can be configured per environment.
 * The config is exposed on the window object for the TypeScript client to access.
 * 
 * Security Notes:
 * - The anon key is SAFE to expose to the browser (it's designed for client-side use)
 * - Row Level Security (RLS) policies protect your data
 * - NEVER expose the service role key in client-side code
 * 
 * Configuration Instructions:
 * 1. Replace the placeholder values below with your actual Supabase project credentials
 * 2. The URL format is: https://[PROJECT_ID].supabase.co
 * 3. The anon key can be found in your Supabase project settings under API
 */

window.SUPABASE_CONFIG = {
  url: 'https://eidsqrnwfndruuufyacc.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZHNxcm53Zm5kcnV1dWZ5YWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzcxMTEsImV4cCI6MjEwMzMxMzExMX0.FTeFHJwnw1iT4AIknJUSNWyM221x4U-VkfTCdCsKOEY'
};

window.SUPABASE_URL = window.SUPABASE_CONFIG.url;
window.SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;

// Initialize global Supabase client if library is loaded
if (typeof window.supabase !== 'undefined' && !window._supabaseClient) {
  try {
    window._supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.log('✅ Supabase client initialized from external config');
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
  }
}

// Dispatch event for listeners
window.dispatchEvent(new CustomEvent('supabase-config-loaded', {
  detail: window.SUPABASE_CONFIG
}));
