import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route=createFileRoute("/convite")({
  ssr:false,
  head:()=>({meta:[{title:"Convite para corretor — CASAS"},{name:"robots",content:"noindex,nofollow"}]}),
  component:BrokerInvitation,
});
type InviteInfo={ agency_name:string; email:string; broker_name:string; expires_at:string };
function BrokerInvitation(){
  const navigate=useNavigate(), qc=useQueryClient();
  const token=typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("codigo")??"";
  const [mode,setMode]=useState<"register"|"login">("register");
  const [password,setPassword]=useState("");
  const [repeat,setRepeat]=useState("");
  const [busy,setBusy]=useState(false);
  const [needsConfirmation,setNeedsConfirmation]=useState(false);
  const [userEmail,setUserEmail]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const invite=useQuery<InviteInfo|null>({
    queryKey:["broker-invitation",token], enabled:!!token,
    retry:false,
    queryFn:async()=>{
      const {data,error}=await supabase.rpc("crm_invite_details",{_token:token});
      if(error)throw error;
      return data?.[0]??null;
    },
  });
  useEffect(()=>{
    let active=true;
    void supabase.auth.getUser().then(({data})=>{
      if(active){setUserEmail(data.user?.email??null);setChecked(true);}
    });
    return ()=>{active=false;};
  },[]);
  async function activate(){
    if(!token)return;
    setBusy(true);
    try{
      const {data:user,error:userError}=await supabase.auth.getUser();
      if(userError||!user.user)throw Error("Entre na sua conta antes de ativar.");
      if(user.user.email?.toLowerCase()!==invite.data?.email.toLowerCase())
        throw Error("Você precisa entrar com o e-mail indicado no convite.");
      const {error}=await supabase.rpc("crm_redeem_broker_invite",{_token:token});
      if(error)throw error;
      await qc.invalidateQueries({queryKey:["crm-broker-access"]});
      toast.success("Seu acesso de corretor foi ativado.");
      await navigate({to:"/corretor",replace:true});
    }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
  }
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!invite.data)return;
    if(password.length<10)return toast.error("Crie uma senha com pelo menos 10 caracteres.");
    if(mode==="register"&&password!==repeat)return toast.error("As senhas não conferem.");
    setBusy(true);
    try{
      if(mode==="register"){
        const {data,error}=await supabase.auth.signUp({
          email:invite.data.email,
          password,
          options:{emailRedirectTo:window.location.origin+"/convite?codigo="+encodeURIComponent(token)},
        });
        if(error)throw error;
        if(data.session){
          setUserEmail(data.user?.email??null);
          setBusy(false);
          await activate();
          return;
        }
        setNeedsConfirmation(true);
        toast.success("Verifique sua caixa de entrada para confirmar seu e-mail.");
      }else{
        const {data,error}=await supabase.auth.signInWithPassword({email:invite.data.email,password});
        if(error)throw error;
        setUserEmail(data.user.email??null);
        setBusy(false);
        await activate();
        return;
      }
    }catch(e){toast.error((e as Error).message);}finally{setBusy(false);setPassword("");setRepeat("");}
  }
  async function signOut(){
    await supabase.auth.signOut();
    setUserEmail(null);setMode("login");
  }
  const card="mx-auto max-w-xl rounded-[28px] border border-border bg-card p-6 shadow-float sm:p-10";
  return <main className="mx-auto max-w-3xl px-4 py-14">
    <div className="mb-9 text-center">
      <span className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Building2 className="h-4 w-4"/> CASAS</span>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Seu acesso como corretor</h1>
      <p className="mt-3 text-muted-foreground">Ative sua conta com segurança para atender leads e acompanhar suas negociações.</p>
    </div>
    <section className={card}>
      {!token?<p className="text-center text-destructive">Convite inválido. Solicite outro link ao gestor da imobiliária.</p>
      :invite.isLoading?<p>Verificando seu convite...</p>
      :invite.isError||!invite.data?<p className="text-center">Este link expirou ou já foi utilizado. Solicite outro convite ao gestor.</p>
      :<>
        <div className="rounded-2xl bg-secondary/50 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><ShieldCheck className="h-4 w-4"/> Convite exclusivo</p>
          <h2 className="mt-3 text-2xl font-semibold">{invite.data.agency_name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Corretor: {invite.data.broker_name}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">Conta autorizada: <strong>{invite.data.email}</strong></p>
          <p className="mt-3 text-xs text-muted-foreground">Válido até {new Date(invite.data.expires_at).toLocaleString("pt-BR")}. O link só pode ser ativado uma vez.</p>
        </div>
        {!checked?<p className="mt-6 text-center text-sm">Verificando sua conta...</p>
        :userEmail? <div className="mt-6 space-y-4">
          <p className="text-sm">Você está conectado como <strong>{userEmail}</strong>.</p>
          {userEmail.toLowerCase()===invite.data.email.toLowerCase()?
            <Button className="w-full" size="lg" disabled={busy} onClick={()=>void activate()}><CheckCircle2 className="h-4 w-4"/>{busy?"Ativando...":"Ativar meu acesso"}</Button>
            :<p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">Esta conta é diferente da que recebeu o convite. Saia e entre com {invite.data.email}.</p>}
          <Button variant="outline" className="w-full" onClick={()=>void signOut()}>Sair e usar outra conta</Button>
        </div>
        :needsConfirmation?<div className="mt-6 space-y-3 text-sm">
          <p className="font-semibold">Confira o e-mail {invite.data.email}</p>
          <p className="text-muted-foreground">Se a confirmação de e-mail estiver ativada, clique no link que receber. Depois, volte a este convite e entre com a senha criada.</p>
          <Button variant="outline" className="w-full" onClick={()=>{setNeedsConfirmation(false);setMode("login");}}>Já confirmei. Entrar na conta</Button>
        </div>
        :<div className="mt-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            <button type="button" className={"rounded-lg px-4 py-2 text-sm font-semibold "+(mode==="register"?"bg-card shadow-sm":"text-muted-foreground")} onClick={()=>setMode("register")}>Criar senha</button>
            <button type="button" className={"rounded-lg px-4 py-2 text-sm font-semibold "+(mode==="login"?"bg-card shadow-sm":"text-muted-foreground")} onClick={()=>setMode("login")}>Já tenho conta</button>
          </div>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="space-y-1.5"><Label>E-mail do convite</Label><Input value={invite.data.email} disabled/></div>
            <div className="space-y-1.5"><Label htmlFor="invited-password">Senha {mode==="register"?"nova":""}</Label><Input id="invited-password" type="password" minLength={10} autoComplete={mode==="register"?"new-password":"current-password"} required value={password} onChange={e=>setPassword(e.target.value)}/></div>
            {mode==="register"&&<div className="space-y-1.5"><Label htmlFor="invited-repeat">Confirmar senha</Label><Input id="invited-repeat" type="password" minLength={10} autoComplete="new-password" required value={repeat} onChange={e=>setRepeat(e.target.value)}/></div>}
            <Button className="w-full" size="lg" disabled={busy}><LockKeyhole className="h-4 w-4"/>{busy?"Verificando...":mode==="register"?"Criar conta e aceitar convite":"Entrar e aceitar convite"}</Button>
          </form>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><KeyRound className="h-4 w-4 shrink-0"/> Você define sua própria senha. O gestor não terá acesso a ela.</p>
        </div>}
      </>}
    </section>
  </main>;
}
