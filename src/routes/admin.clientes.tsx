import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, UserPlus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { slugify } from "@/lib/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/clientes")({ component: Clients });

function Clients() {
  const { isPlatformAdmin, setActiveAgencyId } = useAdminAgency();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [memberAgencyId, setMemberAgencyId] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "editor">("owner");

  const q = useQuery({
    queryKey: ["white-label-clients"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const generated = slugify(slug || name);
      if (name.trim().length < 2 || !generated) throw Error("Nome e identificador são obrigatórios.");
      const { error } = await supabase.from("agencies").insert({ name: name.trim(), slug: generated });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado. Já pode personalizar sua vitrine.");
      setName(""); setSlug("");
      qc.invalidateQueries({ queryKey: ["white-label-clients"] });
      qc.invalidateQueries({ queryKey: ["admin-access"] });
    },
    onError: (err) => toast.error((err as Error).message.includes("duplicate") ? "Este identificador já está em uso." : "Erro ao cadastrar. Verifique o nome/identificador."),
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!memberAgencyId || !memberEmail.includes("@")) throw Error("Selecione o cliente e informe o e-mail.");
      const { error } = await supabase.rpc("assign_agency_member", { _agency_id: memberAgencyId, _email: memberEmail, _role: memberRole });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Acesso do cliente vinculado com sucesso."); setMemberEmail(""); },
    onError: (err) => toast.error((err as Error).message.includes("User not found") ? "Crie primeiro a conta em Cloud → Users e tente novamente." : "Não foi possível vincular este usuário."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("agencies").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["white-label-clients"] }),
    onError: () => toast.error("Não foi possível mudar o status."),
  });
  if (!isPlatformAdmin) return <div className="rounded-xl border p-8">Apenas o administrador geral pode cadastrar empresas ou gerenciar acessos.</div>;
  return (
    <div className="space-y-8">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Administração geral</p><h1 className="mt-2 text-4xl">Clientes white-label</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre imobiliárias ou construtoras e controle o acesso de cada empresa, sem misturar imóveis e identidades.</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-2xl"><Building2 className="h-5 w-5" /> Novo cliente</h2>
          <div className="space-y-1.5"><Label htmlFor="name">Nome da empresa</Label><Input id="name" value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="Ex.: Construtora Horizonte" required /></div>
          <div className="space-y-1.5"><Label htmlFor="slug">Identificador único (link)</Label><Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="construtora-horizonte" required /><p className="text-xs text-muted-foreground">Endereço inicial: /v/{slug || "nome-da-empresa"}</p></div>
          <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4" /> {create.isPending ? "Criando..." : "Cadastrar cliente"}</Button>
        </form>
        <form onSubmit={(e) => { e.preventDefault(); assign.mutate(); }} className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-2xl"><UserPlus className="h-5 w-5" /> Liberar acesso vendido</h2>
          <p className="text-xs text-muted-foreground">Primeiro crie o usuário com e-mail e senha em Cloud → Users (Authentication). Depois vincule aqui. Não compartilhe uma senha geral com seus clientes.</p>
          <div className="space-y-1.5"><Label htmlFor="target">Cliente</Label><select id="target" value={memberAgencyId} onChange={(e) => setMemberAgencyId(e.target.value)} required className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecionar cliente</option>{q.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="memberEmail">E-mail da conta existente</Label><Input id="memberEmail" type="email" required value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="cliente@imobiliaria.com.br" /></div>
          <div className="space-y-1.5"><Label htmlFor="memberRole">Permissão</Label><select id="memberRole" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={memberRole} onChange={(e) => setMemberRole(e.target.value as "owner" | "editor")}><option value="owner">Proprietário — imóveis e identidade visual</option><option value="editor">Editor — somente imóveis</option></select></div>
          <Button disabled={assign.isPending} type="submit"><UserPlus className="h-4 w-4" /> {assign.isPending ? "Vinculando..." : "Conceder acesso"}</Button>
        </form>
      </div>
      <div>
        <h2 className="mb-4 text-3xl">Empresas cadastradas</h2>
        {q.isLoading ? <p>Carregando empresas...</p> : q.isError ? <p>Erro ao carregar clientes.</p> : !q.data?.length ? <p>Nenhum cliente ainda.</p> :
          <div className="grid gap-3">{q.data.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
              {a.logo_url ? <img src={a.logo_url} className="h-12 w-16 object-contain" alt="" /> : <Building2 className="h-9 w-9 text-primary" />}
              <div className="min-w-0 flex-1"><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">/v/{a.slug}</p></div>
              <span className={"rounded-full px-3 py-1 text-xs " + (a.active ? "bg-green-100 text-green-900" : "bg-red-100 text-red-800")}>{a.active ? "Ativo" : "Suspenso"}</span>
              <a href={"/v/" + a.slug} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Vitrine <ExternalLink className="h-3 w-3" /></a>
              <Button size="sm" variant="outline" onClick={() => { setActiveAgencyId(a.id); }} asChild><Link to="/admin/marca" onClick={() => setActiveAgencyId(a.id)}>Personalizar</Link></Button>
              <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: a.id, active: !a.active })} disabled={toggleActive.isPending}>{a.active ? "Suspender" : "Ativar"}</Button>
            </div>
          ))}</div>}
      </div>
    </div>
  );
}
