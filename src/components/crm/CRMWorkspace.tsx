import { useState } from "react";
import { CRMNotifications } from "@/components/crm/CRMNotifications";
import { getCRMAlerts } from "@/lib/crm-notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowUpRight, CalendarDays, ChartNoAxesCombined, CircleDollarSign,
  Handshake, Columns3, MessageCircle, Plus, Users, Trash2, AlertTriangle,
  UserRound, TrendingUp, Search, ClipboardCheck, UserPlus, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  crmBRL, crmMetrics, revenueByMonth, leadDeletionImpact, LEAD_STAGES, DEAL_STAGES,
  VISIT_STATUSES, SOURCES, PLANS, crmPhone,
  type Lead, type Deal, type Visit, type Salesperson, type CRMSettings,
  type LeadStage, type DealStage,
} from "@/lib/crm";

type PropertyOption = { id: string; title: string };
type CRMTab = "visao" | "leads" | "visitas" | "negociacoes" | "equipe";
type BrokerAuthorization = {
  id:string;name:string;email:string;state:"ativo"|"autorizado"|"revogado";
  authorized_at:string;activated_at:string|null;
};
type CRMData = {
  leads:Lead[]; visits:Visit[]; deals:Deal[]; team:Salesperson[];
  properties:PropertyOption[]; settings:CRMSettings|null; seats:number;
  seatsReserved:number;canManageTeam:boolean;authorizations:BrokerAuthorization[];
};
type Props = {
  agencyId:string;
  agencyName:string;
  isMaster?:boolean;
  isBroker?:boolean;
  brokerId?:string;
  agencySlug?:string;
};
const tabs: { key:CRMTab;label:string;icon:typeof Users }[] = [
  {key:"visao",label:"Visão geral",icon:ChartNoAxesCombined},
  {key:"leads",label:"Funil de leads",icon:Columns3},
  {key:"visitas",label:"Visitas",icon:CalendarDays},
  {key:"negociacoes",label:"Negociações",icon:Handshake},
  {key:"equipe",label:"Equipe",icon:Users},
];
const fieldStyle="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm";
const panel="rounded-[24px] border border-border/70 bg-card p-5 shadow-sm sm:p-6";
const dateString=(d?:string|null)=>d ? new Date(d).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}) : "—";
const todayLocal=(date:string)=>{
  const d=new Date(date),p=(v:number)=>String(v).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function CRMWorkspace({agencyId,agencyName,agencySlug="",isMaster=false,isBroker=false,brokerId}:Props) {
  const qc=useQueryClient();
  const [tab,setTab]=useState<CRMTab>("visao");
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [leadDraft,setLeadDraft]=useState<Partial<Lead>|null>(null);
  const [leadToDelete,setLeadToDelete]=useState<Lead|null>(null);
  const [showLeadDeletePicker,setShowLeadDeletePicker]=useState(false);
  const [leadDeleteSelection,setLeadDeleteSelection]=useState("");
  const [deleteConfirmation,setDeleteConfirmation]=useState("");
  const [visitDraft,setVisitDraft]=useState<Partial<Visit>|null>(null);
  const [dealDraft,setDealDraft]=useState<Partial<Deal>|null>(null);
  const [agentName,setAgentName]=useState("");
  const [agentEmail,setAgentEmail]=useState("");
  const q=useQuery({
    queryKey:["casas-crm",agencyId,isBroker,brokerId],
    enabled:!!agencyId && (!isBroker||!!brokerId),
    queryFn:async():Promise<CRMData>=>{
      const [a,b,c,d,e] = await Promise.all([
        supabase.from("crm_leads").select("*").eq("agency_id",agencyId).order("created_at",{ascending:false}),
        supabase.from("crm_visits").select("*").eq("agency_id",agencyId).order("scheduled_at",{ascending:true}),
        supabase.from("crm_deals").select("*").eq("agency_id",agencyId).order("created_at",{ascending:false}),
        supabase.from("crm_salespeople").select("*").eq("agency_id",agencyId).order("name"),
        isBroker
          ? supabase.from("public_property_listings").select("id,title").eq("agency_id",agencyId).order("title")
          : supabase.from("properties").select("id,title").eq("agency_id",agencyId).order("title"),
      ]);
      for(const item of [a,b,c,d,e])if(item.error)throw item.error;
      let settings:CRMSettings|null=null,seats=0,seatsReserved=0,canManageTeam=false;
      let authorizations:BrokerAuthorization[]=[];
      if(!isBroker){
        const [settingsResult,seatsResult,ownerResult,reservedResult]=await Promise.all([
          supabase.from("crm_settings").select("*").eq("agency_id",agencyId).maybeSingle(),
          supabase.rpc("crm_count_seats",{_agency:agencyId}),
          supabase.rpc("crm_is_owner",{_agency:agencyId}),
          supabase.rpc("crm_reserved_seats",{_agency:agencyId}),
        ]);
        for(const result of [settingsResult,seatsResult,ownerResult,reservedResult])if(result.error)throw result.error;
        settings=settingsResult.data;
        seats=seatsResult.data??0;seatsReserved=reservedResult.data??0;
        canManageTeam=!!ownerResult.data;
        if(canManageTeam){
          const approved=await supabase.rpc("crm_list_authorized_brokers",{_agency:agencyId});
          if(approved.error)throw approved.error;
          authorizations=(approved.data??[]) as BrokerAuthorization[];
        }
      }
      return {leads:a.data??[],visits:b.data??[],deals:c.data??[],
        team:d.data??[],properties:e.data??[],settings,seats,seatsReserved,canManageTeam,authorizations};
    },
    refetchInterval:45000,
    staleTime:10000,
  });
  const reload=()=>void qc.invalidateQueries({queryKey:["casas-crm",agencyId]});
  const run=async(action:()=>PromiseLike<{error:{message:string}|null}>|Promise<{error:{message:string}|null}>,success:string)=>{
    setBusy(true);
    try{
      const {error}=await action();
      if(error)throw new Error(error.message);
      toast.success(success);
      reload();
      return true;
    }catch(e){toast.error((e as Error).message||"Não foi possível salvar.");return false;}
    finally{setBusy(false);}
  };

  if(q.isLoading)return <div className={panel}>Carregando CRM de {agencyName}...</div>;
  if(q.isError||!q.data)return <div className={panel}>
    <h2 className="text-xl">Não foi possível abrir o CRM</h2>
    <p className="mt-2 text-sm text-muted-foreground">Verifique o banco e suas permissões. {q.error instanceof Error?q.error.message:""}</p>
    <Button className="mt-4" onClick={()=>q.refetch()}>Tentar novamente</Button>
  </div>;
  const {leads,visits,deals,team,properties,settings,seats,seatsReserved,canManageTeam,authorizations}=q.data;
  const brokerAccessUrl=typeof window!=="undefined"
    ? window.location.origin+"/acesso-corretor?empresa="+encodeURIComponent(agencySlug)
    : "/acesso-corretor?empresa="+encodeURIComponent(agencySlug);
  const notifications=getCRMAlerts({leads,deals,visits},new Date(),7,isBroker);
  const metrics=crmMetrics(leads,deals,visits);
  const chartData=revenueByMonth(deals);
  const plan=settings?.plan??"essencial",limit=settings?.max_users??3;
  const agentNameById=(id?:string|null)=>team.find(p=>p.id===id)?.name??"Sem corretor";
  const leadById=(id:string)=>leads.find(l=>l.id===id);
  const propertyName=(id?:string|null)=>properties.find(p=>p.id===id)?.title??"Imóvel não informado";
  const receivedNewLeads=isBroker?leads.filter(l=>l.stage==="novo").length:0;
  const filtered=leads.filter(l=>[l.name,l.phone,l.email??"",propertyName(l.property_id)]
    .some(s=>s.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
  const chartStages=LEAD_STAGES.filter(s=>s.id!=="perdido").map(s=>({name:s.name,value:leads.filter(l=>l.stage===s.id).length}));
  const bestAgents=team.map(agent=>({
    name:agent.name,
    leads:leads.filter(l=>l.assigned_agent_id===agent.id).length,
    total:deals.filter(d=>d.status==="ganho" && leads.some(l=>l.id===d.lead_id && l.assigned_agent_id===agent.id))
      .reduce((acc,d)=>acc+Number(d.amount_brl),0),
  })).sort((a,b)=>b.total-a.total);

  const updateLead=(id:string,patch:Partial<Lead>)=>run(async()=>supabase.from("crm_leads").update(patch).eq("id",id).eq("agency_id",agencyId),"Lead atualizado.");
  const requestLeadDeletion=(lead:Lead)=>{
    if(!canManageTeam)return;
    setShowLeadDeletePicker(false);
    setLeadDeleteSelection("");
    setLeadDraft(null);
    setLeadToDelete(lead);
    setDeleteConfirmation("");
  };
  const closeLeadDeletion=()=>{
    if(busy)return;
    setLeadToDelete(null);
    setDeleteConfirmation("");
  };
  const deleteLead=async()=>{
    if(!canManageTeam||!leadToDelete||deleteConfirmation!=="EXCLUIR"||busy)return;
    const target=leadToDelete;
    // A scoped DELETE returns precisely one row; RLS enforces agency management,
    // and FK ON DELETE CASCADE removes linked visits and deals atomically.
    const ok=await run(
      ()=>supabase.from("crm_leads").delete()
        .eq("id",target.id).eq("agency_id",agencyId).select("id").single(),
      "Lead excluído. Visitas e negociações vinculadas também foram removidas."
    );
    if(ok){
      setLeadToDelete(null);
      setDeleteConfirmation("");
      setLeadDraft(null);
    }
  };
  const forwardLead=(id:string,agentId:string|null)=>run(
    async()=>supabase.from("crm_leads").update({assigned_agent_id:agentId}).eq("id",id).eq("agency_id",agencyId).select("id").single(),
    agentId?"Lead enviado para o corretor.":"Lead devolvido à carteira da imobiliária."
  );
  const updateVisit=(id:string,status:Visit["status"])=>run(async()=>supabase.from("crm_visits").update({status}).eq("id",id).eq("agency_id",agencyId),"Visita atualizada.");
  const updateDeal=(d:Deal,status:DealStage)=>run(async()=>supabase.from("crm_deals").update({
    status,closed_at:status==="ganho"?(d.closed_at??new Date().toISOString()):null,
  }).eq("id",d.id).eq("agency_id",agencyId),"Negociação atualizada.");
  const saveLead=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(isBroker&&!leadDraft?.id)return toast.error("A imobiliária precisa atribuir o lead antes do atendimento.");
    if(!leadDraft?.name?.trim() || leadDraft.name.trim().length<2)return toast.error("Informe o nome do lead.");
    const body={
      agency_id:agencyId,
      name:leadDraft.name.trim(),
      phone:leadDraft.phone??"",
      email:leadDraft.email?.trim()||null,
      property_id:leadDraft.property_id||null,
      assigned_agent_id:isBroker?brokerId!:(leadDraft.assigned_agent_id||null),
      source:leadDraft.source??"manual",
      stage:leadDraft.stage??"novo",
      budget_brl:leadDraft.budget_brl==null?null:Number(leadDraft.budget_brl),
      next_contact_at:leadDraft.next_contact_at||null,
      notes:leadDraft.notes??"",
      birth_date:leadDraft.birth_date||null,
    };
    const ok=await run(()=>leadDraft.id?
      supabase.from("crm_leads").update(body).eq("id",leadDraft.id).eq("agency_id",agencyId):
      supabase.from("crm_leads").insert(body),"Lead salvo.");
    if(ok)setLeadDraft(null);
  };
  const saveVisit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!visitDraft?.lead_id || !visitDraft.property_id || !visitDraft.scheduled_at)
      return toast.error("Preencha lead, imóvel e data da visita.");
    const lead=leadById(visitDraft.lead_id);
    if(!lead)return toast.error("Lead inválido.");
    const body={agency_id:agencyId,lead_id:lead.id,property_id:visitDraft.property_id,
      scheduled_at:visitDraft.scheduled_at,status:visitDraft.status??"agendada",notes:visitDraft.notes??""};
    const ok=await run(()=>supabase.from("crm_visits").insert(body),"Visita agendada.");
    if(ok)setVisitDraft(null);
  };
  const saveDeal=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!dealDraft?.lead_id||!dealDraft.title?.trim())return toast.error("Informe cliente e título da negociação.");
    const amount=Number(dealDraft.amount_brl||0);
    if(!Number.isFinite(amount)||amount<0)return toast.error("Valor inválido.");
    const body={agency_id:agencyId,lead_id:dealDraft.lead_id,
      property_id:dealDraft.property_id||null,title:dealDraft.title.trim(),
      amount_brl:amount,status:dealDraft.status??"proposta",
      expected_close_date:dealDraft.expected_close_date||null,
      closed_at:dealDraft.status==="ganho"?new Date().toISOString():null,
      notes:dealDraft.notes??""};
    const ok=await run(()=>supabase.from("crm_deals").insert(body),"Negociação registrada.");
    if(ok)setDealDraft(null);
  };
  const addAgent=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!canManageTeam)return toast.error("Somente o proprietário pode autorizar corretores.");
    if(!agentEmail.includes("@")||agentName.trim().length<2)return toast.error("Informe nome e e-mail válidos.");
    setBusy(true);
    try{
      const {data,error}=await supabase.rpc("crm_authorize_broker",{
        _agency:agencyId,_email:agentEmail.trim(),_name:agentName.trim(),
      });
      if(error)throw error;
      toast.success(data==="ativo"?"Acesso ativado para a conta existente.":"E-mail autorizado. Envie ao corretor o link fixo da imobiliária.");
      setAgentName("");setAgentEmail("");reload();
    }catch(e){toast.error((e as Error).message);}
    finally{setBusy(false);}
  };
  const revokeAuthorization=async(email:string)=>{
    if(!canManageTeam)return;
    if(!window.confirm("Revogar o acesso do corretor "+email+"?"))return;
    await run(()=>supabase.rpc("crm_revoke_broker",{_agency:agencyId,_email:email}),"Acesso revogado.");
  };
  const changePlan=async(next:string)=>{
    if(!isMaster)return;
    const p=PLANS.find(x=>x.id===next);
    if(!p)return;
    if(p.limit<seatsReserved){toast.error("Este plano comporta menos usuários do que os atuais. Desative usuários antes.");return;}
    await run(()=>supabase.from("crm_settings").upsert({
      agency_id:agencyId,plan:p.id,max_users:p.limit,
    },{onConflict:"agency_id"}),"Limite do CRM atualizado.");
  };

  return <section className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.17em] text-primary">CASAS · CRM Imobiliário</span>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{isBroker?"Leads recebidos da imobiliária":"Gestão comercial"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{isBroker?agencyName+" · Você vê somente os leads encaminhados pela sua imobiliária.":agencyName+" · Distribua leads, acompanhe visitas e resultados comerciais."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={reload}>Atualizar</Button>
        {!isBroker&&<Button onClick={()=>{setTab("leads");setLeadDraft({name:"",stage:"novo",source:"manual",assigned_agent_id:null});}}>
          <Plus/> Novo lead
        </Button>}
      </div>
    </div>
    {isBroker&&<button type="button" onClick={()=>setTab("leads")}
      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[22px] border border-primary/25 bg-secondary/40 px-5 py-4 text-left hover:bg-secondary/65">
      <span className="flex items-center gap-3"><UserRound className="h-5 w-5 text-primary"/>
        <span><strong>{receivedNewLeads} lead{receivedNewLeads===1?"":"s"} novo{receivedNewLeads===1?"":"s"} recebido{receivedNewLeads===1?"":"s"}</strong>
          <small className="mt-1 block text-muted-foreground">Contatos encaminhados pela imobiliária aguardando atendimento.</small>
        </span></span><span className="text-sm font-semibold text-primary">Ver meus leads →</span>
    </button>}
    <CRMNotifications key={agencyId} agencyName={agencyName} alerts={notifications} leads={leads}
      onOpen={alert=>{
        if(alert.target==="leads") {
          setTab("leads");
          const selected=leads.find(lead=>lead.id===alert.leadId);
          if(selected)setLeadDraft({...selected});
        } else if(alert.target==="negociacoes")setTab("negociacoes");
        else setTab("visitas");
      }}/>
    <nav aria-label="Áreas do CRM" className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
      {tabs.filter(t=>!isBroker||t.key!=="equipe").map(({key,label,icon:Icon})=>
        <button key={key} type="button" onClick={()=>setTab(key)}
          className={"inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors "+
          (tab===key?"bg-primary text-primary-foreground shadow-sm":"text-muted-foreground hover:bg-muted hover:text-foreground")}>
          <Icon className="h-4 w-4"/>{label}
        </button>
      )}
    </nav>

    {tab==="visao" && <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {label:"Faturamento registrado",value:crmBRL(metrics.revenue),icon:CircleDollarSign,help:"Vendas concluídas no CRM"},
          {label:"Vendas neste mês",value:crmBRL(metrics.revenueMonth),icon:TrendingUp,help:"Por data de fechamento"},
          {label:"Leads da carteira",value:String(metrics.leads),icon:Users,help:"Contatos cadastrados"},
          {label:"Conversão",value:metrics.conversion+"%",icon:ClipboardCheck,help:"Vendas registradas ÷ leads"},
        ].map(({label,value,icon:Icon,help})=><article key={label} className={panel}>
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-primary"/></div>
          <p className="mt-4 font-display text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{help}</p>
        </article>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <article className={panel}>
          <div className="mb-6 flex flex-wrap justify-between gap-3">
            <div><h3 className="text-xl">Faturamento por mês</h3><p className="mt-1 text-sm text-muted-foreground">Últimos 6 meses · negócios ganhos</p></div>
            <span className="text-sm font-semibold text-primary">{crmBRL(metrics.revenueMonth)} neste mês</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{left:-10,right:10,top:10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12}/>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false}/>
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?(v/1000)+" mil":String(v)}/>
                <Tooltip formatter={v=>crmBRL(Number(v))} cursor={{fill:"var(--muted)"}}/>
                <Bar dataKey="faturamento" name="Faturamento" fill="var(--primary)" radius={[8,8,0,0]} maxBarSize={55}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className={panel}>
          <h3 className="text-xl">Funil comercial</h3>
          <p className="mt-1 text-sm text-muted-foreground">Distribuição dos leads por etapa</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={chartStages.filter(s=>s.value>0)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3}>
                {chartStages.filter(s=>s.value>0).map((_,i)=><Cell key={i} fill={["#386B61","#6F9F8B","#87AFA5","#D3B987","#AEB7AE","#263F38"][i%6]}/>)}
              </Pie><Tooltip/></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">{chartStages.map(s=><div key={s.name} className="flex justify-between rounded-lg bg-muted/60 px-3 py-2"><span>{s.name}</span><b>{s.value}</b></div>)}</div>
        </article>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <article className={panel}><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-primary"/><h3 className="text-lg">Próximas visitas</h3></div>
          <p className="mt-4 text-3xl font-bold">{metrics.upcoming}</p>
          <button type="button" onClick={()=>setTab("visitas")} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Ver agenda <ArrowUpRight className="h-4 w-4"/></button>
        </article>
        <article className={panel}><div className="flex items-center gap-3"><Handshake className="h-5 w-5 text-primary"/><h3 className="text-lg">Negociações em aberto</h3></div>
          <p className="mt-4 text-3xl font-bold">{crmBRL(metrics.forecast)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Volume de propostas e negociações — não garantido</p>
        </article>
        <article className={panel}><div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-primary"/><h3 className="text-lg">Desempenho da equipe</h3></div>
          {bestAgents.length ? <div className="mt-4 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={bestAgents.slice(0,5)} margin={{left:0,right:12}}>
                <XAxis type="number" tickFormatter={v=>v>=1000?(v/1000)+"k":String(v)} fontSize={10} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={85} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v=>crmBRL(Number(v))}/>
                <Bar dataKey="total" name="Vendas" fill="var(--primary)" radius={[0,6,6,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div> : <p className="mt-4 text-sm text-muted-foreground">Cadastre corretores para acompanhar resultados.</p>}
        </article>
      </div>
      <p className="text-xs text-muted-foreground">Os gráficos são gerados a partir dos registros do CRM; valores de negócios ganhos são declarados manualmente e não representam confirmação bancária de recebimento.</p>
    </div>}

    {tab==="leads" && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-2xl">{isBroker?"Leads encaminhados para mim":"Leads e distribuição"}</h3>
          <p className="text-sm text-muted-foreground">{isBroker
            ?"Somente contatos atribuídos a você pela imobiliária."
            :leads.length+" contatos na carteira · selecione Enviar para corretor em cada lead."}</p></div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente ou imóvel" className="w-64 pl-9"/></div>
          {!isBroker&&<Button onClick={()=>setLeadDraft({name:"",stage:"novo",source:"manual",assigned_agent_id:null})}><Plus/> Cadastrar</Button>}
          {canManageTeam&&<Button type="button" variant="outline" disabled={busy||leads.length===0}
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={()=>{
              setLeadDeleteSelection("");
              setShowLeadDeletePicker(true);
            }}><Trash2 className="h-4 w-4"/> Excluir lead</Button>}
        </div>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map(s=>{
          const grouped=filtered.filter(l=>l.stage===s.id);
          return <section key={s.id} className="w-[282px] min-w-[282px] snap-start rounded-[22px] border bg-muted/50 p-3"
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain");
              const current=leads.find(l=>l.id===id);
              if(current&&current.stage!==s.id)void updateLead(id,{stage:s.id});
            }}>
            <header className="mb-3 flex items-center justify-between px-2 py-2"><h4 className="text-sm font-bold">{s.name}</h4><span className="rounded-full bg-card px-2 py-0.5 text-xs">{grouped.length}</span></header>
            <div className="space-y-3">{grouped.map(l=>{
              const wa=crmPhone(l.phone);
              return <article key={l.id} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",l.id)}
                className="rounded-2xl border bg-card p-4 shadow-sm">
                <h5 className="line-clamp-1 text-base">{l.name}</h5>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{propertyName(l.property_id)}</p>
                <p className="mt-2 text-xs font-semibold text-primary">{agentNameById(l.assigned_agent_id)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={()=>setLeadDraft({...l})} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Editar</button>
                  {canManageTeam&&<button type="button" aria-label={"Excluir lead "+l.name} disabled={busy}
                    onClick={()=>requestLeadDeletion(l)}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5"/> Excluir
                  </button>}
                  {wa && <a aria-label={"WhatsApp de "+l.name} href={"https://wa.me/"+wa} target="_blank" rel="noreferrer" className="rounded-lg border p-2 text-primary"><MessageCircle className="h-4 w-4"/></a>}
                </div>
                <select aria-label={"Etapa de "+l.name} className="mt-3 w-full rounded-lg border bg-background px-2 py-2 text-xs"
                  value={l.stage} disabled={busy} onChange={e=>void updateLead(l.id,{stage:e.target.value as LeadStage})}>
                  {LEAD_STAGES.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
                {!isBroker && <div className="mt-3 rounded-xl border border-primary/20 bg-secondary/30 p-2.5">
                  <label htmlFor={"forward-"+l.id} className="mb-1.5 block text-xs font-bold text-primary">Enviar lead para corretor</label>
                  <select id={"forward-"+l.id} aria-label={"Enviar "+l.name+" para corretor"} className="w-full rounded-lg border bg-background px-2 py-2 text-xs"
                    value={l.assigned_agent_id??""} disabled={busy} onChange={e=>void forwardLead(l.id,e.target.value||null)}>
                    <option value="">Carteira da imobiliária (não enviado)</option>
                    {l.assigned_agent_id&&!team.some(a=>a.id===l.assigned_agent_id&&a.active)&&
                      <option value={l.assigned_agent_id} disabled>Corretor desativado — redistribua o lead</option>}
                    {team.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {l.assigned_agent_id&&!team.some(a=>a.id===l.assigned_agent_id&&a.active)&&
                    <p className="mt-2 text-xs font-medium text-amber-700">Corretor sem acesso ativo: redistribua este lead para que alguém possa atendê-lo.</p>}
                </div>}
              </article>;
            })}
            {!grouped.length&&<div className="rounded-xl border border-dashed px-3 py-7 text-center text-xs text-muted-foreground">Nenhum lead nesta etapa</div>}</div>
          </section>;
        })}
      </div>
    </div>}

    {tab==="visitas" && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-2xl">Agenda de visitas</h3><p className="text-sm text-muted-foreground">Organize os encontros com interessados nos imóveis.</p></div>
        <Button onClick={()=>setVisitDraft({status:"agendada",scheduled_at:""})}><Plus/> Agendar visita</Button></div>
      <div className={panel}>{visits.length?visits.map(v=><div key={v.id} className="flex flex-wrap items-center gap-4 border-b border-border/60 py-4 last:border-0">
        <div className="rounded-xl bg-secondary p-3 text-primary"><CalendarDays className="h-5 w-5"/></div>
        <div className="min-w-0 flex-1"><p className="font-semibold">{leadById(v.lead_id)?.name??"Lead"}</p><p className="text-sm text-muted-foreground">{propertyName(v.property_id)} · {dateString(v.scheduled_at)}</p>{v.notes&&<p className="text-xs text-muted-foreground">{v.notes}</p>}</div>
        <select aria-label="Situação da visita" className={fieldStyle+" max-w-44"} value={v.status} disabled={busy}
          onChange={e=>void updateVisit(v.id,e.target.value as Visit["status"])}>
          {Object.entries(VISIT_STATUSES).map(([k,value])=><option key={k} value={k}>{value}</option>)}
        </select>
      </div>):<p className="py-12 text-center text-muted-foreground">Nenhuma visita agendada ainda.</p>}</div>
    </div>}

    {tab==="negociacoes" && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-2xl">Negociações e vendas</h3><p className="text-sm text-muted-foreground">Registre propostas e confirme vendas concluídas.</p></div>
        <Button onClick={()=>setDealDraft({status:"proposta",amount_brl:0})}><Plus/> Nova negociação</Button></div>
      <div className={panel}>{deals.length?deals.map(d=><div key={d.id} className="flex flex-wrap items-center gap-4 border-b border-border/60 py-4 last:border-0">
        <div className="rounded-xl bg-secondary p-3 text-primary"><Handshake className="h-5 w-5"/></div>
        <div className="min-w-0 flex-1"><p className="font-semibold">{d.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{leadById(d.lead_id)?.name??"Lead"} · {propertyName(d.property_id)}</p>
          <p className="mt-1 text-base font-bold">{crmBRL(d.amount_brl)}</p>
        </div>
        <select aria-label="Situação da negociação" className={fieldStyle+" max-w-44"} value={d.status} disabled={busy}
          onChange={e=>void updateDeal(d,e.target.value as DealStage)}>
          {DEAL_STAGES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>):<p className="py-12 text-center text-muted-foreground">Nenhuma negociação registrada.</p>}</div>
    </div>}

    {tab==="equipe" && !isBroker && <div className="space-y-6">
      <div><h3 className="text-2xl">Corretores e acessos</h3><p className="mt-1 text-sm text-muted-foreground">Cada profissional acessa apenas os leads atribuídos à sua conta. Gerentes continuam com visão completa.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className={panel}>
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary"/><h4 className="text-lg">Plano e limite de acessos</h4></div>
          <p className="mt-4 text-3xl font-bold">{seatsReserved} <span className="text-lg font-medium text-muted-foreground">/ {limit} acessos</span></p><p className="mt-1 text-xs text-muted-foreground">{seats} ativos · {Math.max(0,seatsReserved-seats)} autorizações aguardando ativação</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:Math.min(100,(seatsReserved/Math.max(limit,1))*100)+"%"}}/></div>
          <p className="mt-3 text-xs text-muted-foreground">Contagem inclui responsáveis e editores da imobiliária, além dos corretores ativos.</p>
          <p className="mt-2 text-sm font-semibold">Plano atual: {PLANS.find(p=>p.id===plan)?.name??"Personalizado"}</p>
          {isMaster?<div className="mt-4 space-y-2"><Label>Alterar plano pelo painel master</Label>
            <select className={fieldStyle} value={plan} disabled={busy} onChange={e=>void changePlan(e.target.value)}>
              {PLANS.map(p=><option key={p.id} value={p.id}>{p.name} — até {p.limit} usuários</option>)}
              {plan==="personalizado"&&<option value="personalizado">Personalizado — {limit} usuários</option>}
            </select>
          </div>:<p className="mt-4 text-xs text-muted-foreground">Para aumentar seu limite, solicite a evolução do plano ao administrador do CASAS pelo WhatsApp.</p>}
        </article>
        <article className={panel}>
          <div className="flex items-center gap-3"><UserPlus className="h-5 w-5 text-primary"/><h4 className="text-lg">Autorizar corretor</h4></div>
          <p className="mt-3 text-sm text-muted-foreground">
            O proprietário libera um e-mail diretamente. O corretor usa o link fixo desta imobiliária e cria a própria senha.
          </p>
          {canManageTeam?<>
            <form onSubmit={addAgent} className="mt-4 space-y-3">
              <div><Label htmlFor="crm-agent-name">Nome do corretor</Label><Input id="crm-agent-name" value={agentName} onChange={e=>setAgentName(e.target.value)} required/></div>
              <div><Label htmlFor="crm-agent-email">E-mail autorizado</Label><Input id="crm-agent-email" type="email" value={agentEmail} onChange={e=>setAgentEmail(e.target.value)} required/></div>
              <Button type="submit" disabled={busy||seatsReserved>=limit}><Plus/> {busy?"Autorizando...":"Autorizar acesso direto"}</Button>
            </form>
            <div className="mt-5 rounded-2xl border border-primary/25 bg-secondary/40 p-4">
              <p className="font-semibold">Link fixo para os corretores</p>
              <p className="mt-1 text-xs text-muted-foreground">Pode enviá-lo a todos os corretores autorizados desta imobiliária. Somente o e-mail aprovado ativa uma conta.</p>
              <p className="mt-3 break-all rounded-lg bg-card p-3 text-xs">{brokerAccessUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={async()=>{
                  try{await navigator.clipboard.writeText(brokerAccessUrl);toast.success("Link copiado.");}
                  catch{toast.info("Copie o link acima.");}
                }}>Copiar link</Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={"https://wa.me/?text="+encodeURIComponent("Olá! Seu acesso ao CRM foi autorizado. Entre com seu e-mail por este link: "+brokerAccessUrl)}
                     target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={brokerAccessUrl} target="_blank" rel="noopener noreferrer">Testar em outra aba</a>
                </Button>
              </div>
            </div>
          </>:<p className="mt-4 rounded-xl border p-3 text-sm text-muted-foreground">Somente o proprietário da imobiliária e o administrador master podem liberar corretores.</p>}
        </article>
      </div>
      <article className={panel}>
        <h4 className="mb-4 text-xl">Equipe vinculada</h4>
        {canManageTeam&&authorizations.filter(a=>a.state!=="ativo").map(a=><div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-border/70 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-900">{a.name.slice(0,1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.email}</p></div>
          <span className="text-xs text-muted-foreground">{a.state==="revogado"?"Revogado":"Autorizado · aguardando cadastro"}</span>
          {a.state!=="revogado"&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>void revokeAuthorization(a.email)}>Revogar</Button>}
        </div>)}
        {team.length?team.map(p=><div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border/70 py-4 last:border-b-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-bold text-primary">{p.name.slice(0,1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="font-semibold">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.email}</p>
            <p className={"mt-1 text-xs "+(!p.active&&leads.some(l=>l.assigned_agent_id===p.id)?"font-semibold text-amber-700":"text-muted-foreground")}>
              {leads.filter(l=>l.assigned_agent_id===p.id).length} leads atribuídos
              {!p.active&&leads.some(l=>l.assigned_agent_id===p.id)?" · atendimento bloqueado enquanto desativado":""}
            </p></div>
          <span className="text-sm text-muted-foreground">{p.active?"Ativo":"Desativado"}</span>
          {canManageTeam&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>supabase.rpc("crm_toggle_salesperson",{_agent:p.id,_active:!p.active}),"Acesso do corretor atualizado.")}>
            {p.active?"Desativar":"Reativar"}
          </Button>}
        </div>):<p className="text-sm text-muted-foreground">Nenhum corretor cadastrado.</p>}
      </article>
    </div>}

    {leadDraft && <Modal title={leadDraft.id?"Editar lead":"Novo lead"} close={()=>setLeadDraft(null)}>
      <form onSubmit={saveLead} className="space-y-4">
        <Field label="Nome do interessado"><Input required minLength={2} value={leadDraft.name??""} onChange={e=>setLeadDraft({...leadDraft,name:e.target.value})}/></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone / WhatsApp"><Input value={leadDraft.phone??""} onChange={e=>setLeadDraft({...leadDraft,phone:e.target.value})}/></Field>
          <Field label="E-mail"><Input type="email" value={leadDraft.email??""} onChange={e=>setLeadDraft({...leadDraft,email:e.target.value})}/></Field>
          <Field label="Data de nascimento (opcional)">
            <Input type="date" value={leadDraft.birth_date??""}
              onChange={e=>setLeadDraft({...leadDraft,birth_date:e.target.value||null})}/>
            <p className="mt-1 text-xs text-muted-foreground">Usada somente para lembretes internos de aniversário.</p>
          </Field>
          <Field label="Origem"><select className={fieldStyle} value={leadDraft.source??"manual"} onChange={e=>setLeadDraft({...leadDraft,source:e.target.value as Lead["source"]})}>{Object.entries(SOURCES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Etapa"><select className={fieldStyle} value={leadDraft.stage??"novo"} onChange={e=>setLeadDraft({...leadDraft,stage:e.target.value as LeadStage})}>{LEAD_STAGES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Imóvel de interesse"><select className={fieldStyle} value={leadDraft.property_id??""} onChange={e=>setLeadDraft({...leadDraft,property_id:e.target.value||null})}><option value="">Não definido</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
          {!isBroker&&<Field label="Encaminhar para corretor"><select className={fieldStyle} value={leadDraft.assigned_agent_id??""} onChange={e=>setLeadDraft({...leadDraft,assigned_agent_id:e.target.value||null})}><option value="">Sem atribuição</option>{team.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
          <Field label="Orçamento (R$)"><Input type="number" min="0" step="0.01" value={leadDraft.budget_brl??""} onChange={e=>setLeadDraft({...leadDraft,budget_brl:e.target.value?Number(e.target.value):null})}/></Field>
          <Field label="Próximo contato"><Input type="datetime-local" value={leadDraft.next_contact_at?todayLocal(leadDraft.next_contact_at):""} onChange={e=>setLeadDraft({...leadDraft,next_contact_at:e.target.value?new Date(e.target.value).toISOString():null})}/></Field>
        </div>
        <Field label="Observações"><Textarea rows={3} value={leadDraft.notes??""} onChange={e=>setLeadDraft({...leadDraft,notes:e.target.value})}/></Field>
        <Button disabled={busy} type="submit" className="w-full">{busy?"Salvando...":"Salvar lead"}</Button>
      </form>
      {canManageTeam&&leadDraft.id&&<div className="mt-5 border-t pt-4">
        <Button type="button" variant="outline" disabled={busy}
          className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={()=>{
            const target=leads.find(l=>l.id===leadDraft.id);
            if(target)requestLeadDeletion(target);
          }}><Trash2 className="h-4 w-4"/> Excluir este lead</Button>
      </div>}
    </Modal>}

    {canManageTeam&&showLeadDeletePicker&&<Modal title="Excluir lead" close={()=>{if(!busy){setShowLeadDeletePicker(false);setLeadDeleteSelection("");}}}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Selecione o lead que deseja apagar da imobiliária <strong>{agencyName}</strong>.
          A próxima etapa mostrará o histórico que também será excluído.
        </p>
        <div className="space-y-2">
          <Label htmlFor="lead-to-delete">Lead cadastrado</Label>
          <select id="lead-to-delete" className={fieldStyle} value={leadDeleteSelection}
            onChange={e=>setLeadDeleteSelection(e.target.value)}>
            <option value="">Selecione um lead...</option>
            {leads.map(l=><option key={l.id} value={l.id}>{l.name}{l.phone?" · "+l.phone:""}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={busy}
            onClick={()=>{setShowLeadDeletePicker(false);setLeadDeleteSelection("");}}>Cancelar</Button>
          <Button type="button" variant="destructive" disabled={busy||!leadDeleteSelection}
            onClick={()=>{
              const chosen=leads.find(l=>l.id===leadDeleteSelection);
              if(chosen)requestLeadDeletion(chosen);
            }}><Trash2 className="h-4 w-4"/> Continuar para confirmação</Button>
        </div>
      </div>
    </Modal>}
    {canManageTeam&&leadToDelete&&<Modal title="Confirmar exclusão do lead" close={closeLeadDeletion}>
      {(()=>{
        const impact=leadDeletionImpact(leadToDelete.id,visits,deals);
        return <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive"/>
            <div>
              <p className="font-semibold text-destructive">Exclusão permanente</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Você está prestes a apagar <strong>{leadToDelete.name}</strong> da imobiliária <strong>{agencyName}</strong>.
                Esta ação não pode ser desfeita pelo CRM.
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-semibold">Dados que serão apagados junto com o lead:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>{impact.visits} visita{impact.visits===1?"":"s"} agendada{impact.visits===1?"":"s"} ou registrada{impact.visits===1?"":"s"}</li>
              <li>{impact.deals} negociação{impact.deals===1?"":"ões"} vinculada{impact.deals===1?"":"s"}</li>
              {impact.completedSales>0&&<li className="font-medium text-destructive">
                {impact.completedSales} venda{impact.completedSales===1?"":"s"} concluída{impact.completedSales===1?"":"s"}:
                {crmBRL(impact.totalSoldBrl)} sairão dos gráficos de faturamento
              </li>}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Imóveis cadastrados e outros leads não serão apagados. Caso precise preservar estes dados,
              faça o backup da imobiliária antes de excluir.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-lead">Digite <strong>EXCLUIR</strong> para confirmar:</Label>
            <Input id="confirm-delete-lead" autoComplete="off" spellCheck={false}
              placeholder="EXCLUIR" value={deleteConfirmation}
              onChange={e=>setDeleteConfirmation(e.target.value)}/>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={busy} onClick={closeLeadDeletion}>Cancelar</Button>
            <Button type="button" variant="destructive" className="gap-2"
              disabled={busy||deleteConfirmation!=="EXCLUIR"} onClick={()=>void deleteLead()}>
              <Trash2 className="h-4 w-4"/>{busy?"Excluindo...":"Excluir lead definitivamente"}
            </Button>
          </div>
        </div>;
      })()}
    </Modal>}
    {visitDraft&&<Modal title="Agendar visita" close={()=>setVisitDraft(null)}><form className="space-y-4" onSubmit={saveVisit}>
      <Field label="Interessado"><select required className={fieldStyle} value={visitDraft.lead_id??""} onChange={e=>{const l=leadById(e.target.value);setVisitDraft({...visitDraft,lead_id:e.target.value,property_id:l?.property_id??""});}}>
        <option value="">Selecione o lead</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="Imóvel"><select required className={fieldStyle} value={visitDraft.property_id??""} onChange={e=>setVisitDraft({...visitDraft,property_id:e.target.value})}>
        <option value="">Selecione o imóvel</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
      <Field label="Data e horário"><Input type="datetime-local" required value={visitDraft.scheduled_at?todayLocal(visitDraft.scheduled_at):""} onChange={e=>setVisitDraft({...visitDraft,scheduled_at:e.target.value?new Date(e.target.value).toISOString():""})}/></Field>
      <Field label="Observações"><Textarea rows={3} value={visitDraft.notes??""} onChange={e=>setVisitDraft({...visitDraft,notes:e.target.value})}/></Field>
      <Button type="submit" disabled={busy} className="w-full">Salvar visita</Button>
    </form></Modal>}

    {dealDraft&&<Modal title="Registrar negociação" close={()=>setDealDraft(null)}><form className="space-y-4" onSubmit={saveDeal}>
      <Field label="Nome da negociação"><Input required value={dealDraft.title??""} onChange={e=>setDealDraft({...dealDraft,title:e.target.value})} placeholder="Venda do imóvel no Jardim..."/></Field>
      <Field label="Lead interessado"><select className={fieldStyle} required value={dealDraft.lead_id??""} onChange={e=>{const l=leadById(e.target.value);setDealDraft({...dealDraft,lead_id:e.target.value,property_id:l?.property_id??null});}}>
        <option value="">Selecione o lead</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="Imóvel"><select className={fieldStyle} value={dealDraft.property_id??""} onChange={e=>setDealDraft({...dealDraft,property_id:e.target.value||null})}><option value="">Não definido</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Valor negociado (R$)"><Input type="number" min="0" step=".01" required value={dealDraft.amount_brl??0} onChange={e=>setDealDraft({...dealDraft,amount_brl:Number(e.target.value)})}/></Field>
        <Field label="Etapa"><select className={fieldStyle} value={dealDraft.status??"proposta"} onChange={e=>setDealDraft({...dealDraft,status:e.target.value as DealStage})}>{DEAL_STAGES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Previsão de fechamento"><Input type="date" value={dealDraft.expected_close_date??""} onChange={e=>setDealDraft({...dealDraft,expected_close_date:e.target.value||null})}/></Field>
      </div>
      <Field label="Observações"><Textarea rows={3} value={dealDraft.notes??""} onChange={e=>setDealDraft({...dealDraft,notes:e.target.value})}/></Field>
      <Button type="submit" disabled={busy} className="w-full">Salvar negociação</Button>
    </form></Modal>}
  </section>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}) {
  return <div role="presentation" className="fixed inset-0 z-[1500] flex items-center justify-center overflow-y-auto bg-black/60 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[26px] bg-background p-5 shadow-float sm:p-7">
      <div className="mb-6 flex items-center justify-between"><h3 className="text-2xl">{title}</h3><button type="button" aria-label="Fechar" onClick={close} className="rounded-xl bg-muted px-3 py-2 text-sm">Fechar</button></div>
      {children}
    </div>
  </div>;
}
