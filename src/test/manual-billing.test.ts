import { describe, expect, it } from "vitest";
import { billingWhatsAppUrl, PAYMENT_STATUS_LABEL } from "@/lib/billing";

describe("Fluxo comercial manual", () => {
  it("abre somente uma conversa, sem processar cobrança", () => {
    const url = billingWhatsAppUrl("+55 (17) 99999-9999", "Construtora Exemplo", "2026-11-10");
    expect(url).toContain("https://wa.me/5517999999999?text=");
    expect(decodeURIComponent(url!)).toContain("vencimento em 10/11/2026");
    expect(url).not.toContain("pix");
    expect(url).not.toContain("checkout");
  });
  it("não gera link quando o telefone não é válido", () => {
    expect(billingWhatsAppUrl("999", "Empresa")).toBeNull();
  });
  it("mantém status de pagamento como lançamento manual", () => {
    expect(PAYMENT_STATUS_LABEL.pago).toBe("Pagamento registrado");
  });
});
