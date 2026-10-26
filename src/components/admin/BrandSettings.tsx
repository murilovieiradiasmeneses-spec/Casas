import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandingStyle } from "@/lib/agencies";
import type { Agency } from "@/lib/properties";


type Editable = Pick<Agency,
  "name" | "tagline" | "about" | "whatsapp" | "email" | "address" | "instagram" |
  "primary_color" | "secondary_color" | "background_color" | "logo_url" | "hero_url">;

export function BrandSettings() {
  const { activeAgencyId } = useAdminAgency();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["agency-settings", activeAgencyId],
    queryFn: async () => {
      const [agency, allowed] = await Promise.all([
        supabase.from("agencies").select("*").eq("id", activeAgencyId).single(),
        supabase.rpc("can_edit_brand", { _agency_id: activeAgencyId }),
      ]);
      if (agency.error) throw agency.error;
      if (allowed.error) throw allowed.error;
      return { agency: agency.data, canEdit: allowed.data };
    },
  });
  const [form, setForm] = useState<Editable | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo_url" | "hero_url" | null>(null);

  useEffect(() => { setForm(null); }, [activeAgencyId]);
  useEffect(() => {
    if (!q.data) return;
    const a = q.data.agency;
    setForm({
      name: a.name, tagline: a.tagline, about: a.about, whatsapp: a.whatsapp,
      email: a.email, address: a.address, instagram: a.instagram,
      primary_color: a.primary_color, secondary_color: a.secondary_color,
      background_color: a.background_color, logo_url: a.logo_url, hero_url: a.hero_url,
    });
  }, [q.data]);

  async function upload(file: File | undefined, key: "logo_url" | "hero_url") {
    if (!file || !form || !q.data?.canEdit) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Use PNG, JPG ou WEBP de até 5 MB.");
      return;
    }
    setUploading(key);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = activeAgencyId + "/" + crypto.randomUUID() + "." + ext;
    const { error } = await supabase.storage.from("agency-branding").upload(path, file, { contentType: file.type });
    if (error) toast.error("Falha no envio da imagem. Confira o bucket no banco.");
    else {
      const { data } = supabase.storage.from("agency-branding").getPublicUrl(path);
      setForm((p) => p ? { ...p, [key]: data.publicUrl } : p);
      toast.success("Imagem enviada. Salve para aplicar à vitrine.");
    }
    setUploading(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !q.data?.canEdit) return;
    const colors = [form.primary_color, form.secondary_color, form.background_color];
    if (colors.some((x) => !/^#[0-9a-fA-F]{6}$/.test(x))) return toast.error("Use cores no formato #RRGGBB.");
    if (!form.name.trim()) return toast.error("Informe o nome da empresa.");
    setSaving(true);
    const { error } = await supabase.from("agencies").update(form).eq("id", activeAgencyId);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar a identidade visual.");
    toast.success("Identidade visual salva.");
    await qc.invalidateQueries({ queryKey: ["agency-settings", activeAgencyId] });
    await qc.invalidateQueries({ queryKey: ["public-agency"] });
  }

  if (q.isLoading) return <div className="py-12">Carregando identidade visual...</div>;
  if (q.isError || !q.data) return <div className="py-12">Não foi possível carregar as informações.</div>;
  if (!q.data.canEdit) return <div className="rounded-xl border p-10">Seu acesso permite gerenciar imóveis, mas somente o proprietário da empresa pode alterar sua marca.</div>;
  if (!form) return null;
  const set = (k: keyof Editable, value: string | null) => setForm((s) => s ? { ...s, [k]: value } : s);
  const field = (k: keyof Editable, label: string, placeholder = "") => (
    <div className="space-y-1.5"><Label htmlFor={k}>{label}</Label><Input id={k} value={String(form[k] ?? "")} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} /></div>
  );
  return (
    <div className="space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Personalização white-label</p><h1 className="mt-2 text-4xl">Identidade da imobiliária</h1><p className="mt-2 text-sm text-muted-foreground">Logo, capa, contatos e cores diferentes para cada cliente. As alterações só afetam esta empresa.</p></div>
      <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="space-y-6">
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="text-2xl">Dados da empresa</h2>
            {field("name", "Nome da imobiliária / construtora")}
            {field("tagline", "Frase principal da vitrine")}
            <div className="space-y-1.5"><Label>Apresentação</Label><Textarea rows={5} value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Conte a história da sua empresa" /></div>
            <div className="grid gap-4 md:grid-cols-2">{field("whatsapp", "WhatsApp com DDD", "+55 17 99999-9999")}{field("email", "E-mail público")}</div>
            {field("address", "Endereço comercial")}
            {field("instagram", "Instagram", "@imobiliaria")}
          </section>
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="text-2xl">Logotipo e capa</h2>
            {(["logo_url", "hero_url"] as const).map((key) => (
              <div key={key} className="space-y-2 rounded-lg border p-4">
                <Label>{key === "logo_url" ? "Logotipo (PNG transparente recomendado)" : "Imagem principal da vitrine"}</Label>
                {form[key] && <img src={form[key] || ""} alt="" className={key === "logo_url" ? "h-20 w-56 object-contain" : "h-36 w-full rounded-lg object-cover"} />}
                <Input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!uploading} onChange={(e) => { void upload(e.target.files?.[0], key); e.target.value = ""; }} />
                <div className="flex justify-between"><p className="text-xs text-muted-foreground">{uploading === key ? "Enviando..." : "PNG, JPG ou WEBP · até 5 MB"}</p>{form[key] && <button type="button" className="text-xs text-destructive hover:underline" onClick={() => set(key, null)}>Remover</button>}</div>
              </div>
            ))}
          </section>
          <section className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="text-2xl">Paleta de cores</h2>
            {([
              ["primary_color", "Cor principal"],
              ["secondary_color", "Cor escura e rodapé"],
              ["background_color", "Fundo do site"],
            ] as const).map(([k,label]) => (
              <div key={k} className="flex items-center gap-4">
                <input aria-label={label} type="color" value={form[k]} onChange={(e) => set(k, e.target.value)} className="h-12 w-16 cursor-pointer rounded border" />
                <div className="flex-1">{field(k, label)}</div>
              </div>
            ))}
          </section>
          <Button disabled={saving || !!uploading} type="submit" size="lg">{saving ? "Salvando..." : "Salvar personalização"}</Button>
        </form>
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <p className="mb-3 text-sm font-semibold">Prévia da identidade</p>
          <div style={brandingStyle({ ...q.data.agency, ...form })} className="overflow-hidden rounded-xl border bg-background">
            <div className="flex min-h-20 items-center justify-between gap-2 bg-card p-4">{form.logo_url ? <img src={form.logo_url} alt="" className="max-h-12 max-w-32 object-contain" /> : <span className="font-display text-2xl">{form.name}</span>}<span className="text-xs">Menu</span></div>
            <div className="relative flex min-h-56 items-end bg-cover bg-center p-5" style={{ backgroundImage: form.hero_url ? "linear-gradient(to top, #0009, #0003), url(" + JSON.stringify(form.hero_url) + ")" : "linear-gradient(125deg, " + form.secondary_color + ", " + form.primary_color + ")" }}>
              <h3 className="font-display text-3xl text-white">{form.tagline}</h3>
            </div>
            <div className="p-5"><div className="h-24 rounded-lg bg-muted" /><div className="mt-3 h-3 w-2/3 rounded bg-muted" /><button type="button" className="mt-4 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">Ver imóveis</button></div>
            <div className="bg-[var(--charcoal)] p-4 text-xs text-white">{form.name}</div>
          </div>
          <a className="mt-4 inline-block text-sm text-primary underline" href={"/v/" + q.data.agency.slug} target="_blank" rel="noreferrer">Abrir vitrine pública ↗</a>
        </aside>
      </div>
    </div>
  );
}
