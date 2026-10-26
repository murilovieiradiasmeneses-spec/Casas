import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — CASAS" },
      { name: "description", content: "Defina uma nova senha de acesso." },
      { property: "og:title", content: "Redefinir senha — CASAS" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Use ao menos 8 caracteres.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error("Link inválido ou expirado.");
    toast.success("Senha atualizada.");
    navigate({ to: "/admin" });
  }
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-4xl">Nova senha</h1>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border bg-card p-6">
        <Input type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </div>
  );
}
