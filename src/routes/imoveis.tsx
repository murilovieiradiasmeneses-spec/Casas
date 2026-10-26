import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FiltersBar } from "@/components/FiltersBar";
import { CardSkeleton, EmptyState, PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { fetchPublished, parseFilters } from "@/lib/properties";

export const Route = createFileRoute("/imoveis")({
  validateSearch: parseFilters,
  head: () => ({
    meta: [
      { title: "Explorar imóveis — CASAS" },
      { name: "description", content: "Filtre casas, apartamentos e terrenos por cidade, bairro, preço e dormitórios." },
      { property: "og:title", content: "Explorar imóveis — CASAS" },
      { property: "og:description", content: "Catálogo completo de imóveis para venda e locação." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/imoveis" });
  const q = useQuery({ queryKey: ["catalog", filters], queryFn: () => fetchPublished(filters) });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <h1 className="text-4xl md:text-5xl">Explorar imóveis</h1>
      <div className="mt-6"><FiltersBar key={JSON.stringify(filters)} value={filters} onApply={(f) => navigate({ search: f })} /></div>
      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>{q.data ? `${q.data.length} imóvel(is)` : "\u00a0"}</span>
        <Link to="/mapa" search={filters} className="font-medium text-foreground underline-offset-4 hover:underline">Ver no mapa</Link>
      </div>
      <div className="mt-4">
        {q.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}</div>
        ) : q.isError ? (
          <EmptyState title="Erro ao carregar" text="Não conseguimos buscar os imóveis agora." action={<Button variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button>} />
        ) : !q.data?.length ? (
          <EmptyState title="Nenhum imóvel encontrado" text="Ajuste os filtros ou limpe a busca para ver mais opções." action={<Button variant="outline" onClick={() => navigate({ search: {} })}>Limpar filtros</Button>} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{q.data.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
        )}
      </div>
    </div>
  );
}
