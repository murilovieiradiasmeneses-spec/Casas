import { describe, expect, it } from "vitest";
import { getCRMAlerts } from "@/lib/crm-notifications";
import type { Deal, Lead, Visit } from "@/lib/crm";

const today = new Date(2026, 9, 26, 11, 0, 0);
const lead = (data: Partial<Lead>) => ({
  id: "lead-1", name: "Maria", stage: "novo",
  next_contact_at: null, birth_date: null, ...data,
} as Lead);
const deal = (data: Partial<Deal>) => ({
  id: "deal-1", lead_id: "lead-1", title: "Casa Centro", status: "proposta",
  expected_close_date: null, ...data,
} as Deal);
const visit = (data: Partial<Visit>) => ({
  id: "visit-1", lead_id: "lead-1", status: "agendada",
  scheduled_at: "2026-10-27T16:00:00", ...data,
} as Visit);
const get = (leads: Lead[] = [], deals: Deal[] = [], visits: Visit[] = [], date = today) =>
  getCRMAlerts({ leads, visits, deals }, date);

describe("CRM notifications", () => {
  it("informa novos leads recebidos somente ao corretor responsável", () => {
    const assigned=lead({assigned_agent_id:"agent-1"});
    const dataset={leads:[assigned],visits:[],deals:[]};
    expect(getCRMAlerts(dataset,today,7,false)).toHaveLength(0);
    const alerts=getCRMAlerts(dataset,today,7,true);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("received");
    expect(getCRMAlerts({leads:[lead({assigned_agent_id:null})],visits:[],deals:[]},today,7,true)).toHaveLength(0);
    expect(getCRMAlerts({leads:[lead({stage:"contato",assigned_agent_id:"agent-1"})],visits:[],deals:[]},today,7,true)).toHaveLength(0);
  });

  it("avisa do aniversário de hoje sem depender do ano do nascimento", () => {
    const notifications = get([lead({ birth_date: "1993-10-26" })]);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].kind).toBe("birthday");
    expect(notifications[0].dueLabel).toBe("Hoje");
  });
  it("avisa do aniversário da próxima semana e ignora o posterior", () => {
    expect(get([lead({ birth_date: "1993-10-30" })])).toHaveLength(1);
    expect(get([lead({ birth_date: "1993-11-04" })])).toHaveLength(0);
  });
  it("avisa de uma negociação atrasada, mas não das concluídas", () => {
    const expired = deal({ expected_close_date: "2026-10-24" });
    expect(get([], [expired])[0].urgency).toBe("overdue");
    expect(get([], [deal({ ...expired, status: "ganho" })])).toHaveLength(0);
  });
  it("exibe follow-up agendado e visita próxima, sem visitas canceladas", () => {
    const results = get(
      [lead({ next_contact_at: "2026-10-26T15:00:00" })],
      [],
      [visit({}), visit({ id: "visit-2", status: "cancelada" })],
    );
    expect(results.map(item => item.kind)).toEqual(["followup", "visit"]);
  });
  it("não vaza pendências de outra carteira quando não há registros visíveis", () => {
    expect(get()).toEqual([]);
  });
  it("mostra aniversário de 29/02 como 28/02 nos anos comuns", () => {
    const birthday = get([lead({ birth_date: "2000-02-29" })], [], [], new Date(2027, 1, 28));
    expect(birthday[0].dueLabel).toBe("Hoje");
  });
  it("não mostra pendências além dos próximos sete dias", () => {
    expect(get([lead({ next_contact_at: "2026-11-10T14:00:00" })], [deal({ expected_close_date: "2026-11-05" })], [visit({ scheduled_at: "2026-11-06T10:00:00" })])).toHaveLength(0);
  });
  it("ignora o follow-up de lead perdido, mas mantém aniversários de clientes ganhos", () => {
    expect(get([lead({ stage: "perdido", birth_date: "1980-10-26", next_contact_at: "2026-10-26T12:00:00" })])).toHaveLength(0);
    expect(get([lead({ stage: "ganho", birth_date: "1980-10-26" })])).toHaveLength(1);
  });
});
