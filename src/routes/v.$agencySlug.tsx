import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Building2, MapPin, Phone, Instagram } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { getPublicAgency, brandingStyle } from "@/lib/agencies";
import { fetchPublished, type Filters } from "@/lib/properties";
import { PropertyCard, CardSkeleton, EmptyState } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { FiltersBar } from "@/components/FiltersBar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/v/$agencySlug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Vitrine de imóveis" }, { name: "description", content: "Encontre seu próximo imóvel." }] }),
  component: WhiteLabelStore,
});

function WhiteLabelStore() {
  const { agencySlug } = Route.useParams();
  const a = useQuery({ queryKey: ["public-agency", agencySlug], queryFn: () => getPublicAgency(agencySlug) });
  const [filters, setFilters] = useState<Filters>({});
  const [mode, setMode] = useState<"catalog" | "map">("catalog");
  const items = useQuery({
    queryKey: ["store-properties", a.data?.id, filters],
    enabled: !!a.data?.id,
    queryFn: () => fetchPublished(filters, { agencyId: a.data!.id }),
  });
  if (a.isLoading) return <div className="min-h-screen bg-background p-10">Carregando vitrine...</div>;
  if (a.isError) return <div className="p-10 text-center">Não foi possível carregar a imobiliária.</div>;
  if (!a.data) return <div className="p-10 text-center">Esta vitrine não está disponível.</div>;
  const agency = a.data;
  const wa = agency.whatsapp?.replace(/\D/g, "") ?? "";
  const insta = agency.instagram?.replace(/^@/, "").trim() ?? "";
  return (
    <div style={brandingStyle(agency)} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-[1100] border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-8">
          <a href={"/v/" + agencySlug} className="flex items-center gap-3">
            {agency.logo_url ? <img src={agency.logo_url} alt={agency.name} className="max-h-14 max-w-44 object-contain" /> : <span className="font-display text-3xl font-semibold">{agency.name}</span>}
          </a>
          <nav className="flex flex-wrap items-center gap-5 text-sm">
            <a href="#imoveis" className="hover:text-primary">Imóveis</a>
            <a href="#mapa" onClick={() => setMode("map")} className="hover:text-primary">Mapa</a>
            {wa && <a className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground" href={"https://wa.me/" + wa} target="_blank" rel="noreferrer"><Phone className="h-4 w-4" /> Fale conosco</a>}
          </nav>
        </div>
      </header>
      <section className="relative isolate flex min-h-[540px] items-end overflow-hidden">
        <img src={agency.hero_url || hero} alt="Imóveis em destaque" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-28 text-white md:px-8 md:pb-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.25em]">Bem-vindo à {agency.name}</p>
          <h1 className="max-w-3xl font-display text-5xl leading-[1.02] md:text-7xl">{agency.tagline}</h1>
          <p className="mt-4 max-w-xl text-white/85">Encontre casas, apartamentos e terrenos com localização no mapa e contato direto.</p>
          <a href="#imoveis" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Explorar imóveis <ArrowRight className="h-4 w-4" /></a>
        </div>
      </section>
      <section id="imoveis" className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Nosso catálogo</p><h2 className="mt-2 text-4xl md:text-5xl">Encontre seu próximo imóvel</h2></div>
          <div className="flex gap-2">
            <Button type="button" variant={mode === "catalog" ? "default" : "outline"} onClick={() => setMode("catalog")}>Lista</Button>
            <Button type="button" variant={mode === "map" ? "default" : "outline"} onClick={() => setMode("map")}>Mapa</Button>
          </div>
        </div>
        <div className="mb-7"><FiltersBar value={filters} onApply={setFilters} /></div>
        <div id="mapa">
          {items.isLoading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map((i) => <CardSkeleton key={i} />)}</div> :
            items.isError ? <EmptyState title="Não foi possível carregar" text="Tente novamente." action={<Button onClick={() => items.refetch()}>Recarregar</Button>} /> :
            !items.data?.length ? <EmptyState title="Ainda não há imóveis" text="Novas oportunidades serão publicadas aqui em breve." /> :
            mode === "catalog" ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.data.map((p) => <PropertyCard key={p.id} p={p} agencySlug={agencySlug} />)}</div> :
            <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-xl border"><ClientOnly fallback={<div className="h-full bg-muted" />}><PropertyMap items={items.data} agencySlug={agencySlug} className="h-full w-full" /></ClientOnly></div>}
        </div>
      </section>
      {(agency.about || agency.address) && <section className="border-t bg-card"><div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 md:grid-cols-2 md:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Quem somos</p><h2 className="mt-3 text-4xl">{agency.name}</h2><p className="mt-4 whitespace-pre-wrap text-muted-foreground">{agency.about || "Imóveis para uma nova etapa da sua vida."}</p></div><div className="self-center text-sm text-muted-foreground">{agency.address && <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" /> {agency.address}</p>}{agency.email && <p className="mt-3">{agency.email}</p>}</div></div></section>}
      <footer className="bg-[var(--charcoal)] px-4 py-12 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">{agency.logo_url ? <img src={agency.logo_url} alt={agency.name} className="max-h-12 max-w-36 object-contain" /> : <Building2 className="h-6 w-6" />}<span>{agency.name}</span></div>
          <div className="flex flex-wrap items-center gap-4 text-sm">{insta && <a href={"https://instagram.com/" + encodeURIComponent(insta)} target="_blank" rel="noreferrer" className="inline-flex gap-2"><Instagram className="h-4 w-4" /> Instagram</a>}{wa && <a href={"https://wa.me/" + wa} target="_blank" rel="noreferrer">WhatsApp</a>}</div>
          <p className="w-full text-xs text-white/65">© {new Date().getFullYear()} {agency.name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
