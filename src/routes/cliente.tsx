import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, ExternalLink, Home, Images, Paintbrush } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminAgencyContext, type AgencyOption } from "@/contexts/AdminAgencyContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";

export const Route = createFileRoute("/cliente")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Minha imobiliária — CASAS" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: ClientLayout,
});

async function loadClient() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { state: "signed_out" as const };
  const { data: memberships, error: mError } = await supabase.from("agency_members")
    .select("agency_id,role").eq("user_id", auth.user.id);
  if (mError) throw mError;
  if (!memberships?.length) return { state: "no_agency" as const };
  const { data: agencies, error: aError } = await supabase.from("agencies")
    .select("id,name,slug,active").in("id", memberships.map((m) => m.agency_id))
    .eq("active", true).order("name");
  if (aError) throw aError;
  if (!agencies?.length) return { state: "inactive" as const };
  return {
    state: "authorized" as const,
    email: auth.user.email,
    agencies: agencies as AgencyOption[],
  };
}

function ClientLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["client-access"], queryFn: loadClient, staleTime: 20_000 });
  const [selected, setSelected] = useState("");
  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/entrar" });
  }
  if (q.isLoading) return <div className="mx-auto max-w-6xl p-8 text-muted-foreground">Preparando seu painel...</div>;
  if (q.isError) return <div className="mx-auto max-w-lg px-4 py-14">
    <EmptyState title="Não foi possível conferir suas permissões" text="Tente atualizar a página." action={<Button onClick={() => q.refetch()}>Tentar novamente</Button>} />
  </div>;
  if (q.data?.state === "signed_out") return <div className="mx-auto max-w-lg px-4 py-14">
    <EmptyState title="Entre para gerenciar seus imóveis" text="Use o e-mail autorizado pela imobiliária." action={<Button asChild><Link to="/entrar">Entrar</Link></Button>} />
  </div>;
  if (q.data?.state !== "authorized") return <div className="mx-auto max-w-lg px-4 py-14">
    <EmptyState title="Sem acesso ativo" text="A conta ainda não está vinculada a uma empresa ativa. Entre em contato com o responsável pelo CASAS." action={<Button onClick={signOut}>Sair da conta</Button>} />
  </div>;

  const agencies = q.data.agencies;
  const activeAgencyId = agencies.find((a) => a.id === selected)?.id ?? agencies[0].id;
  const activeAgency = agencies.find((a) => a.id === activeAgencyId)!;
  const nav = "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted";
  const publicUrl = "/v/" + encodeURIComponent(activeAgency.slug);
  return (
    <AdminAgencyContext.Provider value={{
      isPlatformAdmin: false, activeAgencyId, agencies, setActiveAgencyId: setSelected,
    }}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Painel do cliente</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{activeAgency.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Somente os imóveis e informações desta empresa aparecem aqui.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" /> Ver minha vitrine
            </a></Button>
            <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
          </div>
        </div>

        {agencies.length > 1 && <div className="mt-6 max-w-md">
          <label htmlFor="company-switch" className="mb-1 block text-sm font-medium">Empresa vinculada</label>
          <select id="company-switch" className="w-full rounded-md border bg-card p-3 text-sm" value={activeAgencyId} onChange={(e) => {
            setSelected(e.target.value); navigate({ to: "/cliente" });
          }}>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>}

        <div className="mt-7 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><span className="text-sm font-semibold">Link exclusivo da empresa</span></div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">{typeof window !== "undefined" ? window.location.origin : ""}{publicUrl}</code>
            <Button variant="outline" size="sm" onClick={async () => {
              try { await navigator.clipboard.writeText(window.location.origin + publicUrl); } catch { /* user may select the text manually */ }
            }}>Copiar link</Button>
          </div>
        </div>

        <nav className="mt-7 flex flex-wrap items-center gap-2 border-b pb-4">
          <Link to="/cliente" activeOptions={{ exact: true }} className={nav} activeProps={{ className: "bg-secondary text-foreground" }}><Home className="h-4 w-4" /> Meus imóveis</Link>
          <Link to="/cliente/novo" className={nav} activeProps={{ className: "bg-secondary text-foreground" }}><Images className="h-4 w-4" /> Cadastrar imóvel</Link>
          <Link to="/cliente/marca" className={nav} activeProps={{ className: "bg-secondary text-foreground" }}><Paintbrush className="h-4 w-4" /> Identidade visual</Link>
        </nav>
        <div className="mt-6"><Outlet /></div>
      </div>
    </AdminAgencyContext.Provider>
  );
}
