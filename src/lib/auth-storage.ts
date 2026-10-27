import type { PreviewAuthStorage } from "@/integrations/supabase/previewAuthStorage";

/**
 * Sessions are intentionally tab-scoped. A brokerage admin and a broker
 * must never overwrite each other's Supabase session in separate tabs.
 * This also avoids Lovable's editor-preview auth broker, which shares
 * credentials between preview surfaces of the same project.
 *
 * sessionStorage survives refresh but not the closing of the tab.
 * It never falls back to global localStorage or the preview message broker.
 */
export function isolatedAuthStorage(): PreviewAuthStorage | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    getItem: (key: string) => window.sessionStorage.getItem(key),
    setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
    removeItem: (key: string) => window.sessionStorage.removeItem(key),
  };
}
