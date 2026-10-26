import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/painel")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acessar painel — CASAS" }, { name: "robots", content: "noindex" }] }),
  component: PortalAccess,
});

async function resolveDestination(): Promise<"login" | "master" | "client" | "denied"> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return "login";
  const { data: isMaster, error: roleError } = await supabase.rpc("has_role", {
    _user_id: data.user.id, _role: "admin",
  });
  if (roleError) throw roleError;
  if (isMaster) return "master";
  const { data: memberships, error: memberError } = await supabase.from("agency_members")
    .select("agency_id").eq("user_id", data.user.id).limit(1);
  if (memberError) throw memberError;
  return memberships?.length ? "client" : "denied";
}
function PortalAccess() {
  const q = useQuery({ queryKey: ["portal-role"], queryFn: resolveDestination, staleTime: 0 });
  if (q.isLoading) return <div className="mx-auto max-w-lg p-16 text-center text-muted-foreground">Abrindo seu painel...</div>;
  if (q.isError) return <div className="mx-auto max-w-lg p-16 text-center">
    <p>Não foi possível conferir seu acesso.</p>
    <Button className="mt-4" onClick={() => q.refetch()}>Tentar novamente</Button>
  </div>;
  if (q.data === "login") return <Navigate to="/entrar" replace />;
  if (q.data === "master") return <Navigate to="/admin" replace />;
  if (q.data === "client") return <Navigate to="/cliente" replace />;
  return <div className="mx-auto max-w-xl p-16 text-center">
    <h1 className="text-3xl">Acesso não vinculado</h1>
    <p className="mt-3 text-muted-foreground">Peça ao administrador da plataforma para vincular este e-mail à sua empresa.</p>
    <Button asChild className="mt-6"><Link to="/">Voltar ao início</Link></Button>
  </div>;
}
