import { z } from "zod";

const int = z.coerce.number({ invalid_type_error: "Número inválido" }).int("Use número inteiro").min(0, "Não pode ser negativo");
const optNum = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().positive("Deve ser maior que zero").nullable());

export const propertySchema = z
  .object({
    title: z.string().trim().min(5, "Mínimo de 5 caracteres").max(120),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
    description: z.string().max(5000).default(""),
    property_type: z.enum(["casa", "apartamento", "terreno"]),
    purpose: z.enum(["venda", "locacao"]),
    status: z.enum(["disponivel", "reservado", "vendido", "alugado"]),
    is_off_plan: z.boolean(),
    price_display_type: z.enum(["price","income_range","consultation"]),
    price: z.coerce.number({ invalid_type_error: "Informe o preço" }).min(0,"Preço inválido"),
    income_min: z.preprocess(v=>v===""||v==null?null:v,z.coerce.number().positive().nullable()),
    income_max: z.preprocess(v=>v===""||v==null?null:v,z.coerce.number().positive().nullable()),
    bedrooms: int,
    suites: int,
    bathrooms: int,
    parking: int,
    built_area: optNum,
    land_area: optNum,
    address: z.string().trim().max(200).nullable(),
    show_address: z.boolean(),
    cep: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido").nullable()),
    neighborhood: z.string().trim().min(2, "Informe o bairro"),
    city: z.string().trim().min(2, "Informe a cidade"),
    state: z.string().trim().toUpperCase().length(2, "UF com 2 letras"),
    latitude: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(-90).max(90).nullable()),
    longitude: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(-180).max(180).nullable()),
    features: z.array(z.string().trim().min(1)).max(40),
    featured: z.boolean(),
    published: z.boolean(),
    whatsapp: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\+?\d[\d\s()-]{9,}$/, "WhatsApp inválido").nullable()),
  })
  .refine((d) =>
  d.price_display_type === "price" ? d.price > 0 && d.income_min===null && d.income_max===null :
  d.price_display_type === "consultation" ? d.price===0 && d.income_min===null && d.income_max===null :
  d.price===0 && d.income_min!==null && d.income_max!==null && d.income_max >= d.income_min,
  {path:["price_display_type"],message:"Defina o preço, a faixa de renda ou selecione Sob consulta"})
  .refine((d) => d.suites <= d.bedrooms, { path: ["suites"], message: "Suítes não podem exceder quartos" })
  .refine((d) => !d.published || (d.latitude != null && d.longitude != null), {
    path: ["latitude"],
    message: "Defina o pin no mapa antes de publicar",
  });

export type PropertyInput = z.infer<typeof propertySchema>;
