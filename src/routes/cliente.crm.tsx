import { createFileRoute } from "@tanstack/react-router";
import { useAdminAgency } from "@/contexts/AdminAgencyContext";
import { CRMWorkspace } from "@/components/crm/CRMWorkspace";
export const Route = createFileRoute("/cliente/crm")({
  ssr: false,
  component: ClientCRM,
  head: () => ({ meta: [{ title: "CRM Imobiliário — CASAS" },{ name:"robots",content:"noindex" }] }),
});
function ClientCRM(){
  const {activeAgencyId,agencies}=useAdminAgency();
  return <CRMWorkspace key={activeAgencyId} agencyId={activeAgencyId} agencyName={agencies.find(a=>a.id===activeAgencyId)?.name??"Imobiliária"} agencySlug={agencies.find(a=>a.id===activeAgencyId)?.slug??""}/>;
}
