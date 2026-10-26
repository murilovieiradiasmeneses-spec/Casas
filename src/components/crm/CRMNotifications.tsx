import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, BellRing, Cake, CalendarClock, CalendarDays, CheckCircle2, Handshake, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CRMAlert } from "@/lib/crm-notifications";
import { crmPhone, type Lead } from "@/lib/crm";

type Props = {
  agencyName: string;
  alerts: CRMAlert[];
  leads: Lead[];
  onOpen: (alert: CRMAlert) => void;
};

const icons = { birthday: Cake, followup: CalendarClock, negotiation: Handshake, visit: CalendarDays };
const labels = { birthday: "Aniversário", followup: "Retorno de contato", negotiation: "Negociação", visit: "Visita" };
const colors = {
  overdue: "bg-red-50 text-red-700 border-red-200",
  today: "bg-amber-50 text-amber-800 border-amber-200",
  upcoming: "bg-muted text-foreground border-border",
};

export function CRMNotifications({ agencyName, alerts, leads, onOpen }: Props) {
  // Abertura uma vez por entrada no CRM. Sem notificações: não interromper o usuário.
  const [opened, setOpened] = useState(alerts.length > 0);
  const urgentCount = alerts.filter(n => n.urgency === "today" || n.urgency === "overdue").length;

  useEffect(() => {
    if (!opened) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpened(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opened]);

  const openRecord = (item: CRMAlert) => {
    setOpened(false);
    onOpen(item);
  };

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className={"rounded-xl p-3 "+(alerts.length?"bg-amber-50 text-amber-800":"bg-secondary text-primary")}>
          {alerts.length?<BellRing className="h-5 w-5"/>:<CheckCircle2 className="h-5 w-5"/>}
        </div>
        <div>
          <h3 className="text-base font-semibold">{alerts.length ? alerts.length + " lembrete" + (alerts.length===1?"":"s") + " na agenda" : "Tudo em dia por aqui"}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {alerts.length ? urgentCount + " para hoje ou em atraso · próximos 7 dias" : "Nenhum aniversário ou compromisso próximo cadastrado."}
          </p>
        </div>
      </div>
      <Button variant={alerts.length?"default":"outline"} size="sm" onClick={()=>setOpened(true)} className="gap-2">
        <BellRing className="h-4 w-4"/>
        {alerts.length?"Ver notificações":"Ver agenda"}
        {alerts.length>0&&<span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{alerts.length}</span>}
      </Button>
    </div>

    {opened&&<div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-6"
      role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpened(false);}}>
      <section role="dialog" aria-modal="true" aria-label="Notificações e pendências do CRM"
        className="flex max-h-[min(88vh,800px)] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b bg-card px-5 py-5 sm:px-7">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">CASAS · Lembretes inteligentes</span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Sua agenda comercial</h2>
            <p className="mt-2 text-sm text-muted-foreground">{agencyName} · {alerts.length} {alerts.length===1?"pendência":"pendências"} identificadas</p>
          </div>
          <button type="button" className="rounded-xl border bg-background p-2.5 hover:bg-muted" onClick={()=>setOpened(false)} aria-label="Fechar notificações"><X className="h-5 w-5"/></button>
        </header>

        <div className="space-y-3 overflow-y-auto px-5 py-5 sm:px-7">
          {!alerts.length&&<div className="py-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary"/>
            <p className="font-semibold">Nenhuma pendência para os próximos 7 dias</p>
            <p className="mt-2 text-sm text-muted-foreground">Você está com os compromissos em dia.</p>
          </div>}
          {alerts.map(item=>{
            const Icon = icons[item.kind];
            const related = item.leadId?leads.find(l=>l.id===item.leadId):undefined;
            const phone = item.kind==="birthday"?crmPhone(related?.phone):null;
            return <article key={item.id} className="rounded-[18px] border border-border/80 bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-secondary p-2.5 text-primary"><Icon className="h-5 w-5"/></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{labels[item.kind]}</span>
                    <span className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold "+colors[item.urgency]}>
                      {item.urgency==="overdue"&&<AlertCircle className="h-3 w-3"/>}
                      {item.dueLabel}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={()=>openRecord(item)} className="gap-1.5">
                      Abrir {item.kind==="birthday"||item.kind==="followup"?"cliente":item.kind==="negotiation"?"negociações":"visitas"}
                      <ArrowUpRight className="h-3.5 w-3.5"/>
                    </Button>
                    {phone&&<Button size="sm" variant="outline" asChild>
                      <a href={"https://wa.me/"+phone+"?text="+encodeURIComponent("Feliz aniversário, "+(related?.name??"")+"! Desejamos um excelente dia! 🎉")}
                        target="_blank" rel="noopener noreferrer" className="gap-1.5">
                        <MessageCircle className="h-4 w-4"/> Parabenizar no WhatsApp
                      </a>
                    </Button>}
                  </div>
                </div>
              </div>
            </article>;
          })}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t bg-card px-5 py-4 sm:px-7">
          <p className="text-xs text-muted-foreground">Os avisos são atualizados a partir da sua carteira no CRM.</p>
          <Button variant="outline" size="sm" onClick={()=>setOpened(false)}>Fechar</Button>
        </footer>
      </section>
    </div>}
  </>;
}
