import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route=createFileRoute("/acesso-corretor")({
  ssr:false,
  head:()=>({meta:[{title:"Acesso de corretores — CASAS"},{name:"robots",content:"noindex,nofollow"}]}),
  component:BrokerAccess,
});
function BrokerAccess(){
  const qc=useQueryClient();
  const slug=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("empresa")??"":"";
  const [mode,setMode]=useState<"register"|"login">("register");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [sessionEmail,setSessionEmail]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const [needsEmailConfirmation,setNeedsEmailConfirmation]=useState(false);
  const [confirmationEmail,setConfirmationEmail]=useState("");
  const agency=useQuery({
    queryKey:["broker-company",slug],enabled:!!slug,retry:false,
    queryFn:async()=>{
      const {data,error}=await supabase.from("public_agency_profiles")
        .select("id,name,slug").eq("slug",slug).maybeSingle();
      if(error)throw error;
      return data;
    },
  });
  useEffect(()=>{
    let alive=true;
    void supabase.auth.getUser().then(({data})=>{
      if(alive){setSessionEmail(data.user?.email??null);setChecked(true);}
    });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(alive)setSessionEmail(session?.user?.email??null);
    });
    return ()=>{alive=false;listener.subscription.unsubscribe();};
  },[]);
  async function activate(){
    if(!agency.data)return;
    setBusy(true);
    try{
      const {error}=await supabase.rpc("crm_activate_authorized_broker",{_agency:agency.data.id});
      if(error)throw error;
      await qc.invalidateQueries({queryKey:["crm-broker-access"]});
      toast.success("Seu acesso ao CRM está ativo.");
      // Preserve the company requested in this link even when the user works for
      // multiple agencies. A full navigation refreshes auth-bound caches.
      window.location.replace("/corretor?empresa="+encodeURIComponent(slug));
    }catch(e){toast.error((e as Error).message);}
    finally{setBusy(false);}
  }
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!agency.data)return;
    if(password.length<10)return toast.error("Informe uma senha com pelo menos 10 caracteres.");
    if(mode==="register"&&password!==confirm)return toast.error("As senhas não conferem.");
    setBusy(true);
    try{
      if(mode==="register"){
        const {data,error}=await supabase.auth.signUp({
          email:email.trim().toLowerCase(),password,
          options:{emailRedirectTo:window.location.origin+"/acesso-corretor?empresa="+encodeURIComponent(slug)},
        });
        if(error)throw error;
        if(!data.session){
          setConfirmationEmail(email.trim().toLowerCase());
          setNeedsEmailConfirmation(true);
          toast.success("Verifique seu e-mail e confirme seu cadastro. Depois volte a esta página.");
        }else{
          await activate();
        }
      }else{
        const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
        if(error)throw error;
        await activate();
      }
    }catch(e){toast.error((e as Error).message);}
    finally{setBusy(false);setPassword("");setConfirm("");}
  }
  async function resendConfirmation(){
    if(!confirmationEmail)return toast.error("Informe seu e-mail primeiro.");
    setBusy(true);
    try{
      const {error}=await supabase.auth.resend({
        type:"signup",email:confirmationEmail,
        options:{emailRedirectTo:window.location.origin+"/acesso-corretor?empresa="+encodeURIComponent(slug)},
      });
      if(error)throw error;
      toast.success("Se a conta ainda estiver pendente, um novo e-mail de confirmação será enviado.");
    }catch(e){toast.error((e as Error).message);}
    finally{setBusy(false);}
  }
  async function signOut(){
    await supabase.auth.signOut();
    qc.clear();
    setSessionEmail(null);
  }
  return <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
    <div className="mb-8 text-center">
      <span className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 font-semibold text-primary-foreground"><Building2 className="h-4 w-4"/> CASAS</span>
      <h1 className="mt-6 text-4xl font-bold">Acesso do corretor</h1>
      <p className="mt-3 text-sm text-muted-foreground">Use o e-mail autorizado pelo proprietário da imobiliária para entrar no CRM.</p>
    </div>
    <section className="mx-auto max-w-xl rounded-[26px] border bg-card p-6 shadow-float sm:p-9">
      {!slug||agency.isError||(!agency.isLoading&&!agency.data)?
        <p className="text-sm text-destructive">Empresa não localizada. Solicite o link correto ao responsável.</p>:
       agency.isLoading?<p className="text-sm text-muted-foreground">Verificando a imobiliária...</p>:
      <>
        <div className="rounded-2xl bg-secondary/50 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><ShieldCheck className="h-4 w-4"/> Área comercial</p>
          <h2 className="mt-3 text-2xl font-semibold">{agency.data.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">O proprietário controla quais e-mails podem acessar esta equipe.</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Se estiver testando com outra conta no mesmo computador, abra o acesso em uma aba separada.
            Não é preciso sair do painel do proprietário em outra aba.
          </p>
        </div>
        {!checked?<p className="mt-6 text-sm">Verificando sua sessão...</p>
        :sessionEmail?<div className="mt-6 space-y-4">
          <p className="text-sm">Conectado como <strong>{sessionEmail}</strong>.</p>
          <Button className="w-full" disabled={busy} onClick={()=>void activate()}><CheckCircle2 className="h-4 w-4"/> {busy?"Verificando...":"Ativar meu acesso autorizado"}</Button>
          <Button className="w-full" variant="outline" onClick={()=>void signOut()}>Trocar de conta</Button>
          <p className="text-xs text-muted-foreground">Se seu e-mail ainda não estiver autorizado, peça ao proprietário para cadastrá-lo na aba Equipe do CRM.</p>
        </div>
        :needsEmailConfirmation?<div className="mt-6 space-y-3">
          <p className="font-semibold">Confirme seu e-mail antes de continuar</p>
          <p className="text-sm text-muted-foreground">Verifique a caixa de entrada de {confirmationEmail}, inclusive spam. Confirme o endereço e depois retorne a este link.</p>
          <Button className="w-full" variant="outline" disabled={busy} onClick={()=>void resendConfirmation()}>{busy?"Enviando...":"Reenviar e-mail de confirmação"}</Button>
          <Button className="w-full" variant="outline" onClick={()=>{setNeedsEmailConfirmation(false);setMode("login");}}>Já confirmei, fazer login</Button>
        </div>
        :<>
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button type="button" onClick={()=>setMode("register")} className={"rounded-lg px-4 py-2 text-sm font-semibold "+(mode==="register"?"bg-card shadow-sm":"text-muted-foreground")}>Criar minha conta</button>
            <button type="button" onClick={()=>setMode("login")} className={"rounded-lg px-4 py-2 text-sm font-semibold "+(mode==="login"?"bg-card shadow-sm":"text-muted-foreground")}>Já tenho senha</button>
          </div>
          <form className="mt-5 space-y-4" onSubmit={e=>void submit(e)}>
            <div className="space-y-2"><Label htmlFor="broker-email">E-mail autorizado</Label><Input id="broker-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div className="space-y-2"><Label htmlFor="broker-password">{mode==="register"?"Criar senha":"Senha"}</Label><Input id="broker-password" type="password" minLength={10} required autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></div>
            {mode==="register"&&<div className="space-y-2"><Label htmlFor="broker-confirm">Confirmar senha</Label><Input id="broker-confirm" type="password" minLength={10} autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>}
            <Button className="w-full" type="submit" disabled={busy}><LockKeyhole className="h-4 w-4"/>{busy?"Verificando...":mode==="register"?"Criar conta e ativar":"Entrar e ativar"}</Button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">A senha é privada. O acesso só será liberado após confirmar o e-mail cadastrado e validar a autorização do proprietário.</p>
        </>}
      </>}
    </section>
  </main>;
}
