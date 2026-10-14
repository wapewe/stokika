// deno-lint-ignore-file no-explicit-any
/**
 * Ambient type declarations for Supabase Edge Functions URL imports.
 * Resolves editor warnings when using the standard TypeScript language server.
 */

declare module 'https://esm.sh/@supabase/supabase-js*' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/*' {
  const content: unknown;
  export default content;
  export const createClient: unknown;
  export type SupabaseClient = unknown;
  export * from '@supabase/supabase-js';
}

declare module 'https://deno.land/std*' {
  export const serve: unknown;
  export const assertEquals: unknown;
  export const assertExists: unknown;
  export const assertRejects: unknown;
  const content: unknown;
  export default content;
}

declare module 'https://deno.land/*' {
  const content: unknown;
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
  export interface KvEntryMaybe<T> {
    key: unknown[];
    value: T | null;
    versionstamp: string | null;
  }
  export interface Kv {
    get<T = unknown>(key: unknown[]): Promise<KvEntryMaybe<T>>;
    set(key: unknown[], value: unknown, options?: { expireIn?: number }): Promise<{ ok: boolean; versionstamp: string }>;
    close(): void;
  }
  export function openKv(path?: string): Promise<Kv>;
}
