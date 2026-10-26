import { BedDouble, Bath, Car, Maximize, ImageOff, ArrowUpRight, MapPin } from "lucide-react";
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
        "group card-lift block overflow-hidden rounded-[24px] border border-border/75 bg-card shadow-sm hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-float focus-visible:outline-2",
        active && "ring-2 ring-primary",
      )}
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-muted">
        {p.coverUrl ? (
          <img src={p.coverUrl} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur">{PURPOSE_LABEL[p.purpose]}</span>
          {p.featured && <span className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm">Destaque</span>}
          {p.status !== "disponivel" && <span className="rounded-full bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-charcoal-foreground">{STATUS_LABEL[p.status]}</span>}
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />{p.neighborhood}, {p.city}</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[21px] leading-snug">{p.title}</h3>
          <span className="shrink-0 rounded-full bg-secondary p-2 text-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground"><ArrowUpRight className="h-4 w-4" /></span>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-[-0.045em]">{formatPrice(p.price, p.purpose)}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/70 pt-4 text-xs font-medium text-muted-foreground">
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
    <div className="overflow-hidden rounded-[24px] border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-2 p-4"><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /><div className="h-5 w-3/4 animate-pulse rounded bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded bg-muted" /></div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed bg-card px-6 py-20 text-center shadow-sm">
      <h3 className="text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
