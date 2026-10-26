import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowUpRight, CalendarDays, ChartNoAxesCombined, CircleDollarSign,
  Handshake, KanbanSquare, MessageCircle, Plus, Users,
  UserRound, TrendingUp, Search, ClipboardCheck, UserPlus, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  crmBRL, crmMetrics, revenueByMonth, LEAD_STAGES, DEAL_STAGES,
  VISIT_STATUSES, SOURCES, PLANS, crmPhone,
  type Lead, type Deal, type Visit, type Salesperson, type CRMSettings,
  type LeadStage, type DealStage,
} from "@/lib/crm";

type PropertyOption = { id: string; title: string };
type CRMTab = "visao" | "leads" | "visitas" | "negociacoes" | "equipe";
type CRMData = {
  leads:Lead[]; visits:Visit[]; deals:Deal[]; team:Salesperson[];
  properties:PropertyOption[]; settings:CRMSettings|null; seats:number;
};
type Props = {
  agencyId:string;
  agencyName:string;
  isMaster?:boolean;
  isBroker?:boolean;
  brokerId?:string;
};
const tabs: { key:CRMTab;label:string;icon:typeof Users }[] = [
  {key:"visao",label:"Visão geral",icon:ChartNoAxesCombined},
  {key:"leads",label:"Funil de leads",icon:KanbanSquare},
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

export function CRMWorkspace({agencyId,agencyName,isMaster=false,isBroker=false,brokerId}:Props) {
  const qc=useQueryClient();
  const [tab,setTab]=useState<CRMTab>("visao");
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [leadDraft,setLeadDraft]=useState<Partial<Lead>|null>(null);
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
        supabase.from("properties").select("id,title").eq("agency_id",agencyId).order("title"),
      ]);
      for(const item of [a,b,c,d,e])if(item.error)throw item.error;
      let settings: CRMSettings|null=null, seats=0;
      if(!isBroker){
        const [f,g]=await Promise.all([
          supabase.from("crm_settings").select("*").eq("agency_id",agencyId).maybeSingle(),
          supabase.rpc("crm_count_seats",{_agency:agencyId}),
        ]);
        if(f.error)throw f.error;
        if(g.error)throw g.error;
        settings=f.data;
        seats=g.data??0;
      }
      return {leads:a.data??[],visits:b.data??[],deals:c.data??[],
        team:d.data??[],properties:e.data??[],settings,seats};
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
  const {leads,visits,deals,team,properties,settings,seats}=q.data;
  const metrics=crmMetrics(leads,deals,visits);
  const chartData=revenueByMonth(deals);
  const plan=settings?.plan??"essencial",limit=settings?.max_users??3;
  const agentNameById=(id?:string|null)=>team.find(p=>p.id===id)?.name??"Sem corretor";
  const leadById=(id:string)=>leads.find(l=>l.id===id);
  const propertyName=(id?:string|null)=>properties.find(p=>p.id===id)?.title??"Imóvel não informado";
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
  const updateVisit=(id:string,status:Visit["status"])=>run(async()=>supabase.from("crm_visits").update({status}).eq("id",id).eq("agency_id",agencyId),"Visita atualizada.");
  const updateDeal=(d:Deal,status:DealStage)=>run(async()=>supabase.from("crm_deals").update({
    status,closed_at:status==="ganho"?(d.closed_at??new Date().toISOString()):null,
  }).eq("id",d.id).eq("agency_id",agencyId),"Negociação atualizada.");
  const saveLead=async(e:React.FormEvent)=>{
    e.preventDefault();
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
    if(!agentEmail.includes("@")||agentName.trim().length<2)return toast.error("Informe nome e e-mail válidos.");
    const ok=await run(()=>supabase.rpc("crm_assign_salesperson",{
      _agency:agencyId,_email:agentEmail.trim(),_name:agentName.trim(),
    }),"Corretor vinculado à imobiliária.");
    if(ok){setAgentName("");setAgentEmail("");}
  };
  const changePlan=async(next:string)=>{
    if(!isMaster)return;
    const p=PLANS.find(x=>x.id===next);
    if(!p)return;
    if(p.limit<seats){toast.error("Este plano comporta menos usuários do que os atuais. Desative usuários antes.");return;}
    await run(()=>supabase.from("crm_settings").upsert({
      agency_id:agencyId,plan:p.id,max_users:p.limit,
    },{onConflict:"agency_id"}),"Limite do CRM atualizado.");
  };

  return <section className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.17em] text-primary">CASAS · CRM Imobiliário</span>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{isBroker?"Minha carteira comercial":"Gestão comercial"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{agencyName} · Leads, visitas, negócios e resultados em tempo real.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={reload}>Atualizar</Button>
        <Button onClick={()=>{setTab("leads");setLeadDraft({name:"",stage:"novo",source:"manual",assigned_agent_id:isBroker?brokerId:null});}}>
          <Plus/> Novo lead
        </Button>
      </div>
    </div>
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
          <div className="mt-4 space-y-2">{bestAgents.slice(0,3).map(s=><div key={s.name} className="flex justify-between gap-2 text-sm"><span>{s.name}</span><strong>{crmBRL(s.total)}</strong></div>)}
            {!bestAgents.length && <p className="text-sm text-muted-foreground">Cadastre corretores para acompanhar resultados.</p>}
          </div>
        </article>
      </div>
      <p className="text-xs text-muted-foreground">Os gráficos são gerados a partir dos registros do CRM; valores de negócios ganhos são declarados manualmente e não representam confirmação bancária de recebimento.</p>
    </div>}

    {tab==="leads" && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-2xl">Leads e distribuição</h3><p className="text-sm text-muted-foreground">{leads.length} contatos na carteira</p></div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente ou imóvel" className="w-64 pl-9"/></div>
          <Button onClick={()=>setLeadDraft({name:"",stage:"novo",source:"manual",assigned_agent_id:isBroker?brokerId:null})}><Plus/> Cadastrar</Button>
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
                  {wa && <a aria-label={"WhatsApp de "+l.name} href={"https://wa.me/"+wa} target="_blank" rel="noreferrer" className="rounded-lg border p-2 text-primary"><MessageCircle className="h-4 w-4"/></a>}
                </div>
                <select aria-label={"Etapa de "+l.name} className="mt-3 w-full rounded-lg border bg-background px-2 py-2 text-xs"
                  value={l.stage} disabled={busy} onChange={e=>void updateLead(l.id,{stage:e.target.value as LeadStage})}>
                  {LEAD_STAGES.map(st=><option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
                {!isBroker && <select aria-label={"Corretor de "+l.name} className="mt-2 w-full rounded-lg border bg-background px-2 py-2 text-xs"
                  value={l.assigned_agent_id??""} disabled={busy} onChange={e=>void updateLead(l.id,{assigned_agent_id:e.target.value||null})}>
                  <option value="">Sem corretor atribuído</option>{team.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>}
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
          <p className="mt-4 text-3xl font-bold">{seats} <span className="text-lg font-medium text-muted-foreground">/ {limit} usuários</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:Math.min(100,(seats/Math.max(limit,1))*100)+"%"}}/></div>
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
          <div className="flex items-center gap-3"><UserPlus className="h-5 w-5 text-primary"/><h4 className="text-lg">Adicionar corretor</h4></div>
          <p className="mt-3 text-xs text-muted-foreground">Crie primeiro o usuário em Cloud → Users do CASAS. Depois vincule pelo e-mail aqui. Não compartilhe sua senha.</p>
          <form onSubmit={addAgent} className="mt-4 space-y-3">
            <div><Label htmlFor="crm-agent-name">Nome do corretor</Label><Input id="crm-agent-name" value={agentName} onChange={e=>setAgentName(e.target.value)} required/></div>
            <div><Label htmlFor="crm-agent-email">E-mail de acesso já cadastrado</Label><Input id="crm-agent-email" type="email" value={agentEmail} onChange={e=>setAgentEmail(e.target.value)} required/></div>
            <Button type="submit" disabled={busy||seats>=limit}><Plus/> Vincular corretor</Button>
          </form>
        </article>
      </div>
      <article className={panel}>
        <h4 className="mb-4 text-xl">Equipe vinculada</h4>
        {team.length?team.map(p=><div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border/70 py-4 last:border-b-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-bold text-primary">{p.name.slice(0,1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.email}</p></div>
          <span className="text-sm text-muted-foreground">{p.active?"Ativo":"Desativado"}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>supabase.rpc("crm_toggle_salesperson",{_agent:p.id,_active:!p.active}),"Acesso do corretor atualizado.")}>
            {p.active?"Desativar":"Reativar"}
          </Button>
        </div>):<p className="text-sm text-muted-foreground">Nenhum corretor cadastrado.</p>}
      </article>
    </div>}

    {leadDraft && <Modal title={leadDraft.id?"Editar lead":"Novo lead"} close={()=>setLeadDraft(null)}>
      <form onSubmit={saveLead} className="space-y-4">
        <Field label="Nome do interessado"><Input required minLength={2} value={leadDraft.name??""} onChange={e=>setLeadDraft({...leadDraft,name:e.target.value})}/></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone / WhatsApp"><Input value={leadDraft.phone??""} onChange={e=>setLeadDraft({...leadDraft,phone:e.target.value})}/></Field>
          <Field label="E-mail"><Input type="email" value={leadDraft.email??""} onChange={e=>setLeadDraft({...leadDraft,email:e.target.value})}/></Field>
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
