import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/convite")({
  ssr: false,
  head: () => ({ meta: [{title:"Acesso de corretores — CASAS"},{name:"robots",content:"noindex,nofollow"}] }),
  component: RetiredInvite,
});
function RetiredInvite(){
  return <main className="mx-auto max-w-xl px-4 py-20">
    <div className="rounded-[24px] border bg-card p-8 text-center shadow-sm">
      <KeyRound className="mx-auto h-10 w-10 text-primary"/>
      <h1 className="mt-5 text-3xl">O acesso aos corretores mudou</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Convites antigos foram descontinuados. Agora o proprietário autoriza seu e-mail
        diretamente no CRM e compartilha o link fixo de acesso da imobiliária.
        Peça ao responsável o novo link para criar ou acessar sua conta.
      </p>
      <Button className="mt-6" asChild><Link to="/entrar">Já possuo acesso ao CASAS</Link></Button>
    </div>
  </main>;
}
