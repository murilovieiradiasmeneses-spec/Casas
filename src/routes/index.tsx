import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, MapPinned, Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import hero from "@/assets/hero.jpg";
import { FiltersBar } from "@/components/FiltersBar";
import { CardSkeleton, EmptyState, PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { fetchPublished } from "@/lib/properties";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CASAS — Vitrine imobiliária premium" },
      { name: "description", content: "Encontre casas, apartamentos e terrenos selecionados para comprar ou alugar." },
      { property: "og:title", content: "CASAS — Vitrine imobiliária premium" },
      { property: "og:description", content: "Imóveis selecionados para comprar ou alugar, com mapa e contato direto." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const featured = useQuery({ queryKey: ["home-featured"], queryFn: () => fetchPublished({}, { limit: 6 }) });
  return (
    <>
      <section className="px-3 pt-3 sm:px-5 sm:pt-5 lg:px-8">
        <div className="relative isolate mx-auto max-w-[1500px] overflow-hidden rounded-[26px] bg-charcoal shadow-float sm:rounded-[34px]">
          <img src={hero} alt="Casa contemporânea ao entardecer (imagem ilustrativa)" width={1920} height={1088} fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101b17]/90 via-[#101b17]/65 to-[#101b17]/20" />
          <div className="mx-auto flex min-h-[550px] max-w-7xl flex-col justify-center px-6 pb-24 pt-20 sm:min-h-[610px] md:px-12 lg:min-h-[670px] lg:px-16">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-lg">
              <Sparkles className="h-3.5 w-3.5" /> Seu próximo lugar começa aqui
            </div>
            <h1 className="mt-7 max-w-[830px] font-display text-[clamp(2.6rem,6.4vw,5.6rem)] font-semibold leading-[1.05] tracking-[-0.06em] text-white">
              Espaços para viver <span className="text-white/75">a sua próxima história.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Descubra casas, apartamentos e terrenos com uma experiência intuitiva, localização no mapa e contato direto.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/imoveis" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#17231d] transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-lg">Explorar imóveis <ArrowUpRight className="h-4 w-4" /></Link>
              <Link to="/mapa" search={{}} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"><MapPinned className="h-4 w-4" /> Ver no mapa</Link>
            </div>
            <span className="absolute bottom-8 right-8 text-[11px] text-white/65">Imagem ilustrativa</span>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-3 sm:px-7">
          <FiltersBar value={{}} onApply={(filters) => navigate({ to: "/imoveis", search: filters })} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8 md:pt-28">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-primary">Seleção</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] md:text-5xl">Encontre seu novo endereço<span className="text-primary">.</span></h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Um jeito mais simples e agradável de descobrir imóveis que fazem sentido para você.</p>
          </div>
          <Link to="/imoveis" className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-semibold shadow-sm transition-all hover:bg-secondary">Ver todos <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {featured.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
        ) : featured.isError ? (
          <EmptyState title="Não foi possível carregar" text="Tente novamente em instantes." action={<Button variant="outline" onClick={() => featured.refetch()}>Tentar novamente</Button>} />
        ) : !featured.data?.length ? (
          <EmptyState title="Em breve, novos imóveis" text="Nossa curadoria está preparando os primeiros anúncios. Volte em breve." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.data.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
        )}
      </section>
    </>
  );
}
