import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/acesso-cliente")({
  ssr: false,
  component: ClientAccess,
  head: () => ({ meta: [
    { title: "Ativar acesso à imobiliária — CASAS" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
});

function ClientAccess() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const slug = typeof window==="undefined" ? "" : new URLSearchParams(window.location.search).get("empresa")??"";
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [mode,setMode]=useState<"register"|"login">("register");
  const [accountEmail,setAccountEmail]=useState<string|null>(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [confirmationPending,setConfirmationPending]=useState(false);
  const [confirmationEmail,setConfirmationEmail]=useState("");
  const [busy,setBusy]=useState(false);

  const agency=useQuery({
    queryKey:["client-access-company",slug], enabled:!!slug,retry:false,
    queryFn:async()=>{
      const {data,error}=await supabase.from("public_agency_profiles")
        .select("id,name,slug").eq("slug",slug).maybeSingle();
      if(error)throw error;
      return data;
    },
  });
  useEffect(()=>{
    let active=true;
    void supabase.auth.getUser().then(({data})=>{
      if(active){setAccountEmail(data.user?.email??null);setAuthChecked(true);}
    });
    const {data:subscription}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(active)setAccountEmail(session?.user?.email??null);
    });
    return ()=>{active=false;subscription.subscription.unsubscribe();};
  },[]);
  async function activate() {
    if(!agency.data)return;
    setBusy(true);
    try{
      const {error}=await supabase.rpc("activate_agency_access",{_agency:agency.data.id});
      if(error)throw error;
      await Promise.all([
        qc.invalidateQueries({queryKey:["client-access"]}),
        qc.invalidateQueries({queryKey:["admin-access"]}),
      ]);
      toast.success("Acesso à imobiliária ativado com sucesso!");
      await navigate({to:"/cliente",replace:true});
    }catch(err){toast.error((err as Error).message);}
    finally{setBusy(false);}
  }
  async function submit(event:React.FormEvent) {
    event.preventDefault();
    if(!agency.data)return;
    if(password.length<10)return toast.error("A senha deve ter no mínimo 10 caracteres.");
    if(mode==="register"&&password!==confirm)return toast.error("As senhas não conferem.");
    setBusy(true);
    try{
      if(mode==="register"){
        const {data,error}=await supabase.auth.signUp({
          email:email.trim().toLowerCase(),password,
          options:{emailRedirectTo:window.location.origin+"/acesso-cliente?empresa="+encodeURIComponent(slug)},
        });
        if(error)throw error;
        if(!data.session){
          setConfirmationEmail(email.trim().toLowerCase());
          setConfirmationPending(true);
          toast.success("Verifique seu e-mail para confirmar a nova conta.");
        }else{
          setBusy(false);
          await activate();
        }
      }else{
        const {error}=await supabase.auth.signInWithPassword({
          email:email.trim().toLowerCase(),password,
        });
        if(error)throw error;
        setBusy(false);
        await activate();
      }
    }catch(err){toast.error((err as Error).message);}
    finally{setBusy(false);setPassword("");setConfirm("");}
  }
  async function signOut(){await supabase.auth.signOut();qc.clear();setAccountEmail(null);}
  async function resendConfirmation(){
    if(!confirmationEmail)return toast.error("Informe seu e-mail primeiro.");
    setBusy(true);
    try{
      const {error}=await supabase.auth.resend({
        type:"signup",email:confirmationEmail,
        options:{emailRedirectTo:window.location.origin+"/acesso-cliente?empresa="+encodeURIComponent(slug)},
      });
      if(error)throw error;
      toast.success("Se o cadastro estiver aguardando confirmação, um novo e-mail será enviado.");
    }catch(e){toast.error((e as Error).message);}
    finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
    <div className="mb-8 text-center">
      <span className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground"><Building2 className="h-4 w-4"/> CASAS</span>
      <h1 className="mt-6 text-4xl font-bold">Ativar novo acesso</h1>
      <p className="mt-3 text-sm text-muted-foreground">Use o e-mail autorizado pelo administrador para criar sua senha, confirmar o endereço e acessar a imobiliária.</p>
    </div>
    <section className="mx-auto max-w-xl rounded-[26px] border bg-card p-6 shadow-float sm:p-9">
      {!slug||agency.isError||(!agency.isLoading&&!agency.data)
      ?<p className="text-sm text-destructive">Imobiliária não encontrada. Solicite o link correto ao administrador.</p>
      :agency.isLoading?<p className="text-sm text-muted-foreground">Consultando a imobiliária...</p>
      :<>
        <div className="rounded-2xl bg-secondary/50 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><ShieldCheck className="h-4 w-4"/> Cadastro autorizado pelo master</p>
          <h2 className="mt-3 text-2xl font-semibold">{agency.data.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Somente e-mails autorizados podem ativar o acesso. A confirmação protege sua conta; se for uma transferência, o acesso anterior continua válido até a ativação.</p>
        </div>
        {!authChecked?<p className="mt-6 text-sm">Verificando sua conta...</p>:
          accountEmail?<div className="mt-6 space-y-4">
            <p className="text-sm">Conectado como <strong>{accountEmail}</strong>.</p>
            <Button className="w-full" disabled={busy} onClick={()=>void activate()}><CheckCircle2 className="h-4 w-4"/>{busy?"Ativando...":"Ativar acesso autorizado"}</Button>
            <Button className="w-full" variant="outline" onClick={()=>void signOut()}>Usar outro e-mail</Button>
            <p className="text-xs text-muted-foreground">Se a conta não estiver autorizada, solicite ao administrador master a troca do e-mail de acesso.</p>
          </div>:
          confirmationPending?<div className="mt-6 space-y-3">
            <p className="font-semibold">Confirme seu endereço de e-mail</p>
            <p className="text-sm text-muted-foreground">Verifique a caixa de entrada de {confirmationEmail}, inclusive spam. Confirme o cadastro e volte a este link para ativar o acesso.</p>
            <Button variant="outline" disabled={busy} className="w-full" onClick={()=>void resendConfirmation()}>
              {busy?"Enviando...":"Reenviar e-mail de confirmação"}
            </Button>
            <Button variant="outline" className="w-full" onClick={()=>{setConfirmationPending(false);setMode("login");}}>Já confirmei. Entrar</Button>
          </div>:<div className="mt-6">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button type="button" onClick={()=>setMode("register")} className={"rounded-lg px-4 py-2 text-sm font-semibold "+(mode==="register"?"bg-card shadow-sm":"text-muted-foreground")}>Criar conta</button>
              <button type="button" onClick={()=>setMode("login")} className={"rounded-lg px-4 py-2 text-sm font-semibold "+(mode==="login"?"bg-card shadow-sm":"text-muted-foreground")}>Já tenho senha</button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={e=>void submit(e)}>
              <div className="space-y-2"><Label htmlFor="client-change-email">E-mail autorizado</Label><Input id="client-change-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
              <div className="space-y-2"><Label htmlFor="client-change-password">{mode==="register"?"Criar senha":"Senha"}</Label><Input id="client-change-password" type="password" minLength={10} autoComplete={mode==="register"?"new-password":"current-password"} required value={password} onChange={e=>setPassword(e.target.value)}/></div>
              {mode==="register"&&<div className="space-y-2"><Label htmlFor="client-change-confirm">Confirmar senha</Label><Input id="client-change-confirm" type="password" minLength={10} autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>}
              <Button className="w-full" type="submit" disabled={busy}><LockKeyhole className="h-4 w-4"/>{busy?"Verificando...":mode==="register"?"Criar conta e ativar":"Entrar e ativar"}</Button>
            </form>
          </div>}
      </>}
    </section>
  </main>;
}
