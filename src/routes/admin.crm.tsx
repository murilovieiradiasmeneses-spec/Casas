import { createFileRoute } from "@tanstack/react-router";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { CRMWorkspace } from "@/components/crm/CRMWorkspace";
export const Route = createFileRoute("/admin/crm")({
  ssr: false,
  component: MasterCRM,
  head: () => ({ meta: [{ title: "CRM Master — CASAS" },{ name:"robots",content:"noindex" }] }),
});
function MasterCRM(){
  const {activeAgencyId,agencies,isPlatformAdmin}=useAdminAgency();
  return <CRMWorkspace agencyId={activeAgencyId} agencyName={agencies.find(a=>a.id===activeAgencyId)?.name??"Imobiliária"} isMaster={isPlatformAdmin}/>;
}
