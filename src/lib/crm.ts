import type { Tables } from "@/integrations/supabase/types";
export type Lead = Tables<"crm_leads">;
export type Visit = Tables<"crm_visits">;
export type Deal = Tables<"crm_deals">;
export type Salesperson = Tables<"crm_salespeople">;
export type CRMSettings = Tables<"crm_settings">;
export type LeadStage = Lead["stage"];
export type DealStage = Deal["status"];

export const LEAD_STAGES: { id: LeadStage; name: string }[] = [
  { id: "novo", name: "Novo lead" },
  { id: "contato", name: "Contato" },
  { id: "visita", name: "Visita" },
  { id: "proposta", name: "Proposta" },
  { id: "negociacao", name: "Negociação" },
  { id: "ganho", name: "Ganho" },
  { id: "perdido", name: "Perdido" },
];
export const DEAL_STAGES: { id: DealStage; name: string }[] = [
  { id: "proposta", name: "Proposta" },{ id: "negociacao", name: "Negociação" },
  { id: "ganho", name: "Venda concluída" },{ id: "perdido", name: "Perdido" },
];
export const SOURCES: Record<Lead["source"],string> = {
  manual:"Cadastro manual", site:"Site", whatsapp:"WhatsApp",
  instagram:"Instagram", indicacao:"Indicação", outro:"Outro",
};
export const VISIT_STATUSES: Record<Visit["status"],string> = {
  agendada: "Agendada", realizada:"Realizada", cancelada:"Cancelada",
};
export const PLANS: { id: CRMSettings["plan"]; name: string; limit: number }[] = [
  { id: "essencial", name: "Essencial", limit: 3 },
  { id: "profissional", name: "Profissional", limit: 5 },
  { id: "premium", name: "Premium", limit: 10 },
];
export const crmBRL = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style:"currency",currency:"BRL",maximumFractionDigits:0 }).format(Number(v || 0));
export function crmPhone(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g,"");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits.startsWith("55") ? digits : "55"+digits;
}
export function monthKey(date: string | Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
export function monthLabel(key: string) {
  const [year,month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(new Date(year,month-1,1)).replace(".","");
}
export function revenueByMonth(deals: Deal[],now = new Date(),months=6) {
  const keys = Array.from({length:months},(_,i)=>{
    const date = new Date(now.getFullYear(),now.getMonth()-months+1+i,1);
    return monthKey(date);
  });
  return keys.map(key=>({
    month:monthLabel(key),
    monthKey:key,
    faturamento:deals.filter(d=>d.status==="ganho"&&d.closed_at&&monthKey(d.closed_at)===key)
      .reduce((sum,d)=>sum+Number(d.amount_brl),0),
  }));
}
export function crmMetrics(leads:Lead[],deals:Deal[],visits:Visit[],now = new Date()){
  const won=deals.filter(d=>d.status==="ganho");
  const open=deals.filter(d=>d.status!=="ganho"&&d.status!=="perdido");
  const start = new Date(now.getFullYear(),now.getMonth(),1).getTime();
  return {
    leads:leads.length,
    won:won.length,
    conversion:leads.length?Math.round((won.length/leads.length)*100):0,
    revenue:won.reduce((sum,d)=>sum+Number(d.amount_brl),0),
    revenueMonth:won.filter(d=>d.closed_at&&new Date(d.closed_at).getTime()>=start)
      .reduce((sum,d)=>sum+Number(d.amount_brl),0),
    forecast:open.reduce((sum,d)=>sum+Number(d.amount_brl),0),
    upcoming:visits.filter(v=>v.status==="agendada"&&new Date(v.scheduled_at)>=now).length,
  };
}
