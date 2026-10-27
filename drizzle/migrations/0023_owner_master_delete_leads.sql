-- Only the agency owner and platform master may permanently delete leads.
-- crm_is_owner checks the owner membership or the platform admin role.
-- The UI performs a two-step confirmation. PostgreSQL RLS is the enforcement layer.
DROP POLICY IF EXISTS "CRM leads delete" ON public.crm_leads;
CREATE POLICY "CRM leads delete" ON public.crm_leads
  FOR DELETE TO authenticated USING (public.crm_is_owner(agency_id));
