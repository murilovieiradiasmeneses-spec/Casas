import { createFileRoute } from "@tanstack/react-router";
import { CompanyBackup } from "@/components/admin/CompanyBackup";
export const Route=createFileRoute("/admin/backup")({
  ssr:false,
  head:()=>({meta:[{title:"Backup dos clientes — CASAS"},{name:"robots",content:"noindex,nofollow"}]}),
  component:CompanyBackup,
});
