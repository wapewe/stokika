/**
 * Ambient type declarations for Supabase Edge Functions URL imports.
 * Resolves editor warnings when using the standard TypeScript language server.
 */

declare module 'https://esm.sh/@supabase/supabase-js*' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/*' {
  const content: any;
  export default content;
  export const createClient: any;
  export type SupabaseClient = any;
  export * from '@supabase/supabase-js';
}

declare module 'https://deno.land/std*' {
  export const serve: any;
  export const assertEquals: any;
  export const assertExists: any;
  export const assertRejects: any;
  const content: any;
  export default content;
}

declare module 'https://deno.land/*' {
  const content: any;
  export default content;
}

// Minimal Deno namespace definitions for standard TypeScript language server
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function test(options: Record<string, unknown>, fn: () => void | Promise<void>): void;
}
