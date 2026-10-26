import type { Deal, Lead, Visit } from "@/lib/crm";

export type CRMAlertKind = "birthday" | "followup" | "negotiation" | "visit";
export type CRMAlertUrgency = "overdue" | "today" | "upcoming";

export interface CRMAlert {
  id: string;
  kind: CRMAlertKind;
  urgency: CRMAlertUrgency;
  title: string;
  description: string;
  daysUntil: number;
  dueLabel: string;
  leadId?: string;
  entityId: string;
  target: "leads" | "negociacoes" | "visitas";
}

const MS_PER_DAY = 86400000;
const dayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;

function dayDifference(date: Date, now: Date) {
  return dayNumber(date) - dayNumber(now);
}
function calendarDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
  return candidate;
}
function dueMessage(days: number) {
  if (days < -1) return `Atrasado há ${Math.abs(days)} dias`;
  if (days === -1) return "Atrasado desde ontem";
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Em ${days} dias`;
}
function urgency(days: number): CRMAlertUrgency {
  return days < 0 ? "overdue" : days === 0 ? "today" : "upcoming";
}
function nextBirthday(date: string, now: Date): Date | null {
  const birth = calendarDate(date);
  if (!birth) return null;
  function inYear(year: number): Date {
    // 29 de fevereiro: antecipar para 28/02 nos anos não bissextos.
    const day = birth!.getMonth() === 1 && birth!.getDate() === 29 &&
      new Date(year, 1, 29).getMonth() !== 1 ? 28 : birth!.getDate();
    return new Date(year, birth!.getMonth(), day);
  }
  let upcoming = inYear(now.getFullYear());
  if (dayDifference(upcoming, now) < 0) upcoming = inYear(now.getFullYear() + 1);
  return upcoming;
}

export function getCRMAlerts(
  { leads, visits, deals }: { leads: Lead[]; visits: Visit[]; deals: Deal[] },
  now: Date = new Date(),
  daysAhead = 7,
): CRMAlert[] {
  const alerts: CRMAlert[] = [];
  const leadNames = new Map(leads.map(l => [l.id, l.name]));

  for (const lead of leads) {
    if (lead.stage !== "ganho" && lead.stage !== "perdido" && lead.next_contact_at) {
      const when = new Date(lead.next_contact_at);
      if (!Number.isNaN(when.getTime())) {
        const days = dayDifference(when, now);
        if (days <= daysAhead) {
          alerts.push({
            id: `followup:${lead.id}`, entityId: lead.id, leadId: lead.id,
            kind: "followup", urgency: urgency(days), target: "leads",
            title: `Retornar contato: ${lead.name}`,
            description: `Próximo contato agendado para ${when.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`,
            daysUntil: days, dueLabel: dueMessage(days),
          });
        }
      }
    }
    if (lead.birth_date && lead.stage !== "perdido") {
      const when = nextBirthday(lead.birth_date, now);
      if (when) {
        const days = dayDifference(when, now);
        if (days >= 0 && days <= daysAhead) {
          alerts.push({
            id: `birthday:${lead.id}:${when.getFullYear()}`,
            entityId: lead.id, leadId: lead.id,
            kind: "birthday", urgency: urgency(days), target: "leads",
            title: `Aniversário de ${lead.name}`,
            description: days === 0 ? "O cliente faz aniversário hoje. Que tal enviar uma mensagem?" :
              `Aniversário em ${when.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}.`,
            daysUntil: days, dueLabel: dueMessage(days),
          });
        }
      }
    }
  }

  for (const deal of deals) {
    if (!deal.expected_close_date || deal.status === "ganho" || deal.status === "perdido") continue;
    const when = calendarDate(deal.expected_close_date);
    if (!when) continue;
    const days = dayDifference(when, now);
    if (days <= daysAhead) {
      alerts.push({
        id: `deal:${deal.id}`, entityId: deal.id, leadId: deal.lead_id,
        kind: "negotiation", urgency: urgency(days), target: "negociacoes",
        title: `Negociação: ${deal.title}`,
        description: `Previsão de fechamento de ${leadNames.get(deal.lead_id) ?? "cliente"}: ${when.toLocaleDateString("pt-BR")}.`,
        daysUntil: days, dueLabel: dueMessage(days),
      });
    }
  }

  for (const visit of visits) {
    if (visit.status !== "agendada") continue;
    const when = new Date(visit.scheduled_at);
    if (Number.isNaN(when.getTime())) continue;
    const days = dayDifference(when, now);
    if (days <= daysAhead) {
      alerts.push({
        id: `visit:${visit.id}`, entityId: visit.id, leadId: visit.lead_id,
        kind: "visit", urgency: urgency(days), target: "visitas",
        title: `Visita com ${leadNames.get(visit.lead_id) ?? "cliente"}`,
        description: `Agendada para ${when.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`,
        daysUntil: days, dueLabel: dueMessage(days),
      });
    }
  }

  // Atrasos primeiro, depois vencimentos do dia e próximos 7 dias.
  // Aniversários de hoje recebem destaque dentro das pendências de hoje.
  const priority = (alert: CRMAlert) =>
    alert.urgency === "overdue" ? 0 : alert.urgency === "today" ? 1 : 2;
  return alerts.sort((a, b) => {
    const difference = priority(a) - priority(b);
    if (difference !== 0) return difference;
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    if (a.kind === "birthday" && b.kind !== "birthday") return -1;
    if (b.kind === "birthday" && a.kind !== "birthday") return 1;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}
