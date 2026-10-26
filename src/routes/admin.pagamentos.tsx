import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, MessageCircle, Wallet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import type { Tables } from "@/integrations/supabase/types";
import { billingWhatsAppUrl, BILLING_FREQUENCY_LABEL, PAYMENT_STATUS_LABEL, moneyBRL, type BillingFrequency, type PaymentStatus } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/pagamentos")({
  component: ManualBillingPage,
  head: () => ({ meta: [{ title: "Controle comercial — CASAS" }, { name: "robots", content: "noindex" }] }),
});

type Billing = Tables<"agency_billing">;
type AgencySummary = { id: string; name: string; slug: string; active: boolean };

function ManualBillingPage() {
  const { isPlatformAdmin } = useAdminAgency();
  const [selected, setSelected] = useState("");
  const q = useQuery({
    queryKey: ["admin-manual-billing"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const [agencies, billing] = await Promise.all([
        supabase.from("agencies").select("id,name,slug,active").order("name"),
        supabase.from("agency_billing").select("*"),
      ]);
      if (agencies.error) throw agencies.error;
      if (billing.error) throw billing.error;
      return { agencies: agencies.data as AgencySummary[], billing: billing.data as Billing[] };
    },
  });

  if (!isPlatformAdmin) return <div className="rounded-xl border bg-card p-8">Controle comercial exclusivo do administrador geral.</div>;
  if (q.isLoading) return <div className="py-12">Carregando controle comercial...</div>;
  if (q.isError) return (
    <div className="rounded-xl border bg-card p-8">
      <h1 className="text-3xl">Não foi possível carregar os pagamentos</h1>
      <p className="mt-2 text-sm text-muted-foreground">Confirme se a migração 0004_manual_whatsapp_billing.sql foi aplicada ao banco.</p>
      <Button className="mt-4" variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button>
    </div>
  );
  if (!q.data) return null;
  const agencyId = q.data.agencies.find((agency) => agency.id === selected)?.id ?? q.data.agencies[0]?.id;
  const agency = q.data.agencies.find((item) => item.id === agencyId);
  const payment = q.data.billing.find((item) => item.agency_id === agencyId);
  const totals = {
    registered: q.data.agencies.length,
    paid: q.data.billing.filter((b) => b.payment_status === "pago").length,
    pending: q.data.billing.filter((b) => b.payment_status === "pendente").length,
    overdue: q.data.billing.filter((b) => b.payment_status === "atrasado").length,
  };
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Administração geral</p>
        <h1 className="mt-2 text-4xl">Pagamentos via WhatsApp</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">Você negocia e recebe diretamente do cliente pelo WhatsApp. Aqui registra os valores e a situação de cada acordo manualmente. O CASAS não processa, solicita nem confirma pagamentos sozinho.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Clientes", totals.registered],
          ["Pagamento registrado", totals.paid],
          ["Pendentes", totals.pending],
          ["Atrasados", totals.overdue],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Sem cobrança dentro do site</p>
            <p className="text-sm text-muted-foreground">A situação financeira não suspende clientes automaticamente. Você decide quando ativar ou suspender o acesso em “Meus clientes”.</p>
          </div>
        </div>
      </div>
      {agency ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="billing-company">Selecione a imobiliária ou construtora</Label>
            <select id="billing-company" className="h-11 w-full max-w-lg rounded-md border bg-background px-3 text-sm" value={agency.id} onChange={(e) => setSelected(e.target.value)}>
              {q.data.agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <BillingEditor key={agency.id} agency={agency} billing={payment} />
        </>
      ) : (
        <p className="rounded-xl border bg-card p-8">Cadastre o primeiro cliente em “Meus clientes” para começar o controle.</p>
      )}
      <div className="space-y-3">
        <h2 className="text-2xl">Resumo de todos os clientes</h2>
        <div className="divide-y rounded-xl border bg-card">
          {q.data.agencies.map((a) => {
            const b = q.data!.billing.find((item) => item.agency_id === a.id);
            return (
              <button key={a.id} type="button" onClick={() => setSelected(a.id)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-muted/50">
                <span className="min-w-0 flex-1"><span className="block font-medium">{a.name}</span><span className="text-xs text-muted-foreground">{a.active ? "Acesso ativo" : "Acesso suspenso"}</span></span>
                <span className="text-sm">{b ? moneyBRL(Number(b.amount_brl)) : "Sem valor cadastrado"}</span>
                <span className="rounded-full border px-3 py-1 text-xs">{PAYMENT_STATUS_LABEL[(b?.payment_status ?? "nao_definido") as PaymentStatus]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BillingEditor({ agency, billing }: { agency: AgencySummary; billing?: Billing }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(billing ? String(billing.amount_brl) : "");
  const [frequency, setFrequency] = useState<BillingFrequency>((billing?.billing_frequency ?? "mensal") as BillingFrequency);
  const [nextDue, setNextDue] = useState(billing?.next_due_date ?? "");
  const [lastPaid, setLastPaid] = useState(billing?.last_paid_date ?? "");
  const [status, setStatus] = useState<PaymentStatus>((billing?.payment_status ?? "nao_definido") as PaymentStatus);
  const [phone, setPhone] = useState(billing?.billing_whatsapp ?? "");
  const [notes, setNotes] = useState(billing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const chat = billingWhatsAppUrl(phone, agency.name, nextDue);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(amount);
    if (amount.trim() && (!Number.isFinite(price) || price < 0)) {
      toast.error("Informe um valor válido em reais.");
      return;
    }
    if (phone && !chat) {
      toast.error("Use um telefone com DDD e, preferencialmente, código do país 55.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("agency_billing").upsert({
      agency_id: agency.id,
      amount_brl: amount ? price : 0,
      billing_frequency: frequency,
      next_due_date: nextDue || null,
      last_paid_date: lastPaid || null,
      payment_status: status,
      billing_whatsapp: phone || null,
      notes,
    }, { onConflict: "agency_id" });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o controle comercial.");
      return;
    }
    toast.success("Registro atualizado manualmente. Nenhuma cobrança foi enviada.");
    void qc.invalidateQueries({ queryKey: ["admin-manual-billing"] });
  }

  return (
    <form onSubmit={save} className="grid gap-7 lg:grid-cols-[1fr_330px]">
      <div className="space-y-5 rounded-xl border bg-card p-6">
        <h2 className="text-2xl">Condições combinadas — {agency.name}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fee">Valor combinado (R$)</Label>
            <Input id="fee" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 199.90" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frequency">Periodicidade negociada</Label>
            <select id="frequency" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={frequency} onChange={(e) => setFrequency(e.target.value as BillingFrequency)}>
              {Object.entries(BILLING_FREQUENCY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Próximo vencimento</Label>
            <Input id="due" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastpaid">Último pagamento confirmado por você</Label>
            <Input id="lastpaid" type="date" value={lastPaid} onChange={(e) => setLastPaid(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Situação manual</Label>
            <select id="status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">WhatsApp de cobrança do cliente</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="55 17 99999-9999" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Anotações internas da negociação</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Forma de pagamento combinada, valor promocional, observações..." rows={4} maxLength={4000} />
          <p className="text-xs text-muted-foreground">Visíveis somente ao administrador geral. Evite salvar dados de cartão ou comprovantes bancários sensíveis.</p>
        </div>
        <Button type="submit" size="lg" disabled={saving}>{saving ? "Salvando..." : "Salvar controle manual"}</Button>
      </div>
      <aside className="space-y-5 lg:self-start">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /><h3 className="text-xl font-semibold">Conversar no WhatsApp</h3></div>
          <p className="mt-3 text-sm text-muted-foreground">O botão abre uma conversa com uma mensagem sugerida. Você negocia, combina o pagamento e envia a mensagem pessoalmente.</p>
          {chat ? (
            <Button className="mt-5 w-full" asChild>
              <a href={chat} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Abrir WhatsApp</a>
            </Button>
          ) : <p className="mt-4 rounded-lg bg-muted p-3 text-xs">Informe o WhatsApp do cliente para abrir a conversa.</p>}
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Controle sob sua responsabilidade</h3></div>
          <p className="mt-2 text-sm text-muted-foreground">Mude a situação para “Pagamento registrado” somente após confirmar o recebimento por fora da plataforma. O sistema não valida transferências.</p>
          <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" /> O vencimento é apenas informativo; não é uma cobrança automática.</p>
        </div>
      </aside>
    </form>
  );
}
