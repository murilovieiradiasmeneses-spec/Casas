import { Link } from "@tanstack/react-router";
import { BedDouble, Bath, Car, Maximize, ImageOff } from "lucide-react";
import { formatPrice, PURPOSE_LABEL, STATUS_LABEL, TYPE_LABEL, type PropertyWithCover } from "@/lib/properties";
import { cn } from "@/lib/utils";

export function PropertyCard({
  p,
  active,
  onHover,
  agencySlug,
}: {
  p: PropertyWithCover;
  active?: boolean;
  onHover?: (id: string | null) => void;
  agencySlug?: string;
}) {
  return (
    <a
      href={agencySlug ? "/v/" + encodeURIComponent(agencySlug) + "/imovel/" + encodeURIComponent(p.slug) : "/imovel/" + encodeURIComponent(p.slug)}
      id={`card-${p.id}`}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group block overflow-hidden rounded-xl border bg-card transition-all hover:shadow-soft",
        active && "ring-2 ring-primary",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {p.coverUrl ? (
          <img src={p.coverUrl} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{PURPOSE_LABEL[p.purpose]}</span>
          {p.featured && <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">Destaque</span>}
          {p.status !== "disponivel" && <span className="rounded-full bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-charcoal-foreground">{STATUS_LABEL[p.status]}</span>}
        </div>
      </div>
      <div className="p-4">
        <p className="eyebrow text-muted-foreground">{TYPE_LABEL[p.property_type]} · {p.neighborhood}, {p.city}</p>
        <h3 className="mt-1 line-clamp-1 text-xl">{p.title}</h3>
        <p className="mt-1 text-lg font-semibold">{formatPrice(p.price, p.purpose)}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {p.property_type !== "terreno" && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.bedrooms}</span>}
          {p.property_type !== "terreno" && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>}
          {p.parking > 0 && <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{p.parking}</span>}
          {(p.built_area || p.land_area) && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{Number(p.built_area || p.land_area)} m²</span>}
        </div>
      </div>
    </a>
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-2 p-4"><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /><div className="h-5 w-3/4 animate-pulse rounded bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded bg-muted" /></div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <h3 className="text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
