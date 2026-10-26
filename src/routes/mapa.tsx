import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import { FiltersBar } from "@/components/FiltersBar";
import { PropertyMap } from "@/components/PropertyMap";
import { CardSkeleton, EmptyState, PropertyCard } from "@/components/PropertyCard";
import { fetchPublished, parseFilters } from "@/lib/properties";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mapa")({
  validateSearch: parseFilters,
  head: () => ({
    meta: [
      { title: "Mapa de imóveis — CASAS" },
      { name: "description", content: "Veja os imóveis disponíveis no mapa e encontre o bairro ideal." },
      { property: "og:title", content: "Mapa de imóveis — CASAS" },
      { property: "og:description", content: "Explore imóveis pelo mapa interativo." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/mapa" });
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const q = useQuery({ queryKey: ["catalog", filters], queryFn: () => fetchPublished(filters) });
  const items = q.data ?? [];

  const select = (id: string) => {
    setSelected(id);
    document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="px-4 py-4 md:px-6">
      <FiltersBar key={JSON.stringify(filters)} value={filters} onApply={(f) => navigate({ search: f })} />
      <div className="mt-3 flex gap-2 lg:hidden">
        {(["map", "list"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn("flex-1 rounded-md border py-2 text-sm font-medium", view === v && "bg-charcoal text-charcoal-foreground")}>
            {v === "map" ? "Mapa" : `Lista (${items.length})`}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[420px_1fr]">
        <aside className={cn("space-y-4 lg:block lg:h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-2", view === "map" && "hidden")}>
          {q.isLoading ? [0, 1].map((i) => <CardSkeleton key={i} />) : !items.length ? (
            <EmptyState title="Nada por aqui" text="Nenhum imóvel com esses filtros." />
          ) : (
            items.map((p) => <PropertyCard key={p.id} p={p} active={selected === p.id} onHover={(id) => id && setSelected(id)} />)
          )}
        </aside>
        <div className={cn("relative h-[calc(100vh-220px)] min-h-[420px] overflow-hidden rounded-xl border lg:block", view === "list" && "hidden")}>
          <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
            <PropertyMap items={items} selectedId={selected} onSelect={select} className="h-full w-full" />
          </ClientOnly>
          {q.isError && <div className="absolute inset-x-4 top-4 z-[500] rounded-md bg-destructive p-3 text-sm text-destructive-foreground">Erro ao carregar imóveis.</div>}
        </div>
      </div>
    </div>
  );
}
