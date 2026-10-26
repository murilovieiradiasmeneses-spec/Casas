/**
 * Faturamento somente administrativo: nenhum pagamento é iniciado/confirmado aqui.
 * O administrador marca a situação após conversar e conferir o recebimento pelo WhatsApp.
 */
export type PaymentStatus = "nao_definido" | "pendente" | "pago" | "atrasado";
export type BillingFrequency = "mensal" | "trimestral" | "anual" | "unico";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  nao_definido: "Não definido",
  pendente: "Pendente",
  pago: "Pagamento registrado",
  atrasado: "Atrasado",
};

export const BILLING_FREQUENCY_LABEL: Record<BillingFrequency, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
  unico: "Pagamento único",
};

export function billingWhatsAppUrl(phone: string, company: string, date?: string | null) {
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 10 || normalized.length > 15) return null;
  const readableDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.split("-").reverse().join("/")
    : null;
  const message = readableDate
    ? `Olá! Tudo bem? Gostaria de conversar sobre o acesso da ${company} à plataforma CASAS, com vencimento em ${readableDate}.`
    : `Olá! Tudo bem? Gostaria de conversar sobre o acesso da ${company} à plataforma CASAS.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function moneyBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
