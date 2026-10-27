import { describe, expect, it } from "vitest";
import { leadDeletionImpact } from "@/lib/crm";
import type { Deal, Visit } from "@/lib/crm";

const visit=(id:string,leadId:string)=>({id,lead_id:leadId} as Visit);
const deal=(id:string,leadId:string,status:string,amount:number)=>({
  id,lead_id:leadId,status,amount_brl:amount,
} as Deal);

describe("Impacto de excluir leads do CRM",()=>{
  it("conta somente registros vinculados ao lead escolhido",()=>{
    const result=leadDeletionImpact("lead-a",
      [visit("visit-a","lead-a"),visit("visit-b","lead-b")],
      [deal("deal-a","lead-a","negociacao",1000),deal("deal-b","lead-b","ganho",22000)]);
    expect(result).toEqual({visits:1,deals:1,completedSales:0,totalSoldBrl:0});
  });
  it("identifica vendas concluídas que sairão dos gráficos",()=>{
    const result=leadDeletionImpact("lead-a",
      [visit("visit-a","lead-a")],
      [deal("deal-a","lead-a","ganho",250000),deal("deal-b","lead-a","proposta",30000)]);
    expect(result).toEqual({visits:1,deals:2,completedSales:1,totalSoldBrl:250000});
  });
  it("trata lead sem histórico sem afetar outras empresas",()=>{
    const result=leadDeletionImpact("lead-a",
      [visit("a","lead-other")],[deal("a","lead-other","ganho",100)]);
    expect(result).toEqual({visits:0,deals:0,completedSales:0,totalSoldBrl:0});
  });
});
