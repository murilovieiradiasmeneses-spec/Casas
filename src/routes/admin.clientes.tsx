import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, UserPlus, ExternalLink, Copy, FolderOpen, Users, HardDriveDownload, Mail, ShieldCheck, X, Send } from "lucide-react";
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
  const [editingAgencyId, setEditingAgencyId] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");


  const q = useQuery({
    queryKey: ["white-label-clients"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const [agencies, members, pending] = await Promise.all([
        supabase.from("agencies").select("*").neq("slug", "casas").order("created_at", { ascending: false }),
        supabase.rpc("list_agency_users_admin"),
        supabase.rpc("master_list_agency_login_changes"),
      ]);
      if (agencies.error) throw agencies.error;
      if (members.error) throw members.error;
      if (pending.error) throw pending.error;
      return { agencies: agencies.data, members: members.data ?? [], pending: pending.data ?? [] };
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
    onSuccess: () => { toast.success("Acesso do cliente vinculado com sucesso."); setMemberEmail(""); qc.invalidateQueries({ queryKey: ["white-label-clients"] }); },
    onError: (err) => toast.error((err as Error).message.includes("User not found") ? "Crie primeiro a conta em Cloud → Users e tente novamente." : "Não foi possível vincular este usuário."),
  });

  const changeClientEmail = useMutation({
    mutationFn: async () => {
      const email = newClientEmail.trim().toLowerCase();
      if (!editingAgencyId || !editingUserId || !/^[^ @]+@[^ @]+\.[^ @]+$/.test(email))
        throw Error("Selecione a conta e informe um e-mail válido.");
      const { data, error } = await supabase.rpc("master_change_agency_login", {
        _agency: editingAgencyId, _old_user: editingUserId, _new_email: email,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (status) => {
      toast.success(status === "alterado"
        ? "Acesso transferido para o novo e-mail confirmado."
        : "Novo e-mail autorizado. A troca será efetivada quando a conta for ativada.");
      setNewClientEmail("");
      qc.invalidateQueries({ queryKey: ["white-label-clients"] });
      qc.invalidateQueries({ queryKey: ["admin-access"] });
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const cancelChange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("master_cancel_agency_login_change", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Troca de e-mail cancelada."); qc.invalidateQueries({ queryKey: ["white-label-clients"] }); },
    onError: (err) => toast.error((err as Error).message),
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
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Administração geral</p><h1 className="mt-2 text-4xl">Clientes white-label</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre imobiliárias ou construtoras, controle acessos e personalize cada empresa. Os pagamentos são negociados diretamente com você no WhatsApp.</p></div>
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
          <div className="space-y-1.5"><Label htmlFor="target">Cliente</Label><select id="target" value={memberAgencyId} onChange={(e) => setMemberAgencyId(e.target.value)} required className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecionar cliente</option>{q.data?.agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="memberEmail">E-mail da conta existente</Label><Input id="memberEmail" type="email" required value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="cliente@imobiliaria.com.br" /></div>
          <div className="space-y-1.5"><Label htmlFor="memberRole">Permissão</Label><select id="memberRole" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={memberRole} onChange={(e) => setMemberRole(e.target.value as "owner" | "editor")}><option value="owner">Proprietário — imóveis e identidade visual</option><option value="editor">Editor — somente imóveis</option></select></div>
          <Button disabled={assign.isPending} type="submit"><UserPlus className="h-4 w-4" /> {assign.isPending ? "Vinculando..." : "Conceder acesso"}</Button>
        </form>
      </div>
      <div>
        <h2 className="mb-2 text-3xl">Empresas cadastradas</h2><p className="mb-4 text-sm text-muted-foreground">Cada empresa tem imóveis, identidade visual, acesso e link público exclusivos. O botão "Imóveis" abre somente o catálogo da empresa selecionada.</p>
        {q.isLoading ? <p>Carregando empresas...</p> : q.isError ? <p>Erro ao carregar clientes.</p> : !q.data?.agencies.length ? <p>Nenhum cliente ainda.</p> :
          <div className="grid gap-3">{q.data.agencies.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-4">
              {a.logo_url ? <img src={a.logo_url} className="h-12 w-16 object-contain" alt="" /> : <Building2 className="h-9 w-9 text-primary" />}
              <div className="min-w-0 flex-1"><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">Código: {a.slug}</p>
                <p className="mt-1 text-xs text-muted-foreground">Usuários: {q.data?.members.filter((m) => m.agency_id === a.id).length ? q.data.members.filter((m) => m.agency_id === a.id).map((m) => m.email + " (" + (m.role === "owner" ? "Proprietário" : "Editor") + ")").join(", ") : "Nenhum usuário vinculado"}</p>
              </div>
              <span className={"rounded-full px-3 py-1 text-xs " + (a.active ? "bg-green-100 text-green-900" : "bg-red-100 text-red-800")}>{a.active ? "Ativo" : "Suspenso"}</span>
              <a href={"/v/" + a.slug} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Vitrine <ExternalLink className="h-3 w-3" /></a>
              <Button size="sm" variant="outline" onClick={async () => {
                const url = window.location.origin + "/v/" + a.slug;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link da vitrine copiado.");
                } catch {
                  toast.info("Link: " + url);
                }
              }}><Copy className="h-3.5 w-3.5" /> Copiar link</Button>
              <Button size="sm" variant="outline" asChild><Link to="/admin" onClick={() => setActiveAgencyId(a.id)}><FolderOpen className="h-4 w-4" /> Imóveis</Link></Button>
              <Button size="sm" variant="outline" asChild><Link to="/admin/marca" onClick={() => setActiveAgencyId(a.id)}>Personalizar</Link></Button>
              <Button size="sm" variant="outline" asChild><Link to="/admin/backup" onClick={() => setActiveAgencyId(a.id)}><HardDriveDownload className="h-4 w-4"/> Backup</Link></Button>
              <Button size="sm" variant={editingAgencyId===a.id?"default":"outline"}
                onClick={()=>{
                  const first=q.data?.members.find(m=>m.agency_id===a.id);
                  setEditingAgencyId(current=>current===a.id?"":a.id);
                  setEditingUserId(first?.user_id??"");
                  setNewClientEmail("");
                }}><Mail className="h-4 w-4"/> Trocar e-mail</Button>
              <Button size="sm" variant="outline" asChild><Link to="/admin/pagamentos">Pagamento</Link></Button>
              <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: a.id, active: !a.active })} disabled={toggleActive.isPending}>{a.active ? "Suspender" : "Ativar"}</Button>
              </div>
              {editingAgencyId===a.id&&<div className="border-t bg-secondary/25 p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Gerenciar acesso do cliente</p>
                    <h3 className="mt-2 text-xl font-semibold">Trocar e-mail de {a.name}</h3>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A troca transfere a permissão da imobiliária para outra conta verificada. Não modifica o login em outras empresas nem apaga imóveis e leads.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={()=>setEditingAgencyId("")}><X className="h-4 w-4"/> Fechar</Button>
                </div>
                {(q.data?.members.filter(m=>m.agency_id===a.id).length??0)>0?
                  <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                    onSubmit={e=>{e.preventDefault();changeClientEmail.mutate();}}>
                    <div className="space-y-1.5"><Label htmlFor={"replace-source-"+a.id}>Conta atual</Label>
                      <select id={"replace-source-"+a.id} className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
                        value={editingUserId} required onChange={e=>setEditingUserId(e.target.value)}>
                        {q.data?.members.filter(m=>m.agency_id===a.id).map(m=>
                          <option key={m.user_id} value={m.user_id}>{m.email} ({m.role==="owner"?"Proprietário":"Editor"})</option>)}
                      </select></div>
                    <div className="space-y-1.5"><Label htmlFor={"replace-email-"+a.id}>Novo e-mail</Label>
                      <Input id={"replace-email-"+a.id} type="email" autoComplete="off" required
                        value={newClientEmail} onChange={e=>setNewClientEmail(e.target.value)}
                        placeholder="novo@imobiliaria.com.br"/></div>
                    <Button type="submit" disabled={changeClientEmail.isPending||!editingUserId}
                      className="h-11"><ShieldCheck className="h-4 w-4"/>
                      {changeClientEmail.isPending?"Verificando...":"Confirmar troca"}</Button>
                  </form>
                  :<p className="mt-5 text-sm text-muted-foreground">Esta empresa ainda não tem um responsável vinculado. Utilize a opção “Liberar acesso vendido” acima para o primeiro cadastro.</p>}
                <div className="mt-5 rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">Link fixo para ativação do novo responsável</p>
                  <p className="mt-1 text-xs text-muted-foreground">Se o novo e-mail ainda não tiver conta confirmada, envie este link. O acesso antigo só será substituído após a confirmação.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-lg bg-muted px-3 py-2 text-xs">{typeof window!=="undefined"?window.location.origin:""}/acesso-cliente?empresa={a.slug}</code>
                    <Button size="sm" variant="outline" type="button" onClick={async()=>{
                      const link=window.location.origin+"/acesso-cliente?empresa="+encodeURIComponent(a.slug);
                      try{await navigator.clipboard.writeText(link);toast.success("Link de ativação copiado.");}
                      catch{toast.info(link);}
                    }}><Copy className="h-4 w-4"/> Copiar</Button>
                    <Button size="sm" variant="outline" type="button" asChild>
                      <a href={"https://wa.me/?text="+encodeURIComponent("Olá! Seu acesso à imobiliária "+a.name+" no CASAS foi atualizado. Use o novo e-mail autorizado para criar sua conta ou entrar: "+window.location.origin+"/acesso-cliente?empresa="+encodeURIComponent(a.slug))}
                        target="_blank" rel="noopener noreferrer"><Send className="h-4 w-4"/> WhatsApp</a>
                    </Button>
                  </div>
                </div>
                {q.data?.pending.filter(item=>item.agency_id===a.id).map(item=>
                  <div key={item.id} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <div className="min-w-0 flex-1"><strong>Pendente:</strong> {item.old_email} → {item.target_email}
                      <p className="mt-1 text-xs">Aguardando confirmação do novo e-mail. Prazo: {new Date(item.expires_at).toLocaleDateString("pt-BR")}.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" disabled={cancelChange.isPending}
                      onClick={()=>cancelChange.mutate(item.id)}>Cancelar</Button>
                  </div>)}
              </div>}
            </div>
          ))}</div>}
      </div>
    </div>
  );
}
