import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Filters } from "@/lib/properties";

const sel = "h-10 rounded-md border border-input bg-card px-3 text-sm";

export function FiltersBar({ value, onApply }: { value: Filters; onApply: (f: Filters) => void }) {
  const [f, setF] = useState<Filters>(value);
  const set = (k: keyof Filters, v: string) =>
    setF((s) => ({ ...s, [k]: v === "" ? undefined : k === "q" || k === "type" || k === "purpose" ? v : Number(v) }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(f);
      }}
      className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 shadow-soft md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]"
    >
      <Input className="col-span-2 h-10 md:col-span-1" placeholder="Cidade ou bairro" value={f.q ?? ""} onChange={(e) => set("q", e.target.value)} />
      <select aria-label="Finalidade" className={sel} value={f.purpose ?? ""} onChange={(e) => set("purpose", e.target.value)}>
        <option value="">Comprar ou alugar</option><option value="venda">Venda</option><option value="locacao">Locação</option>
      </select>
      <select aria-label="Tipo" className={sel} value={f.type ?? ""} onChange={(e) => set("type", e.target.value)}>
        <option value="">Todos os tipos</option><option value="casa">Casa</option><option value="apartamento">Apartamento</option><option value="terreno">Terreno</option>
      </select>
      <select aria-label="Dormitórios" className={sel} value={f.bedrooms ?? ""} onChange={(e) => set("bedrooms", e.target.value)}>
        <option value="">Dormitórios</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
      </select>
      <Input className="h-10" type="number" min={0} placeholder="Preço mín." value={f.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value)} />
      <Input className="h-10" type="number" min={0} placeholder="Preço máx." value={f.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value)} />
      <Button type="submit" className="col-span-2 h-10 md:col-span-1"><Search /> Buscar</Button>
    </form>
  );
}
