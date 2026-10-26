import { InterestForm } from "@/components/crm/InterestForm";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BedDouble, Bath, Car, Maximize, MapPin, Phone } from "lucide-react";
import { getPublicAgency, brandingStyle } from "@/lib/agencies";
import { fetchBySlug, formatPrice, STATUS_LABEL, PURPOSE_LABEL, TYPE_LABEL, whatsappLink } from "@/lib/properties";
import { PropertyMap } from "@/components/PropertyMap";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/v/$agencySlug/imovel/$slug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Detalhes do imóvel" }] }),
  component: BrandedProperty,
});

function BrandedProperty() {
  const { agencySlug, slug } = Route.useParams();
  const a = useQuery({ queryKey: ["public-agency", agencySlug], queryFn: () => getPublicAgency(agencySlug) });
  const p = useQuery({
    queryKey: ["tenant-property", a.data?.id, slug],
    enabled: !!a.data?.id,
    queryFn: () => fetchBySlug(slug, a.data!.id),
  });
  const [current, setCurrent] = useState(0);
  if (a.isLoading || p.isLoading) return <div className="min-h-screen p-10">Carregando imóvel...</div>;
  if (a.isError || p.isError) return <div className="p-10">Erro ao carregar o imóvel.</div>;
  if (!a.data) return <div className="p-10">Vitrine indisponível.</div>;
  const agency = a.data;
  if (!p.data) return <div style={brandingStyle(agency)} className="min-h-screen p-10"><a className="text-primary underline" href={"/v/" + agencySlug}>Voltar à imobiliária</a><h1 className="mt-8 text-4xl">Imóvel não encontrado</h1></div>;
  const { property, gallery } = p.data;
  const stats = [
    [BedDouble, "Quartos", property.bedrooms],
    [Bath, "Banheiros", property.bathrooms],
    [Car, "Vagas", property.parking],
    [Maximize, "Área construída", property.built_area ? Number(property.built_area) + " m²" : "—"],
  ] as const;
  const wa = property.whatsapp || agency.whatsapp;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div style={brandingStyle(agency)} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 md:px-8"><a href={"/v/" + agencySlug} className="flex items-center gap-3">{agency.logo_url ? <img src={agency.logo_url} alt={agency.name} className="max-h-14 max-w-40 object-contain" /> : <span className="font-display text-2xl">{agency.name}</span>}</a><a href={"/v/" + agencySlug} className="flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" /> Voltar aos imóveis</a></div></header>
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid gap-3 md:grid-cols-[3fr_1fr]">
          <div className="aspect-[16/10] overflow-hidden rounded-[24px] bg-muted">{gallery.length ? <img src={gallery[current]?.url || gallery[0].url} alt={property.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground">Sem fotos</div>}</div>
          <div className="flex gap-2 overflow-x-auto md:grid md:max-h-[520px] md:grid-cols-1">{gallery.map((img,i) => <button key={img.id} className={"aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg border-2 md:w-full " + (i === current ? "border-primary" : "border-transparent")} onClick={() => setCurrent(i)}><img src={img.url} alt="" className="h-full w-full object-cover" /></button>)}</div>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{TYPE_LABEL[property.property_type]} · {PURPOSE_LABEL[property.purpose]} · {STATUS_LABEL[property.status]}</p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">{property.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {property.show_address && property.address ? property.address + " · " : ""}{property.neighborhood}, {property.city} – {property.state}</p>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">{stats.filter(([icon,label]) => property.property_type !== "terreno" || label === "Área construída").map(([Icon,label,val]) => <div key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 font-bold">{val}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
            {property.land_area && <p className="mt-4 text-muted-foreground">Área do terreno: {Number(property.land_area)} m²</p>}
            {property.suites > 0 && <p className="mt-2 text-muted-foreground">Suítes: {property.suites}</p>}
            {property.description && <section className="mt-12"><h2 className="text-3xl">Sobre o imóvel</h2><p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{property.description}</p></section>}
            {property.features.length > 0 && <section className="mt-10"><h2 className="text-3xl">Diferenciais</h2><div className="mt-4 flex flex-wrap gap-2">{property.features.map((f) => <span key={f} className="rounded-full border bg-card px-4 py-2 text-sm">{f}</span>)}</div></section>}
            {property.latitude != null && property.longitude != null && <section className="mt-10"><h2 className="text-3xl">Localização</h2><p className="mt-2 text-sm text-muted-foreground">{property.show_address ? "Localização do imóvel" : "Localização aproximada para preservar a privacidade"}</p><div className="mt-4 h-80 overflow-hidden rounded-xl border"><ClientOnly fallback={<div className="h-full bg-muted" />}><PropertyMap items={[{ ...property, coverUrl: gallery[0]?.url ?? null }]} agencySlug={agencySlug} className="h-full w-full" /></ClientOnly></div></section>}
          </div>
          <aside className="lg:sticky lg:top-5 lg:self-start"><div className="rounded-[24px] border bg-card p-7 shadow-float"><p className="text-sm text-muted-foreground">{PURPOSE_LABEL[property.purpose]}</p><p className="mt-2 font-display text-4xl font-semibold">{formatPrice(property.price, property.purpose)}</p>{wa ? <Button size="lg" asChild className="mt-6 w-full"><a href={whatsappLink(wa, property, origin + "/v/" + encodeURIComponent(agencySlug))} target="_blank" rel="noreferrer"><Phone className="h-4 w-4" /> Tenho interesse</a></Button> : <p className="mt-6 text-sm text-muted-foreground">Contato não informado.</p>}<p className="mt-5 text-center text-xs text-muted-foreground">Anunciado por {agency.name}</p><InterestForm propertyId={property.id} agencyName={agency.name}/></div></aside>
        </div>
      </main>
      <footer className="mt-16 bg-[var(--charcoal)] px-4 py-10 text-white"><div className="mx-auto max-w-7xl text-sm">{agency.name} · © {new Date().getFullYear()}</div></footer>
    </div>
  );
}
