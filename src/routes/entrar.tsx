import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — CASAS" },
      { name: "description", content: "Acesso ao painel de administração da CASAS." },
      { property: "og:title", content: "Entrar — CASAS" },
      { property: "og:description", content: "Acesso restrito ao painel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` });
      setLoading(false);
      if (error) return toast.error("Não foi possível enviar o email.");
      toast.success("Se o email existir, enviamos um link de redefinição.");
      return setMode("login");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Email ou senha inválidos.");
    navigate({ to: "/painel" });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20">
      <h1 className="text-4xl">{mode === "login" ? "Entrar" : "Redefinir senha"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Acesso restrito à equipe administradora.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {mode === "login" && <div className="space-y-1.5"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Enviar link"}</Button>
        <button type="button" className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "login" ? "reset" : "login")}>
          {mode === "login" ? "Esqueci minha senha" : "Voltar ao login"}
        </button>
      </form>
    </div>
  );
}
