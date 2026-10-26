import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { ImageManager } from "@/components/admin/ImageManager";
import { EmptyState } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/$id")({ component: EditProperty });

function EditProperty() {
  const { id } = Route.useParams();
  const { activeAgencyId } = useAdminAgency();
  const q = useQuery({
    queryKey: ["admin-property", activeAgencyId, id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).eq("agency_id", activeAgencyId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <div className="h-60 animate-pulse rounded-xl bg-muted" />;
  if (q.isError || !q.data) return <EmptyState title="Imóvel não encontrado" text="Ele pode ter sido excluído." action={<Button asChild><Link to="/admin">Voltar</Link></Button>} />;
  const p = q.data;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Editar imóvel</h1>
        {p.published && <Link to="/imovel/$slug" params={{ slug: p.slug }} className="text-sm underline-offset-4 hover:underline">Ver página pública</Link>}
      </div>
      <ImageManager property={p} onChange={() => q.refetch()} />
      <PropertyForm key={p.updated_at} initial={p} />
    </div>
  );
}
