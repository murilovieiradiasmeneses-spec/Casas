import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/properties";
import { createZip, type ZipEntry } from "@/lib/zip";

export type BackupCadence = "diario" | "semanal" | "mensal";
export type BackupProgress = (message: string) => void;
const PAGE = 500;
const MAX_BYTES = 220 * 1024 * 1024; // browser safety; no incomplete archives are emitted

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };
async function paginate(load: (from: number, to: number) => PromiseLike<Result>): Promise<Row[]> {
  const collected:Row[]=[];
  for(let offset=0;;offset+=PAGE) {
    const {data,error}=await load(offset,offset+PAGE-1);
    if(error)throw Error(error.message);
    collected.push(...(data??[]));
    if(!data||data.length<PAGE)return collected;
    if(offset>100000)throw Error("O volume de registros excede o limite deste backup pelo navegador.");
  }
}
function safePath(raw:unknown, bucket:string):string|null {
  if(typeof raw!=="string"||!raw.trim())return null;
  let path=raw.trim();
  if(/^https?:\/\//i.test(path)){
    try {
      const url=new URL(path);
      const index=url.pathname.indexOf("/"+bucket+"/");
      if(index<0)return null;
      path=decodeURIComponent(url.pathname.slice(index+bucket.length+2));
    }catch{return null;}
  }
  if(path.startsWith("/"))path=path.slice(1);
  if(!path||path.includes("..")||/[\u0000-\u001f]/.test(path))return null;
  return path;
}
function dateFile(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function nameFile(raw:string){
  return raw.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"") || "imobiliaria";
}

/** Full isolated snapshot with related media. Never backups passwords/auth sessions. */
export async function downloadCompanyBackup(
  agencyId:string,
  cadence:BackupCadence,
  options:{ isMaster?:boolean; onProgress?:BackupProgress } = {},
):Promise<{filename:string;bytes:number;files:number}> {
  const notify=options.onProgress??(()=>{});
  if(!["diario","semanal","mensal"].includes(cadence))throw Error("Frequência inválida.");
  notify("Verificando permissões...");
  const {data:user,error:userError}=await supabase.auth.getUser();
  if(userError||!user.user)throw Error("Faça login para baixar o backup.");
  const {data:owner,error:ownerError}=await supabase.rpc("crm_is_owner",{_agency:agencyId});
  if(ownerError||!owner)throw Error("Somente o proprietário ou administrador master pode exportar este backup.");

  notify("Copiando cadastros e registros do CRM...");
  const agencyRes=await supabase.from("agencies").select("*").eq("id",agencyId).single();
  if(agencyRes.error||!agencyRes.data)throw Error("Não foi possível carregar esta imobiliária.");
  const agency=agencyRes.data;

  const [properties,leads,visits,deals,brokers,settings]=await Promise.all([
    paginate((a,b)=>supabase.from("properties").select("*").eq("agency_id",agencyId).order("id").range(a,b)),
    paginate((a,b)=>supabase.from("crm_leads").select("*").eq("agency_id",agencyId).order("id").range(a,b)),
    paginate((a,b)=>supabase.from("crm_visits").select("*").eq("agency_id",agencyId).order("id").range(a,b)),
    paginate((a,b)=>supabase.from("crm_deals").select("*").eq("agency_id",agencyId).order("id").range(a,b)),
    paginate((a,b)=>supabase.from("crm_salespeople").select("*").eq("agency_id",agencyId).order("id").range(a,b)),
    paginate((a,b)=>supabase.from("crm_settings").select("*").eq("agency_id",agencyId).range(a,b)),
  ]);
  const {data:authorizations,error:authError}=await supabase.rpc("crm_list_authorized_brokers",{_agency:agencyId});
  if(authError)throw Error(authError.message);

  let billing:Row[]|null=null;
  if(options.isMaster){
    billing=await paginate((a,b)=>supabase.from("agency_billing").select("*").eq("agency_id",agencyId).range(a,b));
  }

  const propertyIds=properties.map(p=>String(p.id));
  const images:Row[]=[];
  for(let offset=0;offset<propertyIds.length;offset+=50){
    const batch=propertyIds.slice(offset,offset+50);
    if(!batch.length)continue;
    images.push(...await paginate((a,b)=>supabase.from("property_images")
      .select("*").in("property_id",batch).order("id").range(a,b)));
  }
  const now=new Date().toISOString();
  const entries:ZipEntry[]=[];
  const assets=new Map<string,{bucket:string;path:string}>();
  for(const p of properties){
    const path=safePath(p.cover_image_url,BUCKET);
    if(path)assets.set(BUCKET+":"+path,{bucket:BUCKET,path});
  }
  for(const p of images){
    const path=safePath(p.storage_path||p.url,BUCKET);
    if(path)assets.set(BUCKET+":"+path,{bucket:BUCKET,path});
  }
  for(const key of ["logo_url","hero_url"]){
    const path=safePath(agency[key as keyof typeof agency],"agency-branding");
    if(path)assets.set("agency-branding:"+path,{bucket:"agency-branding",path});
  }

  const payload={
    format:"casas-full-company-backup",version:1,created_at:now,cadence,
    agency_id:agencyId,agency_slug:agency.slug,
    details:"Exportação completa dos registros disponíveis ao proprietário no momento do download.",
    agency,properties,property_images:images,
    crm_leads:leads,crm_visits:visits,crm_deals:deals,
    crm_salespeople:brokers,crm_settings:settings,
    broker_authorizations:authorizations??[],
    ...(billing!==null?{agency_billing:billing}:{}),
    media:([...assets.values()]).map(a=>({bucket:a.bucket,storage_path:a.path,zip_path:"midia/"+a.bucket+"/"+a.path})),
    omitted:["senhas","tokens de sessão","contas e credenciais do provedor de autenticação"],
  };
  entries.push({path:"backup.json",data:JSON.stringify(payload,null,2)});
  entries.push({path:"LEIA-ME.txt",data:[
    "CASAS | BACKUP DA IMOBILIÁRIA",
    "Empresa: "+agency.name,
    "Data da cópia: "+now,
    "Frequência escolhida: "+cadence,
    "",
    "Este é um backup completo do momento do download (não apenas alterações recentes).",
    "backup.json contém os imóveis, imagens (metadados), CRM, equipe e identidade visual.",
    "A pasta midia inclui as imagens baixadas do armazenamento CASAS.",
    "O arquivo contém dados pessoais de leads e corretores: guarde-o com segurança.",
    "NUNCA publique o ZIP nem envie a terceiros sem autorização.",
    "Este backup não inclui senhas, sessões ou logins do provedor de autenticação.",
    "A restauração não é automática; requer procedimento de recuperação assistida.",
    "Em caso de mídia inacessível, a geração é interrompida (nenhum ZIP parcial).",
  ].join("\n")});

  let total=entries.reduce((n,f)=>n+(typeof f.data==="string"?new TextEncoder().encode(f.data).length:f.data.length),0);
  let count=0;
  for(const {bucket,path} of assets.values()){
    notify("Baixando imagens ("+(++count)+"/"+assets.size+")...");
    let file:Blob;
    if(bucket==="agency-branding"){
      const {data}=supabase.storage.from(bucket).getPublicUrl(path);
      const response=await fetch(data.publicUrl);
      if(!response.ok)throw Error("Imagem da marca indisponível: "+path);
      file=await response.blob();
    }else{
      const {data,error}=await supabase.storage.from(bucket).download(path);
      if(error||!data)throw Error("Não foi possível copiar a imagem: "+path);
      file=data;
    }
    total+=file.size;
    if(total>MAX_BYTES)throw Error("Backup maior que 220 MB. Solicite uma exportação assistida para este volume.");
    entries.push({path:"midia/"+bucket+"/"+path,data:new Uint8Array(await file.arrayBuffer())});
  }
  notify("Gerando o arquivo ZIP...");
  const zip=createZip(entries);
  const filename="casas-"+nameFile(agency.slug)+"-"+cadence+"-"+dateFile()+".zip";
  const url=URL.createObjectURL(zip);
  try{
    const a=document.createElement("a");
    a.href=url;a.download=filename;a.style.display="none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}
  return {filename,bytes:zip.size,files:entries.length};
}
