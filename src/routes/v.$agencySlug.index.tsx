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

export const Route = createFileRoute("/v/$agencySlug/")({
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
      <header className="sticky top-0 z-[1100] border-b border-border/65 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[82px] max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-8">
          <a href={"/v/" + agencySlug} className="flex items-center gap-3">
            {agency.logo_url ? <img src={agency.logo_url} alt={agency.name} className="max-h-14 max-w-44 object-contain" /> : <span className="font-display text-[25px] font-bold tracking-[-0.055em]">{agency.name}</span>}
          </a>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold sm:gap-6">
            <a href="#imoveis" className="hover:text-primary">Imóveis</a>
            <a href="#mapa" onClick={() => setMode("map")} className="hover:text-primary">Mapa</a>
            {wa && <a className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" href={"https://wa.me/" + wa} target="_blank" rel="noreferrer"><Phone className="h-4 w-4" /> Fale conosco</a>}
          </nav>
        </div>
      </header>
      <section className="px-3 pt-3 sm:px-5 sm:pt-5 lg:px-8">
        <div className="relative isolate mx-auto flex min-h-[540px] max-w-[1500px] items-end overflow-hidden rounded-[26px] bg-[var(--charcoal)] shadow-float sm:min-h-[650px] sm:rounded-[34px]">
          <img src={agency.hero_url || hero} alt="Imagem principal da imobiliária" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
          <div className="mx-auto w-full max-w-7xl px-6 pb-14 pt-32 sm:px-10 sm:pb-20 lg:px-16" style={{ color: "var(--hero-text)" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-current/25 bg-black/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] backdrop-blur-lg">
              Bem-vindo à {agency.name}
            </span>
            <h1 className="mt-7 max-w-[850px] font-display text-[clamp(2.65rem,6.5vw,5.7rem)] font-semibold leading-[1.05] tracking-[-0.06em]">{agency.tagline}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg">Explore imóveis selecionados, descubra os bairros no mapa e converse com quem entende do seu próximo endereço.</p>
            <a href="#imoveis" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5">
              Explorar imóveis <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="imoveis" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-20 md:px-8 md:py-24">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Nosso catálogo</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold md:text-5xl">Encontre um lugar para chamar de seu<span className="text-primary">.</span></h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Explore imóveis disponíveis com fotos, detalhes e a localização que importa para você.</p></div>
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
            <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-[24px] border shadow-soft"><ClientOnly fallback={<div className="h-full bg-muted" />}><PropertyMap items={items.data} agencySlug={agencySlug} className="h-full w-full" /></ClientOnly></div>}
        </div>
      </section>
      {(agency.about || agency.address) && <section className="border-t border-border/75 bg-card"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Quem somos</p><h2 className="mt-3 text-4xl md:text-5xl">{agency.name}</h2><p className="mt-4 whitespace-pre-wrap text-muted-foreground">{agency.about || "Imóveis para uma nova etapa da sua vida."}</p></div><div className="self-center text-sm text-muted-foreground">{agency.address && <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" /> {agency.address}</p>}{agency.email && <p className="mt-3">{agency.email}</p>}</div></div></section>}
      <footer className="bg-[var(--charcoal)] px-4 py-14 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">{agency.logo_url ? <img src={agency.logo_url} alt={agency.name} className="max-h-12 max-w-36 object-contain" /> : <Building2 className="h-6 w-6" />}<span>{agency.name}</span></div>
          <div className="flex flex-wrap items-center gap-4 text-sm">{insta && <a href={"https://instagram.com/" + encodeURIComponent(insta)} target="_blank" rel="noreferrer" className="inline-flex gap-2"><Instagram className="h-4 w-4" /> Instagram</a>}{wa && <a href={"https://wa.me/" + wa} target="_blank" rel="noreferrer">WhatsApp</a>}</div>
          <p className="w-full text-xs text-white/65">© {new Date().getFullYear()} {agency.name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
