import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Property = Tables<"properties">;
export type PropertyImage = Tables<"property_images">;
export type PropertyWithCover = Property & { coverUrl: string | null };

export const BUCKET = "property-images";

export const TYPE_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
};
export const PURPOSE_LABEL: Record<string, string> = { venda: "Venda", locacao: "Locação" };
export const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  alugado: "Alugado",
};

export function formatPrice(value: number | string, purpose?: string) {
  const n = Number(value);
  const s = n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return purpose === "locacao" ? `${s}/mês` : s;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

/** Builds a wa.me link with a message that names the listing. */
export function whatsappLink(phone: string, p: Pick<Property, "title" | "neighborhood" | "city" | "slug">, origin: string) {
  const digits = phone.replace(/\D/g, "");
  const msg = `Olá! Tenho interesse no imóvel "${p.title}" em ${p.neighborhood}, ${p.city}. ${origin}/imovel/${p.slug}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

/** Photos live in a private bucket; turn stored paths into temporary links. */
export async function signPaths(paths: (string | null | undefined)[]) {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60 * 6);
  data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  return map;
}

export type Filters = {
  q?: string;
  type?: string;
  purpose?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
};

export function parseFilters(search: Record<string, unknown>): Filters {
  const num = (v: unknown) => {
    const n = Number(v);
    return v !== undefined && v !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const type = str(search.type);
  const purpose = str(search.purpose);
  return {
    q: str(search.q),
    type: type && TYPE_LABEL[type] ? type : undefined,
    purpose: purpose && PURPOSE_LABEL[purpose] ? purpose : undefined,
    minPrice: num(search.minPrice),
    maxPrice: num(search.maxPrice),
    bedrooms: num(search.bedrooms),
  };
}

export async function fetchPublished(f: Filters = {}, opts: { featuredOnly?: boolean; limit?: number } = {}) {
  let q = supabase.from("properties").select("*").eq("published", true);
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, " ");
    q = q.or(`city.ilike.%${term}%,neighborhood.ilike.%${term}%`);
  }
  if (f.type) q = q.eq("property_type", f.type);
  if (f.purpose) q = q.eq("purpose", f.purpose);
  if (f.minPrice) q = q.gte("price", f.minPrice);
  if (f.maxPrice) q = q.lte("price", f.maxPrice);
  if (f.bedrooms) q = q.gte("bedrooms", f.bedrooms);
  if (opts.featuredOnly) q = q.eq("featured", true);
  q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  const urls = await signPaths(data.map((p) => p.cover_image_url));
  return data.map((p) => ({ ...p, coverUrl: p.cover_image_url ? urls.get(p.cover_image_url) ?? null : null }));
}

export async function fetchBySlug(slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*, property_images(*), agencies(name, whatsapp)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const images = [...(data.property_images ?? [])].sort((a, b) => a.position - b.position);
  const urls = await signPaths([data.cover_image_url, ...images.map((i) => i.url)]);
  const gallery = images.map((i) => ({ id: i.id, url: urls.get(i.url) ?? "" })).filter((i) => i.url);
  if (data.cover_image_url) {
    const idx = images.findIndex((i) => i.url === data.cover_image_url);
    if (idx > 0) gallery.unshift(gallery.splice(idx, 1)[0]);
  }
  return { property: data as Property, gallery, agency: data.agencies as { name: string; whatsapp: string | null } | null };
}
