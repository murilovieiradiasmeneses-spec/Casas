import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, CheckCircle2, CircleAlert, RefreshCcw, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CRMWorkspace } from "@/components/crm/CRMWorkspace";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/PropertyCard";

export const Route=createFileRoute("/corretor")({
  ssr:false,
  component:BrokerPortal,
  head:()=>({meta:[{title:"Meu CRM — CASAS"},{name:"robots",content:"noindex,nofollow"}]}),
});
type BrokerPortfolio={
  id:string|null;
  agency_id:string;
  name:string;
  agency_name:string;
  agency_slug:string;
  agency_active:boolean;
  status:"ativo"|"desativado"|"empresa_suspensa"|"pendente";
  assigned_leads:number;
};
async function loadBroker(){
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)return {state:"guest" as const,portfolios:[],clientMember:false};
  const [portfolioResult,memberResult]=await Promise.all([
    supabase.rpc("crm_my_broker_portfolios"),
    supabase.from("agency_members").select("agency_id").eq("user_id",auth.user.id).limit(1),
  ]);
  if(portfolioResult.error)throw portfolioResult.error;
  if(memberResult.error)throw memberResult.error;
  return {
    state:"loaded" as const,
    portfolios:(portfolioResult.data??[]) as BrokerPortfolio[],
    clientMember:!!memberResult.data?.length,
  };
}
const description={
  desativado:"Este acesso como corretor foi desativado. O responsável da imobiliária precisa reativá-lo na aba Equipe do CRM.",
  empresa_suspensa:"O acesso à imobiliária está suspenso. Procure o responsável.",
  pendente:"Seu e-mail foi autorizado, mas a ativação ainda não foi concluída. Abra o link de acesso da empresa.",
  ativo:"Seu acesso está ativo.",
};
function BrokerPortal(){
  const qc=useQueryClient();
  const navigate=useNavigate();
  const q=useQuery({queryKey:["crm-broker-access"],queryFn:loadBroker,staleTime:0,refetchOnMount:"always"});
  const [selected,setSelected]=useState("");
  if(q.isLoading)return <div className="mx-auto max-w-7xl px-4 py-16">Verificando os acessos das suas imobiliárias...</div>;
  if(q.isError)return <div className="mx-auto max-w-md px-4 py-16"><EmptyState
    title="Não foi possível verificar os acessos" text={q.error instanceof Error?q.error.message:"Tente atualizar a conexão."}
    action={<Button onClick={()=>void q.refetch()}><RefreshCcw className="h-4 w-4"/>Tentar novamente</Button>}/></div>;
  if(q.data?.state==="guest")return <div className="mx-auto max-w-md px-4 py-16"><EmptyState
    title="Entre no CASAS" text="Use o mesmo e-mail que a imobiliária autorizou para seu acesso como corretor."
    action={<Button asChild><Link to="/entrar">Entrar</Link></Button>}/></div>;
  const portfolios=q.data?.portfolios??[];
  const active=portfolios.filter(p=>p.status==="ativo"&&!!p.id);
  const unavailable=portfolios.filter(p=>p.status!=="ativo");
  async function exit(){await supabase.auth.signOut();qc.clear();navigate({to:"/entrar"});}
  if(!active.length)return <main className="mx-auto max-w-xl px-4 py-12 sm:py-20">
    <div className="rounded-[28px] border bg-card p-6 shadow-sm sm:p-10">
      <CircleAlert className="mb-4 h-10 w-10 text-amber-600"/>
      <h1 className="text-2xl font-semibold">Nenhuma carteira de corretor ativa</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Um mesmo e-mail pode ter acesso a várias imobiliárias. O que libera sua carteira é um vínculo de corretor ativo em cada empresa, não o envio do lead sozinho.
      </p>
      {unavailable.length>0?<div className="mt-6 space-y-3">
        {unavailable.map(p=><div key={p.agency_id} className="rounded-xl border bg-secondary/35 p-4">
          <strong className="block">{p.agency_name}</strong>
          <p className="mt-1 text-sm text-muted-foreground">{description[p.status]}</p>
          {p.assigned_leads>0&&<p className="mt-2 text-xs text-amber-700">
            {p.assigned_leads} lead{p.assigned_leads===1?" está":"s estão"} atribuído{p.assigned_leads===1?"":"s"} a este cadastro, mas o acesso está indisponível.
          </p>}
          {p.status==="pendente"&&<Button className="mt-3" size="sm" asChild>
            <a href={"/acesso-corretor?empresa="+encodeURIComponent(p.agency_slug)}>Ativar meu acesso</a>
          </Button>}
        </div>)}
      </div>:<div className="mt-5 rounded-xl border p-4 text-sm text-muted-foreground">
        Esta conta não possui vinculação ativa como corretor. Confira se você entrou com o e-mail autorizado pelo gestor.
        Se a autorização foi feita para outra conta, saia e entre com o e-mail correto.
      </div>}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={()=>void q.refetch()}><RefreshCcw className="h-4 w-4"/>Verificar novamente</Button>
        {q.data?.clientMember&&<Button variant="outline" asChild><Link to="/cliente">Ir ao painel da imobiliária</Link></Button>}
        <Button variant="outline" onClick={exit}>Trocar de conta</Button>
      </div>
    </div>
  </main>;
  // Initial selection is fixed by the activation link, not arbitrary SQL order.
  const requestedSlug=typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("empresa")??"";
  const m=active.find(p=>p.id===selected)
    ??active.find(p=>p.agency_slug===requestedSlug)
    ??active[0];
  return <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border bg-card p-6 shadow-sm">
      <div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><UserRound className="h-4 w-4"/> Área do corretor</p>
        <h1 className="mt-3 text-3xl font-bold">{m.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground"><Building2 className="mr-1 inline h-4 w-4"/>{m.agency_name} · Seus leads recebidos</p>
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Acesso ativo e individual</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {active.length>1&&<select aria-label="Selecionar imobiliária" className="h-11 rounded-xl border bg-background px-3 text-sm"
          value={m.id??""} onChange={e=>setSelected(e.target.value)}>
          {active.map(p=><option key={p.id} value={p.id??""}>{p.agency_name}</option>)}
        </select>}
        {q.data?.clientMember&&<Button variant="outline" asChild><Link to="/cliente"><ShieldCheck className="h-4 w-4"/>Gestão</Link></Button>}
        <Button variant="outline" onClick={()=>void q.refetch()} aria-label="Atualizar meus acessos"><RefreshCcw className="h-4 w-4"/></Button>
        <Button variant="outline" onClick={exit}>Sair</Button>
      </div>
    </div>
    {unavailable.length>0&&<div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
      Seu e-mail também possui {unavailable.length} vínculo{unavailable.length===1?"":"s"} sem acesso ativo:
      {unavailable.map(p=>" "+p.agency_name+" ("+(p.status==="desativado"?"desativado":p.status==="pendente"?"aguardando ativação":"empresa suspensa")+")").join(",")}.
      O gestor precisa regularizar o vínculo para encaminhar leads dessas empresas.
    </div>}
    <CRMWorkspace key={m.agency_id} agencyId={m.agency_id} agencyName={m.agency_name} isBroker brokerId={m.id!}/>
  </div>;
}
