-- 0024: only the owner of an agency or platform master can delete its negotiations.
-- Editing existing negotiations remains available to managers and the broker assigned
-- to the related lead, as scoped by CRM RLS policies.
DROP POLICY IF EXISTS "CRM scoped delete" ON public.crm_deals;
CREATE POLICY "CRM owner delete" ON public.crm_deals FOR DELETE TO authenticated
  USING (public.crm_is_owner(agency_id));
COMMENT ON TABLE public.crm_deals IS
  'Agency-scoped negotiations: editable by authorized manager or assigned broker; irreversible deletion only by owner/master.';
