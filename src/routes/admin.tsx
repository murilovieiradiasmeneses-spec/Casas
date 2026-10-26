import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel — CASAS" },
      { name: "description", content: "Painel administrativo de anúncios." },
      { property: "og:title", content: "Painel — CASAS" },
      { property: "og:description", content: "Painel administrativo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

// UX gate only. Real protection is enforced by database RLS (has_role admin).
async function checkAccess() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { state: "signed_out" as const };
  const { data: isAdmin, error } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  if (error) throw error;
  return { state: isAdmin ? ("admin" as const) : ("forbidden" as const), email: data.user.email };
}

function AdminLayout() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin-access"], queryFn: checkAccess });

  if (q.isLoading) return <div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground md:px-8">Verificando acesso...</div>;
  if (q.isError) return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Erro" text="Não foi possível verificar o acesso." action={<Button onClick={() => q.refetch()}>Tentar novamente</Button>} /></div>;
  if (q.data?.state === "signed_out")
    return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Acesso restrito" text="Entre com sua conta de administrador." action={<Button asChild><Link to="/entrar">Entrar</Link></Button>} /></div>;

  const signOut = async () => {
    await supabase.auth.signOut();
    q.refetch();
    navigate({ to: "/" });
  };

  if (q.data?.state === "forbidden")
    return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Sem permissão" text={`A conta ${q.data.email ?? ""} não é administradora.`} action={<Button variant="outline" onClick={signOut}>Sair</Button>} /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-6">
          <Link to="/admin" className="font-display text-2xl" activeOptions={{ exact: true }}>Painel</Link>
          <Link to="/admin/novo" className="text-sm text-muted-foreground hover:text-foreground">Novo imóvel</Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="hidden sm:inline">{q.data?.email}</span><Button size="sm" variant="outline" onClick={signOut}>Sair</Button></div>
      </div>
      <Outlet />
    </div>
  );
}
