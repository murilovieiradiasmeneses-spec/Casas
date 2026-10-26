import { createFileRoute } from "@tanstack/react-router";
import { CompanyBackup } from "@/components/admin/CompanyBackup";
export const Route=createFileRoute("/cliente/backup")({
  ssr:false,
  head:()=>({meta:[{title:"Backup da imobiliária — CASAS"},{name:"robots",content:"noindex,nofollow"}]}),
  component:CompanyBackup,
});
