import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";
import { AdminAgencyContext, type AgencyOption } from "@/contexts/AdminAgencyContext";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Painel — CASAS" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

async function checkAccess() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { state: "signed_out" as const };
  const { data: isAdmin, error } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
  if (error) throw error;
  const { data: membership, error: mErr } = await supabase.from("agency_members").select("agency_id").eq("user_id", auth.user.id);
  if (mErr) throw mErr;
  if (!isAdmin && !membership?.length) return { state: "forbidden" as const, email: auth.user.email };
  let agenciesQuery = supabase.from("agencies").select("id,name,slug").order("name");
  if (!isAdmin) agenciesQuery = agenciesQuery.in("id", (membership ?? []).map((m) => m.agency_id)).eq("active", true);
  const { data: agencies, error: agencyError } = await agenciesQuery;
  if (agencyError) throw agencyError;
  return {
    state: "authorized" as const, email: auth.user.email,
    isPlatformAdmin: !!isAdmin, agencies: (agencies ?? []) as AgencyOption[],
  };
}
function AdminLayout() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin-access"], queryFn: checkAccess, staleTime: 60_000 });
  const [selected, setSelected] = useState<string>("");
  if (q.isLoading) return <div className="mx-auto max-w-7xl px-4 py-16">Verificando acesso...</div>;
  if (q.isError) return <div className="mx-auto max-w-xl p-10"><EmptyState title="Erro" text="Não foi possível verificar permissões." action={<Button onClick={() => q.refetch()}>Tentar novamente</Button>} /></div>;
  const signOut = async () => {
    await supabase.auth.signOut();
    q.refetch();
    navigate({ to: "/" });
  };
  if (q.data?.state === "signed_out") return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Acesso restrito" text="Entre com sua conta." action={<Button asChild><Link to="/entrar">Entrar</Link></Button>} /></div>;
  if (q.data?.state === "forbidden") return <div className="mx-auto max-w-xl px-4 py-16"><EmptyState title="Sem permissão" text="Seu usuário não está vinculado a nenhuma imobiliária." action={<Button onClick={signOut}>Sair</Button>} /></div>;
  if (!q.data || q.data.state !== "authorized") return null;

  const agencies = q.data.agencies;
  const activeAgencyId = agencies.find((a) => a.id === selected)?.id ?? agencies[0]?.id ?? "";
  return (
    <AdminAgencyContext.Provider value={{ activeAgencyId, agencies, isPlatformAdmin: q.data.isPlatformAdmin, setActiveAgencyId: setSelected }}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/admin" className="font-display text-2xl">Painel</Link>
            <Link to="/admin/novo" className="text-sm hover:underline">Novo imóvel</Link>
            <Link to="/admin/marca" className="text-sm hover:underline">Identidade visual</Link>
            {q.data.isPlatformAdmin && <Link to="/admin/clientes" className="text-sm hover:underline">Meus clientes</Link>}
            {q.data.isPlatformAdmin && <Link to="/admin/pagamentos" className="text-sm hover:underline">Pagamentos</Link>}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground lg:inline">{q.data.email}</span>
            <Button onClick={signOut} variant="outline" size="sm">Sair</Button>
          </div>
        </div>
        <div className="mb-7 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <label htmlFor="agency-active" className="text-sm font-medium">Empresa selecionada:</label>
          <select id="agency-active" className="min-w-52 rounded-md border bg-background px-3 py-2 text-sm" value={activeAgencyId} onChange={(e) => { setSelected(e.target.value); navigate({ to: "/admin" }); }}>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {activeAgencyId && <a href={"/v/" + agencies.find((a) => a.id === activeAgencyId)?.slug} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">Abrir vitrine ↗</a>}
        </div>
        {activeAgencyId ? <Outlet /> : <EmptyState title="Nenhuma empresa cadastrada" text="Cadastre um cliente para começar." />}
      </div>
    </AdminAgencyContext.Provider>
  );
}
