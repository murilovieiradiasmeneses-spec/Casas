import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BUCKET, formatListingPrice, STATUS_LABEL, TYPE_LABEL, type Property } from "@/lib/properties";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const qc = useQueryClient();
  const { activeAgencyId } = useAdminAgency();
  const q = useQuery({
    queryKey: ["admin-properties", activeAgencyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("agency_id", activeAgencyId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Property[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Property> }) => {
      const { error } = await supabase.from("properties").update(patch).eq("id", id).eq("agency_id", activeAgencyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-properties", activeAgencyId] }),
    onError: () => toast.error("Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: imgs } = await supabase.from("property_images").select("storage_path").eq("property_id", id);
      const paths = (imgs ?? []).map((i) => i.storage_path).filter((p): p is string => !!p);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      const { error } = await supabase.from("properties").delete().eq("id", id).eq("agency_id", activeAgencyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Imóvel excluído.");
      qc.invalidateQueries({ queryKey: ["admin-properties", activeAgencyId] });
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  const list = q.data ?? [];
  const metrics = [
    { label: "Total", v: list.length },
    { label: "Publicados", v: list.filter((p) => p.published).length },
    { label: "Disponíveis", v: list.filter((p) => p.status === "disponivel").length },
    { label: "Destaques", v: list.filter((p) => p.featured).length },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[20px] border border-border/70 bg-card p-6 shadow-sm"><p className="text-xs text-muted-foreground">{m.label}</p><p className="mt-2 font-display text-4xl font-bold tracking-[-0.055em]">{q.isLoading ? "–" : m.v}</p></div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-3xl md:text-4xl">Anúncios</h2>
        <Button asChild><Link to="/admin/novo">Novo imóvel</Link></Button>
      </div>

      <div className="mt-4">
        {q.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : q.isError ? (
          <EmptyState title="Erro ao carregar" text="Tente novamente." action={<Button onClick={() => q.refetch()}>Recarregar</Button>} />
        ) : !list.length ? (
          <EmptyState title="Nenhum anúncio ainda" text="Cadastre o primeiro imóvel para começar." action={<Button asChild><Link to="/admin/novo">Cadastrar imóvel</Link></Button>} />
        ) : (
          <div className="divide-y overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-sm">
            {list.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABEL[p.property_type]} · {p.neighborhood}, {p.city} · {formatListingPrice(p)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label="Status" className="h-8 rounded-md border bg-card px-2 text-xs" value={p.status} onChange={(e) => update.mutate({ id: p.id, patch: { status: e.target.value } })}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Button size="sm" variant={p.published ? "default" : "outline"} onClick={() => update.mutate({ id: p.id, patch: { published: !p.published } })}>
                    {p.published ? <Eye /> : <EyeOff />}{p.published ? "Publicado" : "Rascunho"}
                  </Button>
                  <Button size="icon" variant={p.featured ? "secondary" : "ghost"} aria-label="Destaque" onClick={() => update.mutate({ id: p.id, patch: { featured: !p.featured } })}>
                    <Star className={p.featured ? "fill-current text-primary" : ""} />
                  </Button>
                  <Button size="icon" variant="ghost" asChild aria-label="Editar"><Link to="/admin/$id" params={{ id: p.id }}><Pencil /></Link></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" aria-label="Excluir"><Trash2 /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir imóvel?</AlertDialogTitle><AlertDialogDescription>"{p.title}" e suas fotos serão removidos permanentemente.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(p.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
