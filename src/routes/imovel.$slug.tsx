import { InterestForm } from "@/components/crm/InterestForm";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import { BedDouble, Bath, Car, Maximize, Trees, Sparkles, MapPin, MessageCircle, ImageOff } from "lucide-react";
import { PropertyMap } from "@/components/PropertyMap";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";
import { fetchBySlug, formatListingPrice, PURPOSE_LABEL, STATUS_LABEL, TYPE_LABEL, whatsappLink } from "@/lib/properties";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/imovel/$slug")({
  head: () => ({
    meta: [
      { title: "Imóvel — CASAS" },
      { name: "description", content: "Detalhes, fotos e localização do imóvel." },
      { property: "og:title", content: "Imóvel — CASAS" },
      { property: "og:description", content: "Detalhes, fotos e localização do imóvel." },
    ],
  }),
  component: PropertyPage,
});

function PropertyPage() {
  const { slug } = Route.useParams();
  const q = useQuery({ queryKey: ["property", slug], queryFn: () => fetchBySlug(slug) });
  const [idx, setIdx] = useState(0);

  if (q.isLoading) return <div className="mx-auto max-w-7xl px-4 py-10 md:px-8"><div className="aspect-[16/9] animate-pulse rounded-xl bg-muted" /></div>;
  if (q.isError) return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Erro ao carregar" text="Tente novamente em instantes." action={<Button onClick={() => q.refetch()}>Tentar novamente</Button>} /></div>;
  if (!q.data) return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Imóvel não encontrado" text="Este anúncio não existe ou não está mais disponível." action={<Button asChild><Link to="/imoveis">Explorar imóveis</Link></Button>} /></div>;

  const { property: p, gallery, agency } = q.data;
  const phone = p.whatsapp || agency?.whatsapp;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const stats = [
    p.property_type !== "terreno" && { icon: BedDouble, label: "Quartos", v: p.bedrooms },
    p.property_type !== "terreno" && { icon: Sparkles, label: "Suítes", v: p.suites },
    p.property_type !== "terreno" && { icon: Bath, label: "Banheiros", v: p.bathrooms },
    { icon: Car, label: "Vagas", v: p.parking },
    p.built_area && { icon: Maximize, label: "Área construída", v: `${Number(p.built_area)} m²` },
    p.land_area && { icon: Trees, label: "Terreno", v: `${Number(p.land_area)} m²` },
  ].filter(Boolean) as { icon: typeof Car; label: string; v: string | number }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="grid gap-2 md:grid-cols-[3fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
          {gallery[idx] ? <img src={gallery[idx].url} alt={p.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-10 w-10" /></div>}
          {gallery.length > 0 && <span className="absolute bottom-3 right-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium">{idx + 1} / {gallery.length}</span>}
        </div>
        <div className="flex gap-2 overflow-x-auto md:grid md:max-h-[calc((100vw-4rem)*0.75*0.625)] md:grid-cols-1 md:content-start md:overflow-y-auto lg:max-h-[620px]">
          {gallery.map((g, i) => (
            <button key={g.id} onClick={() => setIdx(i)} className={cn("aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg md:w-full", i === idx ? "ring-2 ring-primary" : "opacity-75 hover:opacity-100")}>
              <img src={g.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="eyebrow text-primary">{TYPE_LABEL[p.property_type]} · {PURPOSE_LABEL[p.purpose]} · {STATUS_LABEL[p.status]}{p.is_off_plan?' · Na planta':''}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{p.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" />{p.show_address && p.address ? `${p.address} · ` : ""}{p.neighborhood}, {p.city} – {p.state}</p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border bg-card p-4">
                <s.icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-lg font-semibold">{s.v}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {p.description && <div className="mt-10"><h2 className="text-3xl">Sobre o imóvel</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p></div>}

          {p.features.length > 0 && (
            <div className="mt-10"><h2 className="text-3xl">Características</h2>
              <ul className="mt-4 flex flex-wrap gap-2">{p.features.map((f) => <li key={f} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">{f}</li>)}</ul>
            </div>
          )}

          {p.latitude != null && p.longitude != null && (
            <div className="mt-10"><h2 className="text-3xl">Localização</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.show_address ? "Localização do imóvel." : "Localização aproximada, por privacidade."}</p>
              <div className="mt-4 h-80 overflow-hidden rounded-xl border">
                <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
                  <PropertyMap items={[{ ...p, coverUrl: gallery[0]?.url ?? null }]} className="h-full w-full" />
                </ClientOnly>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">{PURPOSE_LABEL[p.purpose]}</p>
            <p className="mt-1 font-display text-4xl font-semibold">{formatListingPrice(p)}</p>
            {phone ? (
              <Button asChild size="lg" className="mt-6 w-full">
                <a href={whatsappLink(phone, p, origin)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Falar no WhatsApp</a>
              </Button>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">Contato indisponível no momento.</p>
            )}
            {agency && <p className="mt-4 text-center text-xs text-muted-foreground">Anunciado por {agency.name}</p>}
            <InterestForm propertyId={p.id} agencyName={agency?.name??"a imobiliária responsável"}/>
          </div>
        </aside>
      </div>
    </div>
  );
}
