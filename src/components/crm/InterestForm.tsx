import { useState } from "react";
import { toast } from "sonner";
import { Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InterestForm({propertyId,agencyName}:{propertyId:string;agencyName:string}) {
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [consent,setConsent]=useState(false);
  const [honeypot,setHoneypot]=useState("");
  const [sending,setSending]=useState(false);
  const [success,setSuccess]=useState(false);
  async function send(e:React.FormEvent){
    e.preventDefault();
    if(honeypot)return;
    if(!consent)return toast.error("É necessário autorizar o contato.");
    if(name.trim().length<2||phone.replace(/\D/g,"").length<10)
      return toast.error("Informe seu nome e um telefone válido com DDD.");
    setSending(true);
    try{
      const {error}=await supabase.rpc("crm_capture_interest",{
        _property_id:propertyId,
        _name:name.trim(),
        _phone:phone.trim(),
        _email:email.trim()||undefined,
      });
      if(error)throw error;
      setSuccess(true);
      toast.success("Solicitação recebida pela imobiliária.");
    }catch{
      toast.error("Não foi possível enviar agora. Tente novamente ou use o WhatsApp.");
    }finally{setSending(false);}
  }
  if(success)return <div role="status" className="mt-6 rounded-xl bg-secondary p-5 text-sm">
    <ShieldCheck className="mb-2 h-6 w-6 text-primary"/>
    <p className="font-semibold">Solicitação enviada!</p>
    <p className="mt-1 text-muted-foreground">Sua mensagem foi encaminhada para {agencyName}. O contato será feito pela equipe.</p>
  </div>;
  return <form onSubmit={send} className="mt-6 space-y-3 border-t border-border/70 pt-6">
    <h3 className="text-lg">Solicite um contato</h3>
    <p className="text-xs text-muted-foreground">Seus dados serão enviados exclusivamente para a imobiliária deste anúncio.</p>
    <div className="space-y-1.5"><Label htmlFor={"interest-name-"+propertyId}>Nome</Label><Input id={"interest-name-"+propertyId} autoComplete="name" required minLength={2} maxLength={160} placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)}/></div>
    <div className="space-y-1.5"><Label htmlFor={"interest-phone-"+propertyId}>WhatsApp com DDD</Label><Input id={"interest-phone-"+propertyId} type="tel" autoComplete="tel" required placeholder="(17) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
    <div className="space-y-1.5"><Label htmlFor={"interest-email-"+propertyId}>E-mail (opcional)</Label><Input id={"interest-email-"+propertyId} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></div>
    <div aria-hidden="true" className="absolute -left-[9999px]"><label htmlFor={"interest-website-"+propertyId}>Site</label><input tabIndex={-1} id={"interest-website-"+propertyId} value={honeypot} onChange={e=>setHoneypot(e.target.value)}/></div>
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
      <input type="checkbox" className="mt-1" checked={consent} required onChange={e=>setConsent(e.target.checked)}/>
      Autorizo {agencyName} a utilizar meus dados para entrar em contato sobre este imóvel.
    </label>
    <Button type="submit" className="w-full" disabled={sending}>{sending?"Enviando...":<><Send className="h-4 w-4"/> Enviar interesse</>}</Button>
  </form>;
}
