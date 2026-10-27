import { describe, expect, it } from "vitest";
import { crmMetrics, negotiationCloseDate, revenueByMonth } from "@/lib/crm";
import type { Deal, Lead } from "@/lib/crm";

const now = new Date(2026,9,27,14,0,0);
const closed = new Date(2026,9,22,12,0,0).toISOString();
const deal = (value:number,status:Deal["status"]="ganho"):Deal => ({
  id:"deal-a",agency_id:"company-a",lead_id:"lead-a",title:"Casa Jardins",
  amount_brl:value,status,closed_at:status==="ganho"?closed:null,
} as Deal);
const lead = {id:"lead-a"} as Lead;
describe("edição e exclusão de negociações",()=>{
  it("mantém a data original da venda ao editar somente seu valor",()=>{
    expect(negotiationCloseDate("ganho",closed,now)).toBe(closed);
    expect(negotiationCloseDate("ganho",null,now)).toBe(now.toISOString());
    expect(negotiationCloseDate("negociacao",closed,now)).toBeNull();
  });
  it("recalcula o faturamento após editar o valor de uma venda concluída",()=>{
    const original=crmMetrics([lead],[deal(100000)],[],now);
    const edited=crmMetrics([lead],[deal(120000)],[],now);
    expect(original.revenue).toBe(100000);
    expect(edited.revenue).toBe(120000);
    const chart=revenueByMonth([deal(120000)],now,1);
    expect(chart[0].faturamento).toBe(120000);
  });
  it("ao excluir apenas a negociação, remove seu valor sem excluir o lead",()=>{
    const remainingLeads=[lead];
    const metrics=crmMetrics(remainingLeads,[],[],now);
    expect(metrics.revenue).toBe(0);
    expect(metrics.won).toBe(0);
    expect(metrics.leads).toBe(1);
  });
  it("negociações abertas entram em previsão, não em faturamento",()=>{
    const metrics=crmMetrics([lead],[deal(20000,"proposta")],[],now);
    expect(metrics.revenue).toBe(0);
    expect(metrics.forecast).toBe(20000);
  });
});
