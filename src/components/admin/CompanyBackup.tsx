import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Download, FileArchive, HardDriveDownload, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { downloadCompanyBackup, type BackupCadence } from "@/lib/backup";
import { Button } from "@/components/ui/button";

const choices:{id:BackupCadence;title:string;desc:string}[]=[
  {id:"diario",title:"Diário",desc:"Salvar uma cópia a cada dia"},
  {id:"semanal",title:"Semanal",desc:"Salvar uma cópia a cada semana"},
  {id:"mensal",title:"Mensal",desc:"Salvar uma cópia a cada mês"},
];
export function CompanyBackup() {
  const {activeAgencyId,agencies,isPlatformAdmin}=useAdminAgency();
  const agency=agencies.find(a=>a.id===activeAgencyId);
  const [cadence,setCadence]=useState<BackupCadence>("semanal");
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState("");
  const [lastFile,setLastFile]=useState("");
  const check=useQuery({
    queryKey:["backup-access",activeAgencyId],enabled:!!activeAgencyId,
    queryFn:async()=>{
      const [owner,role]=await Promise.all([
        supabase.rpc("crm_is_owner",{_agency:activeAgencyId}),
        supabase.auth.getUser(),
      ]);
      if(owner.error)throw owner.error;
      if(role.error||!role.data.user)throw Error("Sessão inválida");
      return !!owner.data;
    },
  });
  async function generate() {
    setBusy(true);setProgress("");setLastFile("");
    try{
      const result=await downloadCompanyBackup(activeAgencyId,cadence,{
        onProgress:setProgress,
        isMaster:isPlatformAdmin,
      });
      setLastFile(result.filename);
      toast.success("Arquivo de backup preparado para download.");
    }catch(e){toast.error((e as Error).message||"Não foi possível criar o backup.");}
    finally{setBusy(false);setProgress("");}
  }
  if(check.isLoading)return <p className="py-10 text-sm text-muted-foreground">Verificando autorização de backup...</p>;
  if(check.isError||!check.data)return <div className="rounded-2xl border bg-card p-7">
    <LockKeyhole className="mb-3 h-7 w-7 text-muted-foreground"/>
    <h2 className="text-xl">Backup restrito ao proprietário</h2>
    <p className="mt-2 text-sm text-muted-foreground">Somente o dono da imobiliária e o administrador master podem baixar dados de clientes e corretores.</p>
  </div>;
  return <div className="space-y-6">
    <div className="rounded-[26px] border bg-card p-6 shadow-sm sm:p-9">
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><HardDriveDownload className="h-4 w-4"/> Proteção dos seus dados</span>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Backup da imobiliária</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Baixe uma cópia de {agency?.name??"sua empresa"} com imóveis, fotos, identidade visual, leads, visitas, vendas e dados da equipe.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {choices.map(item=><button key={item.id} type="button" onClick={()=>setCadence(item.id)} disabled={busy}
          className={"rounded-2xl border p-4 text-left transition-all "+(cadence===item.id?"border-primary bg-secondary/45 ring-1 ring-primary":"bg-background hover:border-primary/40")}>
          <CalendarDays className="mb-3 h-5 w-5 text-primary"/>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
        </button>)}
      </div>
      <div className="mt-6 rounded-xl border border-border/70 bg-secondary/35 p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Como funciona:</strong> o ZIP é criado somente quando você clicar em baixar. A seleção diária, semanal ou mensal indica sua rotina desejada; o arquivo inclui todos os registros atuais, não apenas alterações recentes. Nenhum download automático é agendado.
      </div>
      <Button className="mt-6 w-full gap-2 sm:w-auto" size="lg" disabled={busy} onClick={()=>void generate()}>
        <Download className="h-4 w-4"/>{busy?"Preparando seu backup...":"Baixar backup completo em ZIP"}
      </Button>
      {busy&&<p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{progress||"Reunindo dados..."}</p>}
      {lastFile&&<p role="status" className="mt-4 flex items-center gap-2 break-all text-sm text-primary"><ShieldCheck className="h-4 w-4 shrink-0"/>Backup gerado: {lastFile}</p>}
    </div>
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg"><FileArchive className="h-5 w-5 text-primary"/> O que será salvo?</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Todos os cadastros e seus detalhes, histórico comercial, corretoras e corretores vinculados, personalização da vitrine e arquivos de fotos armazenados no CASAS.
        Não inclui senhas nem sessões de login. Se alguma imagem não puder ser copiada, o backup será interrompido para evitar um ZIP incompleto.
      </p>
      <p className="mt-3 text-sm font-medium">Atenção: este arquivo contém dados pessoais. Guarde-o em local privado, preferencialmente com proteção por senha. A importação/restauração ainda não é automática.</p>
      <p className="mt-2 text-xs text-muted-foreground">Para bases superiores a 220 MB, será necessária uma exportação assistida pelo administrador.</p>
    </div>
  </div>;
}
