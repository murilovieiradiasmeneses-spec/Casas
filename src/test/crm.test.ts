import { describe,it,expect } from "vitest";
import { crmMetrics,revenueByMonth,crmPhone } from "@/lib/crm";
import type { Deal,Lead,Visit } from "@/lib/crm";
describe("CASAS CRM reports",()=>{
  it("soma somente negócios marcados como ganhos",()=>{
    const deals=[
      {status:"ganho",amount_brl:250000,closed_at:"2026-10-12T12:00:00Z"},
      {status:"proposta",amount_brl:150000,closed_at:null},
    ] as Deal[];
    const metrics=crmMetrics([{}] as Lead[],deals,[] as Visit[],new Date("2026-10-26T12:00:00Z"));
    expect(metrics.revenue).toBe(250000);
    expect(metrics.revenueMonth).toBe(250000);
    expect(metrics.forecast).toBe(150000);
    expect(revenueByMonth(deals,new Date("2026-10-26T12:00:00Z"))[5].faturamento).toBe(250000);
  });
  it("normaliza telefone para WhatsApp",()=>{expect(crmPhone("(17) 99999-9999")).toBe("5517999999999");});
});
