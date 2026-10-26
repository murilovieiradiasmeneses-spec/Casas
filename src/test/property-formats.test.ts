import { describe, it, expect } from "vitest";
import { propertySchema } from "@/lib/property-schema";
const base={
  title:"Apartamento Jardim Europa",slug:"apartamento-jardim-europa",description:"",
  property_type:"apartamento",purpose:"venda",status:"disponivel",
  is_off_plan:true,price_display_type:"price",price:"250000",
  income_min:"",income_max:"",bedrooms:"2",suites:"0",bathrooms:"1",parking:"1",
  built_area:"",land_area:"",address:null,show_address:false,cep:"",
  neighborhood:"Jardim Europa",city:"Monte Aprazível",state:"SP",
  latitude:"-20.773",longitude:"-49.71",features:[],featured:false,published:true,whatsapp:"",
};
describe("property formats",()=>{
  it("permite imóvel na planta com preço",()=>{
    const x=propertySchema.parse(base);expect(x.is_off_plan).toBe(true);
    expect(x.price).toBe(250000);expect(x.price_display_type).toBe("price");
  });
  it("permite faixa de renda sem preço de venda",()=>{
    const x=propertySchema.parse({...base,price_display_type:"income_range",price:"0",income_min:"2000",income_max:"4500"});
    expect(x.income_min).toBe(2000);expect(x.income_max).toBe(4500);
  });
  it("rejeita faixa de renda invertida",()=>{
    expect(propertySchema.safeParse({...base,price_display_type:"income_range",price:"0",income_min:"5000",income_max:"2000"}).success).toBe(false);
  });
  it("permite valor sob consulta sem preço",()=>{
    expect(propertySchema.safeParse({...base,price_display_type:"consultation",price:"0"}).success).toBe(true);
  });
  it("rejeita preço zero em anúncio de preço definido",()=>{
    expect(propertySchema.safeParse({...base,price:"0"}).success).toBe(false);
  });
});
