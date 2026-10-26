import { supabase } from "@/integrations/supabase/client";
import type { CSSProperties } from "react";
import type { Agency } from "@/lib/properties";

export async function getPublicAgency(slug: string): Promise<Agency | null> {
  const { data, error } = await supabase.from("agencies").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw error;
  return data;
}

export function logoName(agency: Agency) {
  return agency.name || "Imóveis";
}
export function brandingStyle(agency: Agency): CSSProperties {
  return {
    "--primary": agency.primary_color,
    "--ring": agency.primary_color,
    "--charcoal": agency.secondary_color,
    "--background": agency.background_color,
  } as CSSProperties;
}
