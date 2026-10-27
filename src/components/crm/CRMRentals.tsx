import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Banknote,Building2,CalendarDays,CheckCircle2,Clock3,FileText,Plus,RefreshCcw,Wallet} from "lucide-react";
import {toast} from "sonner";
import {supabase} from "@/integrations/supabase/client";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {crmBRL} from "@/lib/crm";
import {
 rentalBRL,rentalDueDate,rentalFirstMonth,rentalLocalToday,rentalTotals,rentPaymentStatus,
 validRentalMoney,type Rental,type RentReceivable,type RentalProperty,
} from "@/lib/rentals";

type LeadChoice={id:string;name:string;phone:string;email:string|null};
type Props={agencyId:string;properties:RentalProperty[];leads:LeadChoice[]};
type RentalDraft={
 id?:string;property_id:string;lead_id:string;tenant_name:string;tenant_phone:string;
 tenant_email:string;start_date:string;end_date:string;due_day:string;
 monthly_rent:string;status:"ativo"|"encerrado";notes:string;
};
const fieldClass="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm";
const card="rounded-[24px] border border-border/70 bg-card p-5 shadow-sm sm:p-6";
const defaultLease=():RentalDraft=>({
 property_id:"",lead_id:"",tenant_name:"",tenant_phone:"",tenant_email:"",
 start_date:rentalLocalToday(),end_date:"",due_day:"10",monthly_rent:"",
 status:"ativo",notes:"",
});
const initials=(lease:Rental):RentalDraft=>({
 id:lease.id,property_id:lease.property_id,lead_id:lease.lead_id??"",
 tenant_name:lease.tenant_name,tenant_phone:lease.tenant_phone,
 tenant_email:lease.tenant_email??"",start_date:lease.start_date,
 end_date:lease.end_date??"",due_day:String(lease.due_day),
 monthly_rent:String(lease.monthly_rent),status:lease.status,notes:lease.notes,
});
function useRentalData(agencyId:string){
 return useQuery({
   queryKey:["casas-rentals",agencyId],enabled:!!agencyId,
   queryFn:async()=>{
     const [leases,bills]=await Promise.all([
       supabase.from("crm_rentals").select("*").eq("agency_id",agencyId).order("created_at",{ascending:false}),
       supabase.from("crm_rent_receivables").select("*").eq("agency_id",agencyId).order("due_date",{ascending:true}),
     ]);
     if(leases.error)throw leases.error;
     if(bills.error)throw bills.error;
     return {rentals:leases.data??[],payments:bills.data??[]};
   },
   staleTime:10000,refetchInterval:60000,
 });
}
function CardMetric({label,value,note,icon:Icon}:{label:string;value:string;note:string;icon:typeof Banknote}){
 return <div className="rounded-[20px] border border-border/70 bg-card p-4 shadow-sm">
   <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-primary"/>{label}</div>
   <p className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
   <p className="mt-1 text-xs text-muted-foreground">{note}</p>
 </div>;
}
export function RentalSummary({agencyId,onOpen}:{agencyId:string;onOpen:()=>void}){
 const q=useRentalData(agencyId);
 if(q.isLoading)return <div className={card}><p className="text-sm text-muted-foreground">Carregando aluguéis...</p></div>;
 if(q.isError||!q.data)return <div className={card}><p className="text-sm text-destructive">Não foi possível carregar os dados das locações.</p></div>;
 const totals=rentalTotals(q.data.rentals,q.data.payments);
 return <section className="space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h3 className="text-xl font-semibold">Locações e aluguéis</h3><p className="text-sm text-muted-foreground">Recebíveis separados do faturamento de vendas.</p></div>
     <Button variant="outline" size="sm" onClick={onOpen}>Abrir controle de aluguéis</Button>
   </div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     <CardMetric label="Contratos ativos" value={String(totals.active)} note={rentalBRL(totals.monthlyContracted)+"/mês contratado"} icon={Building2}/>
     <CardMetric label="Aluguéis a receber" value={rentalBRL(totals.openAmount)} note={totals.pending+" mensalidades pendentes"} icon={Wallet}/>
     <CardMetric label="Vencidos" value={rentalBRL(totals.overdueAmount)} note={totals.overdueCount+" parcelas em atraso"} icon={Clock3}/>
     <CardMetric label="Recebidos neste mês" value={rentalBRL(totals.receivedThisMonth)} note="Baixas manuais registradas" icon={CheckCircle2}/>
   </div>
 </section>;
}

export function CRMRentals({agencyId,properties,leads}:Props){
 const qc=useQueryClient();
 const q=useRentalData(agencyId);
 const [section,setSection]=useState<"contratos"|"recebiveis">("contratos");
 const [draft,setDraft]=useState<RentalDraft|null>(null);
 const [busy,setBusy]=useState(false);
 const [month,setMonth]=useState(rentalFirstMonth().slice(0,7));
 const [months,setMonths]=useState("3");
 const [selectedRental,setSelectedRental]=useState("");
 const [manualAmount,setManualAmount]=useState("");
 const [manualNotes,setManualNotes]=useState("");
 const [showManual,setShowManual]=useState(false);
 const [statusFilter,setStatusFilter]=useState<"todos"|"pendente"|"recebido"|"vencido">("todos");
 const ownerQuery=useQuery({
   queryKey:["rental-owner",agencyId],enabled:!!agencyId,
   queryFn:async()=>{const result=await supabase.rpc("crm_is_owner",{_agency:agencyId});if(result.error)throw result.error;return !!result.data;},
 });
 // The owner check is authoritative for reversing a posted receipt.
 const propertiesForRent=properties.filter(p=>p.purpose==="locacao");
 const reload=()=>void qc.invalidateQueries({queryKey:["casas-rentals",agencyId]});
 async function act(fn:()=>PromiseLike<{error:{message:string}|null}>,success:string){
   if(busy)return false;
   setBusy(true);
   try{
     const {error}=await fn();
     if(error)throw Error(error.message);
     toast.success(success);reload();return true;
   }catch(e){toast.error((e as Error).message||"Não foi possível salvar.");return false;}
   finally{setBusy(false);}
 }
 const leases=q.data?.rentals??[];
 const payments=q.data?.payments??[];
 const totals=rentalTotals(leases,payments);
 const byProperty=(id:string)=>properties.find(p=>p.id===id)?.title??"Imóvel não disponível";
 const byLease=(id:string)=>leases.find(l=>l.id===id);
 const renter=(l:Rental)=>l.tenant_name;
 const selected=byLease(selectedRental);
 const openRental=(r?:Rental)=>{
   setDraft(r?initials(r):defaultLease());
 };
 async function saveRental(e:React.FormEvent){
   e.preventDefault();
   if(!draft)return;
   if(!propertiesForRent.some(p=>p.id===draft.property_id))return toast.error("Selecione um imóvel cadastrado como Locação.");
   const rent=Number(draft.monthly_rent),day=Number(draft.due_day);
   if(!validRentalMoney(rent))return toast.error("Informe um valor mensal válido.");
   if(!Number.isInteger(day)||day<1||day>28)return toast.error("O vencimento precisa ser entre os dias 1 e 28.");
   if(!draft.tenant_name.trim()||draft.tenant_name.trim().length<2)return toast.error("Informe o nome do inquilino.");
   if(!draft.start_date || (draft.end_date && draft.end_date<draft.start_date))return toast.error("Período do contrato inválido.");
   const data={
     agency_id:agencyId,property_id:draft.property_id,lead_id:draft.lead_id||null,
     tenant_name:draft.tenant_name.trim(),tenant_phone:draft.tenant_phone.trim(),
     tenant_email:draft.tenant_email.trim()||null,start_date:draft.start_date,end_date:draft.end_date||null,
     due_day:day,monthly_rent:rent,status:draft.status,notes:draft.notes,
   };
   const ok=await act(()=>(
     draft.id?supabase.from("crm_rentals").update(data).eq("id",draft.id).eq("agency_id",agencyId).select("id").single()
       :supabase.from("crm_rentals").insert(data).select("id").single()
   ),draft.id?"Contrato atualizado.":"Contrato de locação cadastrado.");
   if(ok)setDraft(null);
 }
 async function generate(id:string){
   const start=month+"-01";
   const count=Number(months);
   const lease=byLease(id);
   if(!lease)return;
   const firstDue=rentalDueDate(start,lease.due_day);
   if(firstDue<lease.start_date || lease.end_date && firstDue>lease.end_date)
     return toast.error("O primeiro vencimento está fora da vigência do contrato.");
   await act(()=>supabase.rpc("crm_generate_rent_receivables",{
     _rental_id:id,_first_month:start,_months:count,
   }).then(({data,error})=>({error:error??null,data})),
   "Mensalidades geradas. Parcelas existentes foram preservadas.");
 }
 async function addManual(e:React.FormEvent){
   e.preventDefault();
   if(!selected)return toast.error("Selecione um contrato.");
   const reference=month+"-01";
   const amount=Number(manualAmount);
   if(!validRentalMoney(amount))return toast.error("Informe um aluguel válido.");
   let due:string;
   try{due=rentalDueDate(reference,selected.due_day);}catch{return toast.error("Mês inválido.");}
   if(due<selected.start_date || selected.end_date && due>selected.end_date)
     return toast.error("Vencimento fora do contrato.");
   const ok=await act(()=>supabase.from("crm_rent_receivables").insert({
     agency_id:agencyId,rental_id:selected.id,reference_month:reference,
     due_date:due,amount,status:"pendente",received_at:null,notes:manualNotes,
   }).select("id").single(),"Aluguel a receber cadastrado.");
   if(ok){setShowManual(false);setManualAmount("");setManualNotes("");setSection("recebiveis");}
 }
 async function markPayment(item:RentReceivable,received:boolean){
   if(!received&&!ownerQuery.data)return toast.error("Somente o proprietário pode desfazer o recebimento.");
   if(received&&!window.confirm("Confirmar o recebimento de "+rentalBRL(item.amount)+" referente a "+item.reference_month.slice(0,7)+"?"))return;
   await act(()=>supabase.from("crm_rent_receivables").update({
     status:received?"recebido":"pendente",received_at:received?new Date().toISOString():null,
   }).eq("id",item.id).eq("agency_id",agencyId).select("id").single(),
   received?"Aluguel marcado como recebido.":"Recebimento desfeito.");
 }
 const visible=payments.filter(p=>
   statusFilter==="todos" ||
   (statusFilter==="vencido"?p.status==="pendente"&&p.due_date<rentalLocalToday()
     :p.status===statusFilter));
 if(q.isLoading)return <div className={card}>Carregando controle de locações...</div>;
 if(q.isError)return <div className={card}><p>Falha ao carregar contratos. {q.error instanceof Error?q.error.message:""}</p>
   <Button className="mt-4" variant="outline" onClick={()=>void q.refetch()}>Tentar novamente</Button></div>;
 return <section className="space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
     <div><h3 className="text-2xl font-semibold">Gestão de aluguéis</h3>
       <p className="mt-1 text-sm text-muted-foreground">Contratos vinculados aos imóveis de locação, parcelas a receber e baixas manuais.</p></div>
     <Button variant="outline" size="sm" onClick={reload}><RefreshCcw className="h-4 w-4"/> Atualizar</Button>
   </div>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <CardMetric label="Contratos cadastrados" value={String(totals.registered)} note={totals.active+" ativos"} icon={Building2}/>
     <CardMetric label="Aluguéis a receber" value={rentalBRL(totals.openAmount)} note={totals.pending+" parcelas"} icon={Wallet}/>
     <CardMetric label="Aluguéis vencidos" value={rentalBRL(totals.overdueAmount)} note={totals.overdueCount+" em atraso"} icon={Clock3}/>
     <CardMetric label="Recebidos no mês" value={rentalBRL(totals.receivedThisMonth)} note="Valores confirmados manualmente" icon={CheckCircle2}/>
   </div>
   <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-2">
     <Button variant={section==="contratos"?"default":"ghost"} size="sm" onClick={()=>setSection("contratos")}>
       <FileText className="h-4 w-4"/> Contratos de aluguel</Button>
     <Button variant={section==="recebiveis"?"default":"ghost"} size="sm" onClick={()=>setSection("recebiveis")}>
       <Banknote className="h-4 w-4"/> Aluguéis a receber</Button>
   </div>
   {section==="contratos"&&<div className="space-y-4">
     <div className="flex flex-wrap items-center justify-between gap-3">
       <h4 className="text-lg font-semibold">Locações cadastradas</h4>
       <Button disabled={busy||!propertiesForRent.length} onClick={()=>openRental()}><Plus className="h-4 w-4"/> Novo contrato</Button>
     </div>
     {!propertiesForRent.length&&<div className={card}>
       <p className="font-semibold">Cadastre primeiro um imóvel para locação.</p>
       <p className="mt-2 text-sm text-muted-foreground">
         No cadastro de imóveis, escolha Finalidade: Locação. Os imóveis de venda continuam disponíveis normalmente no CRM.
       </p>
     </div>}
     {leases.length?leases.map(r=><article key={r.id} className={card}>
       <div className="flex flex-wrap justify-between gap-3">
         <div className="min-w-0 flex-1">
           <div className="flex flex-wrap items-center gap-2">
             <h5 className="text-lg font-semibold">{byProperty(r.property_id)}</h5>
             <span className={"rounded-full px-2 py-1 text-xs font-semibold "+(r.status==="ativo"?"bg-green-100 text-green-800":"bg-muted text-muted-foreground")}>
               {r.status==="ativo"?"Contrato ativo":"Encerrado"}</span>
           </div>
           <p className="mt-2 text-sm text-muted-foreground">Inquilino: <strong>{renter(r)}</strong>{r.tenant_phone?" · "+r.tenant_phone:""}</p>
           <p className="mt-2 text-xl font-bold">{rentalBRL(r.monthly_rent)}<span className="text-sm font-normal text-muted-foreground"> / mês</span></p>
           <p className="mt-2 text-xs text-muted-foreground">Vencimento dia {r.due_day} · Início {r.start_date.split("-").reverse().join("/")}
             {r.end_date?" · Término "+r.end_date.split("-").reverse().join("/"):""}</p>
         </div>
         <Button variant="outline" size="sm" disabled={busy} onClick={()=>openRental(r)}>Editar contrato</Button>
       </div>
       {r.status==="ativo"&&<div className="mt-5 flex flex-wrap items-end gap-3 border-t pt-4">
         <div className="space-y-1"><Label htmlFor={"rent-month-"+r.id}>A partir de</Label>
           <Input id={"rent-month-"+r.id} type="month" value={month} onChange={e=>setMonth(e.target.value)} className="w-44"/></div>
         <div className="space-y-1"><Label htmlFor={"rent-count-"+r.id}>Mensalidades</Label>
           <select id={"rent-count-"+r.id} className={fieldClass+" w-40"} value={months} onChange={e=>setMonths(e.target.value)}>
             {[1,3,6,12].map(i=><option value={i} key={i}>{i} {i===1?"mês":"meses"}</option>)}
           </select></div>
         <Button type="button" variant="outline" disabled={busy||!month}
           onClick={()=>void generate(r.id)}><CalendarDays className="h-4 w-4"/> Gerar parcelas</Button>
         <p className="w-full text-xs text-muted-foreground">Parcelas já cadastradas não serão duplicadas ou alteradas.</p>
       </div>}
     </article>):<div className={card}><p className="text-sm text-muted-foreground">Nenhum contrato cadastrado nesta imobiliária.</p></div>}
   </div>}
   {section==="recebiveis"&&<div className="space-y-4">
     <div className="flex flex-wrap items-center justify-between gap-3">
       <h4 className="text-lg font-semibold">Controle de aluguéis</h4>
       <Button disabled={!leases.some(l=>l.status==="ativo")||busy}
         onClick={()=>{
           const first=leases.find(l=>l.status==="ativo");
           setSelectedRental(first?.id??"");
           setManualAmount(first?String(first.monthly_rent):"");
           setShowManual(true);
         }}>
         <Plus className="h-4 w-4"/> Cadastrar aluguel a receber</Button>
     </div>
     <div className="flex flex-wrap gap-2">
       {([["todos","Todos"],["pendente","Pendentes"],["vencido","Vencidos"],["recebido","Recebidos"]] as const).map(([id,label])=>
         <Button type="button" key={id} size="sm" variant={statusFilter===id?"default":"outline"} onClick={()=>setStatusFilter(id)}>{label}</Button>)}
     </div>
     <div className={card}>
       {visible.length?visible.map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
         <div className="min-w-0 flex-1">
           <p className="font-semibold">{byProperty(byLease(b.rental_id)?.property_id??"")}</p>
           <p className="mt-1 text-xs text-muted-foreground">
             {byLease(b.rental_id)?.tenant_name??"Inquilino"} · Referência {b.reference_month.slice(0,7).split("-").reverse().join("/")}
             {" · Vencimento "+b.due_date.split("-").reverse().join("/")}
           </p>
           <p className="mt-2 text-lg font-bold">{rentalBRL(b.amount)}</p>
           {b.notes&&<p className="mt-1 text-xs text-muted-foreground">{b.notes}</p>}
         </div>
         <div className="flex flex-wrap items-center gap-2">
           <span className={"rounded-full px-3 py-1.5 text-xs font-bold "+
             (b.status==="recebido"?"bg-green-100 text-green-800":
             b.due_date<rentalLocalToday()?"bg-red-100 text-red-800":"bg-amber-100 text-amber-900")}>
             {rentPaymentStatus(b)}</span>
           {b.status==="pendente"?
             <Button disabled={busy} size="sm" onClick={()=>void markPayment(b,true)}><CheckCircle2 className="h-4 w-4"/> Marcar recebido</Button>
             :ownerQuery.data?<Button disabled={busy} size="sm" variant="outline" onClick={()=>void markPayment(b,false)}>Desfazer baixa</Button>:null}
         </div>
       </div>):<p className="py-10 text-center text-sm text-muted-foreground">Nenhum aluguel encontrado neste filtro. Cadastre um contrato e gere as parcelas.</p>}
     </div>
   </div>}

   {draft&&<div className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/60 p-3" role="presentation"
     onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDraft(null);}}>
     <div role="dialog" aria-modal="true" aria-label={draft.id?"Editar contrato":"Novo contrato de aluguel"}
       className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-background p-5 shadow-2xl sm:p-7">
       <div className="mb-5 flex items-center justify-between gap-3"><h4 className="text-xl font-semibold">{draft.id?"Editar contrato":"Cadastrar contrato de locação"}</h4>
         <Button variant="outline" size="sm" type="button" disabled={busy} onClick={()=>setDraft(null)}>Fechar</Button></div>
       <form className="space-y-4" onSubmit={e=>void saveRental(e)}>
         <div className="space-y-1.5"><Label htmlFor="rent-property">Imóvel cadastrado para locação</Label>
           <select id="rent-property" required className={fieldClass} value={draft.property_id} onChange={e=>{
             const p=propertiesForRent.find(p=>p.id===e.target.value);
             setDraft({...draft,property_id:e.target.value,monthly_rent:p?.price?String(p.price):draft.monthly_rent});
           }}>
             <option value="">Selecione um imóvel</option>
             {propertiesForRent.map(p=><option key={p.id} value={p.id}>{p.title} · {p.status==="alugado"?"Alugado":"Disponível"}</option>)}
           </select></div>
         <div className="space-y-1.5"><Label htmlFor="rent-lead">Vincular ao lead (opcional)</Label>
           <select id="rent-lead" className={fieldClass} value={draft.lead_id} onChange={e=>{
             const lead=leads.find(l=>l.id===e.target.value);
             setDraft({...draft,lead_id:e.target.value,tenant_name:lead?.name??draft.tenant_name,
               tenant_email:lead?.email??draft.tenant_email,tenant_phone:lead?.phone??draft.tenant_phone});
           }}>
             <option value="">Sem lead vinculado</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-1.5"><Label>Inquilino</Label><Input required minLength={2} value={draft.tenant_name} onChange={e=>setDraft({...draft,tenant_name:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>Telefone do inquilino</Label><Input value={draft.tenant_phone} onChange={e=>setDraft({...draft,tenant_phone:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>E-mail do inquilino</Label><Input type="email" value={draft.tenant_email} onChange={e=>setDraft({...draft,tenant_email:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>Valor mensal (R$)</Label><Input type="number" step="0.01" min="0.01" required value={draft.monthly_rent} onChange={e=>setDraft({...draft,monthly_rent:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>Início do contrato</Label><Input type="date" required value={draft.start_date} onChange={e=>setDraft({...draft,start_date:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>Fim do contrato (opcional)</Label><Input type="date" min={draft.start_date} value={draft.end_date} onChange={e=>setDraft({...draft,end_date:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>Dia do vencimento (1–28)</Label><Input type="number" min="1" max="28" required value={draft.due_day} onChange={e=>setDraft({...draft,due_day:e.target.value})}/></div>
           <div className="space-y-1.5"><Label>Situação</Label><select className={fieldClass} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as RentalDraft["status"]})}>
             <option value="ativo">Ativo</option><option value="encerrado">Encerrado</option></select></div>
         </div>
         <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>
         <p className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
           Contrato ativo: o imóvel será identificado como Alugado no site. Ao encerrar, volta a Disponível. As mensalidades já registradas ficam preservadas.
         </p>
         <Button className="w-full" disabled={busy} type="submit">{busy?"Salvando...":draft.id?"Salvar alterações":"Cadastrar contrato"}</Button>
       </form>
     </div>
   </div>}
   {showManual&&<div className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/60 p-3" role="presentation"
     onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setShowManual(false);}}>
     <div role="dialog" aria-modal="true" aria-label="Cadastrar aluguel a receber" className="w-full max-w-lg rounded-3xl bg-background p-6 shadow-2xl">
       <h4 className="mb-4 text-xl font-semibold">Cadastrar aluguel a receber</h4>
       <form className="space-y-4" onSubmit={e=>void addManual(e)}>
         <div className="space-y-1.5"><Label>Contrato</Label><select className={fieldClass} required value={selectedRental} onChange={e=>{
           const lease=byLease(e.target.value);setSelectedRental(e.target.value);setManualAmount(lease?String(lease.monthly_rent):"");
         }}><option value="">Escolha um contrato</option>
           {leases.filter(l=>l.status==="ativo").map(l=><option key={l.id} value={l.id}>{byProperty(l.property_id)} · {l.tenant_name}</option>)}</select></div>
         <div className="grid grid-cols-2 gap-3">
           <div className="space-y-1.5"><Label>Mês de referência</Label><Input type="month" value={month} required onChange={e=>setMonth(e.target.value)}/></div>
           <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0.01" required value={manualAmount||String(selected?.monthly_rent??"")} onChange={e=>setManualAmount(e.target.value)}/></div>
         </div>
         <p className="text-xs text-muted-foreground">Vencimento: dia {selected?.due_day??"—"} do mês selecionado. Não é possível repetir a mesma competência para um contrato.</p>
         <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={manualNotes} onChange={e=>setManualNotes(e.target.value)}/></div>
         <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>setShowManual(false)}>Cancelar</Button>
           <Button type="submit" disabled={busy||!selectedRental}>Cadastrar aluguel</Button></div>
       </form>
     </div>
   </div>}
 </section>;
}
