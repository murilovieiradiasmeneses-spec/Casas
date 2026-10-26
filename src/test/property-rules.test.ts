import { describe, expect, it } from "vitest";
import { propertySchema } from "@/lib/property-schema";
import { whatsappLink } from "@/lib/properties";

const base = {
  title: "Casa Jardim Europa", slug: "casa-jardim-europa", description: "", property_type: "casa", purpose: "venda",
  status: "disponivel", price: 1500000, bedrooms: 3, suites: 1, bathrooms: 2, parking: 2, built_area: "", land_area: "",
  address: null, show_address: false, cep: "", neighborhood: "Jardim Europa", city: "São Paulo", state: "sp",
  latitude: "", longitude: "", features: [], featured: false, published: false, whatsapp: "",
};

describe("property rules", () => {
  it("rejects publishing without a map pin", () => {
    expect(propertySchema.safeParse({ ...base, published: true }).success).toBe(false);
  });
  it("rejects more suites than bedrooms", () => {
    expect(propertySchema.safeParse({ ...base, suites: 4 }).success).toBe(false);
  });
  it("whatsapp message names the listing", () => {
    const url = whatsappLink("+55 (11) 99999-0000", base, "https://casas.app");
    expect(url.startsWith("https://wa.me/5511999990000?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain('"Casa Jardim Europa" em Jardim Europa, São Paulo');
  });
});
