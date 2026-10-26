import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMWorkspace } from "@/components/crm/CRMWorkspace";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";
import { UserRound } from "lucide-react";

export const Route=createFileRoute("/corretor")({
  ssr:false,
  component:BrokerPortal,
  head:()=>({meta:[{title:"Meu CRM — CASAS"},{name:"robots",content:"noindex,nofollow"}]}),
});

async function loadBroker(){
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)return {state:"guest" as const};
  const {data:members,error}=await supabase.from("crm_salespeople")
    .select("id,agency_id,name,email,active").eq("user_id",auth.user.id).eq("active",true);
  if(error)throw error;
  if(!members?.length)return {state:"forbidden" as const};
  const {data:agencies,error:aError}=await supabase.from("agencies")
    .select("id,name,slug,active").in("id",members.map(m=>m.agency_id)).eq("active",true);
  if(aError)throw aError;
  return {state:"authorized" as const,members:members.filter(m=>agencies?.some(a=>a.id===m.agency_id)),agencies:agencies??[]};
}
function BrokerPortal(){
  const qc=useQueryClient();
  const navigate=useNavigate();
  const q=useQuery({queryKey:["crm-broker-access"],queryFn:loadBroker,staleTime:10_000});
  const [selected,setSelected]=useState("");
  if(q.isLoading)return <div className="mx-auto max-w-7xl px-4 py-16">Carregando sua carteira...</div>;
  if(q.isError)return <div className="mx-auto max-w-md px-4 py-16"><EmptyState title="Erro ao carregar" text="Não foi possível verificar seu acesso." action={<Button onClick={()=>q.refetch()}>Tentar novamente</Button>}/></div>;
  if(q.data?.state==="guest")return <div className="mx-auto max-w-md px-4 py-16"><EmptyState title="Entre no CASAS" text="Acesse com o e-mail cadastrado para o corretor." action={<Button asChild><Link to="/entrar">Entrar</Link></Button>}/></div>;
  if(!q.data||q.data.state!=="authorized"||!q.data.members.length)return <div className="mx-auto max-w-md px-4 py-16"><EmptyState title="Nenhuma carteira ativa" text="Solicite ao gestor sua vinculação como corretor." /></div>;
  const m=q.data.members.find(m=>m.id===selected)??q.data.members[0];
  const a=q.data.agencies.find(a=>a.id===m.agency_id);
  async function exit(){await supabase.auth.signOut();qc.clear();navigate({to:"/entrar"});}
  return <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border bg-card p-6 shadow-sm">
      <div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><UserRound className="h-4 w-4"/> Área do corretor</p>
        <h1 className="mt-3 text-3xl font-bold">{m.name}</h1><p className="mt-1 text-sm text-muted-foreground">{a?.name} · Seus leads e negociações</p></div>
      <div className="flex items-center gap-3">
        {q.data.members.length>1&&<select aria-label="Selecionar imobiliária" className="h-11 rounded-xl border bg-background px-3 text-sm" value={m.id} onChange={e=>setSelected(e.target.value)}>{q.data.members.map(x=><option key={x.id} value={x.id}>{q.data.agencies.find(a=>a.id===x.agency_id)?.name}</option>)}</select>}
        <Button variant="outline" onClick={exit}>Sair</Button>
      </div>
    </div>
    <CRMWorkspace agencyId={m.agency_id} agencyName={a?.name??"Imobiliária"} isBroker brokerId={m.id}/>
  </div>;
}
