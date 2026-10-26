import { createFileRoute } from "@tanstack/react-router";
import { PropertyForm } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/admin/novo")({ component: NewProperty });

function NewProperty() {
  return (
    <div>
      <h1 className="text-4xl">Novo imóvel</h1>
      <p className="mt-1 text-sm text-muted-foreground">Após salvar, você poderá enviar as fotos.</p>
      <div className="mt-6"><PropertyForm /></div>
    </div>
  );
}
