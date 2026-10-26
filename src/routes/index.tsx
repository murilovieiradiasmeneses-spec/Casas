import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
      <section className="relative isolate">
        <img src={hero} alt="Casa contemporânea ao entardecer (imagem ilustrativa)" width={1920} height={1088} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-overlay" />
        <div className="mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-32 md:px-8 md:pb-16">
          <p className="eyebrow text-charcoal-foreground/80">Imóveis selecionados</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[1.02] text-charcoal-foreground md:text-7xl">Arquitetura para viver bem.</h1>
          <p className="mt-4 max-w-xl text-charcoal-foreground/85">Casas, apartamentos e terrenos escolhidos a dedo, com localização no mapa e contato direto.</p>
          <div className="mt-8">
            <FiltersBar value={{}} onApply={(f) => navigate({ to: "/imoveis", search: f })} />
          </div>
          <p className="mt-3 text-[11px] text-charcoal-foreground/60">Imagem ilustrativa</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">Seleção</p>
            <h2 className="mt-2 text-4xl md:text-5xl">Imóveis em destaque</h2>
          </div>
          <Link to="/imoveis" className="text-sm font-medium underline-offset-4 hover:underline">Ver todos</Link>
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
