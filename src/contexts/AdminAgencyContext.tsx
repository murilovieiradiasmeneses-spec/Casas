import { createContext, useContext } from "react";
import type { Agency } from "@/lib/properties";

export type AgencyOption = Pick<Agency, "id" | "name" | "slug">;
export type AdminAgencyContextValue = {
  activeAgencyId: string;
  agencies: AgencyOption[];
  isPlatformAdmin: boolean;
  setActiveAgencyId: (id: string) => void;
};
export const AdminAgencyContext = createContext<AdminAgencyContextValue | null>(null);
export function useAdminAgency() {
  const value = useContext(AdminAgencyContext);
  if (!value) throw new Error("useAdminAgency precisa estar dentro de /admin.");
  return value;
}
