import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PinPicker } from "@/components/PropertyMap";
import { propertySchema } from "@/lib/property-schema";
import { slugify, STATUS_LABEL, type Property } from "@/lib/properties";

type Values = Record<string, string | boolean>;

const toValues = (p?: Property): Values => ({
  title: p?.title ?? "",
  slug: p?.slug ?? "",
  description: p?.description ?? "",
  property_type: p?.property_type ?? "casa",
  purpose: p?.purpose ?? "venda",
  status: p?.status ?? "disponivel",
  price: p ? String(p.price) : "",
  bedrooms: String(p?.bedrooms ?? 0),
  suites: String(p?.suites ?? 0),
  bathrooms: String(p?.bathrooms ?? 0),
  parking: String(p?.parking ?? 0),
  built_area: p?.built_area != null ? String(p.built_area) : "",
  land_area: p?.land_area != null ? String(p.land_area) : "",
  address: p?.address ?? "",
  show_address: p?.show_address ?? false,
  cep: p?.cep ?? "",
  neighborhood: p?.neighborhood ?? "",
  city: p?.city ?? "",
  state: p?.state ?? "",
  latitude: p?.latitude != null ? String(p.latitude) : "",
  longitude: p?.longitude != null ? String(p.longitude) : "",
  features: (p?.features ?? []).join(", "),
  featured: p?.featured ?? false,
  published: p?.published ?? false,
  whatsapp: p?.whatsapp ?? "",
});

const sel = "h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

export function PropertyForm({ initial }: { initial?: Property }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [v, setV] = useState<Values>(() => toValues(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string | boolean) => setV((s) => ({ ...s, [k]: val }));

  async function lookupCep() {
    const cep = String(v.cep).replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json());
      if (r.erro) return toast.error("CEP não encontrado.");
      setV((s) => ({ ...s, address: s.address || r.logradouro || "", neighborhood: r.bairro || s.neighborhood, city: r.localidade || s.city, state: r.uf || s.state }));
    } catch {
      /* ignore network error; fields stay editable */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = {
      ...v,
      slug: v.slug || slugify(String(v.title)),
      address: String(v.address).trim() || null,
      features: String(v.features).split(",").map((s) => s.trim()).filter(Boolean),
    };
    const parsed = propertySchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] ??= i.message));
      setErrors(errs);
      toast.error("Revise os campos destacados.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (initial) {
        const { error } = await supabase.from("properties").update(parsed.data).eq("id", initial.id);
        if (error) throw error;
        toast.success("Alterações salvas.");
        qc.invalidateQueries({ queryKey: ["admin-property", initial.id] });
      } else {
        const { data: agency, error: aErr } = await supabase.from("agencies").select("id").eq("slug", "casas").single();
        if (aErr) throw aErr;
        const { data, error } = await supabase.from("properties").insert({ ...parsed.data, agency_id: agency.id }).select("id").single();
        if (error) throw error;
        toast.success("Imóvel criado. Agora envie as fotos.");
        navigate({ to: "/admin/$id", params: { id: data.id } });
      }
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch (err) {
      const msg = (err as { code?: string; message?: string }).code === "23505" ? "Já existe um imóvel com esse endereço de página (slug)." : "Não foi possível salvar. Verifique sua permissão de administrador.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const field = (k: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={String(v[k])} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  const select = (k: string, label: string, opts: [string, string][]) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <select id={k} className={sel} value={String(v[k])} onChange={(e) => set(k, e.target.value)}>{opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>
    </div>
  );
  const lat = v.latitude === "" ? null : Number(v.latitude);
  const lng = v.longitude === "" ? null : Number(v.longitude);

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-2xl">Informações</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {field("title", "Título", { onBlur: () => !v.slug && set("slug", slugify(String(v.title))) })}
          {field("slug", "Endereço da página (slug)", { placeholder: "casa-jardim-europa" })}
        </div>
        <div className="space-y-1.5"><Label htmlFor="description">Descrição</Label><Textarea id="description" rows={6} value={String(v.description)} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="grid gap-4 md:grid-cols-4">
          {select("property_type", "Tipo", [["casa", "Casa"], ["apartamento", "Apartamento"], ["terreno", "Terreno"]])}
          {select("purpose", "Finalidade", [["venda", "Venda"], ["locacao", "Locação"]])}
          {select("status", "Status", Object.entries(STATUS_LABEL))}
          {field("price", "Preço (R$)", { type: "number", min: 0, step: "0.01" })}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          {field("bedrooms", "Quartos", { type: "number", min: 0 })}
          {field("suites", "Suítes", { type: "number", min: 0 })}
          {field("bathrooms", "Banheiros", { type: "number", min: 0 })}
          {field("parking", "Vagas", { type: "number", min: 0 })}
          {field("built_area", "Área constr. (m²)", { type: "number", min: 0, step: "0.01" })}
          {field("land_area", "Terreno (m²)", { type: "number", min: 0, step: "0.01" })}
        </div>
        {field("features", "Características (separadas por vírgula)", { placeholder: "Piscina, Churrasqueira, Jardim" })}
        {field("whatsapp", "WhatsApp do anúncio", { placeholder: "+55 11 99999-9999" })}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="text-2xl">Endereço e localização</h2>
        <div className="grid gap-4 md:grid-cols-[160px_1fr]">
          {field("cep", "CEP", { onBlur: lookupCep, placeholder: "00000-000" })}
          {field("address", "Endereço")}
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_100px]">
          {field("neighborhood", "Bairro")}
          {field("city", "Cidade")}
          {field("state", "UF", { maxLength: 2 })}
        </div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={!!v.show_address} onCheckedChange={(c) => set("show_address", c)} />Exibir endereço exato no anúncio</label>
        <p className="text-sm text-muted-foreground">Clique no mapa para posicionar o pin. Para privacidade, você pode marcar um ponto aproximado.</p>
        <div className="h-80 overflow-hidden rounded-lg border">
          <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
            <PinPicker lat={lat} lng={lng} onChange={(a, b) => setV((s) => ({ ...s, latitude: String(a), longitude: String(b) }))} className="h-full w-full" />
          </ClientOnly>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {field("latitude", "Latitude", { type: "number", step: "any" })}
          {field("longitude", "Longitude", { type: "number", step: "any" })}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-6 rounded-xl border bg-card p-5">
        <label className="flex items-center gap-3 text-sm"><Switch checked={!!v.published} onCheckedChange={(c) => set("published", c)} />Publicado</label>
        <label className="flex items-center gap-3 text-sm"><Switch checked={!!v.featured} onCheckedChange={(c) => set("featured", c)} />Destaque</label>
        <div className="ml-auto"><Button type="submit" size="lg" disabled={saving}>{saving ? "Salvando..." : initial ? "Salvar alterações" : "Criar imóvel"}</Button></div>
      </section>
    </form>
  );
}
