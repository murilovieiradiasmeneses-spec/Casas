import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Filters } from "@/lib/properties";

const sel = "h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/10";

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
      className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-3 shadow-float sm:p-4 xl:grid-cols-[minmax(150px,2fr)_repeat(5,minmax(0,1fr))_auto]"
    >
      <Input className="col-span-2 h-11 xl:col-span-1" placeholder="Cidade ou bairro" value={f.q ?? ""} onChange={(e) => set("q", e.target.value)} />
      <select aria-label="Finalidade" className={sel} value={f.purpose ?? ""} onChange={(e) => set("purpose", e.target.value)}>
        <option value="">Comprar ou alugar</option><option value="venda">Venda</option><option value="locacao">Locação</option>
      </select>
      <select aria-label="Tipo" className={sel} value={f.type ?? ""} onChange={(e) => set("type", e.target.value)}>
        <option value="">Todos os tipos</option><option value="casa">Casa</option><option value="apartamento">Apartamento</option><option value="terreno">Terreno</option>
      </select>
      <select aria-label="Dormitórios" className={sel} value={f.bedrooms ?? ""} onChange={(e) => set("bedrooms", e.target.value)}>
        <option value="">Dormitórios</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
      </select>
      <Input className="h-11 min-w-0" type="number" min={0} placeholder="Preço mín." value={f.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value)} />
      <Input className="h-11 min-w-0" type="number" min={0} placeholder="Preço máx." value={f.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value)} />
      <Button type="submit" className="col-span-2 h-11 xl:col-span-1"><Search /> Buscar</Button>
    </form>
  );
}
