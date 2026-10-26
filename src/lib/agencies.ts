import { supabase } from "@/integrations/supabase/client";
import type { CSSProperties } from "react";
import type { Agency } from "@/lib/properties";

export async function getPublicAgency(slug: string): Promise<Agency | null> {
  const { data, error } = await supabase.from("public_agency_profiles").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  if (error) throw error;
  return data as Agency | null;
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
    "--foreground": agency.text_color,
    "--card-foreground": agency.text_color,
    "--popover-foreground": agency.text_color,
    "--secondary-foreground": agency.text_color,
    "--muted-foreground": `color-mix(in srgb, ${agency.text_color} 70%, ${agency.background_color})`,
    "--hero-text": agency.hero_text_color,
  } as CSSProperties;
}
