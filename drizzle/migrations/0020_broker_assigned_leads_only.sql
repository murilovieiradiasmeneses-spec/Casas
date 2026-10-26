-- 0020: broker inbox is strictly assignment-based.
-- Agency owners/editors create leads and forward them to an active broker.
-- Brokers see only assigned records and may handle their existing own contacts,
-- visits and deals. Brokers cannot create self-assigned leads or reassign leads.
BEGIN;

DROP POLICY IF EXISTS "CRM leads insert" ON public.crm_leads;
CREATE POLICY "CRM leads insert" ON public.crm_leads FOR INSERT TO authenticated
WITH CHECK (public.crm_is_manager(agency_id));

DROP POLICY IF EXISTS "CRM leads select" ON public.crm_leads;
CREATE POLICY "CRM leads select" ON public.crm_leads FOR SELECT TO authenticated
USING (
  public.crm_is_manager(agency_id)
  OR (
    assigned_agent_id IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.crm_salespeople s
      WHERE s.id=crm_leads.assigned_agent_id
        AND s.agency_id=crm_leads.agency_id
        AND s.user_id=auth.uid() AND s.active=true
        AND public.crm_is_agent(crm_leads.agency_id)
    )
  )
);

DROP POLICY IF EXISTS "CRM leads update" ON public.crm_leads;
CREATE POLICY "CRM leads update" ON public.crm_leads FOR UPDATE TO authenticated
USING (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(id))
WITH CHECK (
  public.crm_is_manager(agency_id)
  OR (
    public.crm_is_agent(agency_id)
    AND assigned_agent_id IN (
      SELECT s.id FROM public.crm_salespeople s
      WHERE s.agency_id=crm_leads.agency_id
        AND s.user_id=auth.uid() AND s.active=true
    )
  )
);

-- Ensure the RLS relation between a deal/visit and its underlying lead is
-- explicitly checked against the outer record, not an ambiguous column.
DROP POLICY IF EXISTS "CRM scoped insert" ON public.crm_deals;
CREATE POLICY "CRM scoped insert" ON public.crm_deals FOR INSERT TO authenticated
WITH CHECK (
  (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))
  AND EXISTS(SELECT 1 FROM public.crm_leads l
    WHERE l.id=crm_deals.lead_id AND l.agency_id=crm_deals.agency_id)
);
DROP POLICY IF EXISTS "CRM scoped update" ON public.crm_deals;
CREATE POLICY "CRM scoped update" ON public.crm_deals FOR UPDATE TO authenticated
USING (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))
WITH CHECK (
  (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))
  AND EXISTS(SELECT 1 FROM public.crm_leads l
    WHERE l.id=crm_deals.lead_id AND l.agency_id=crm_deals.agency_id)
);
DROP POLICY IF EXISTS "CRM scoped insert" ON public.crm_visits;
CREATE POLICY "CRM scoped insert" ON public.crm_visits FOR INSERT TO authenticated
WITH CHECK (
  (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))
  AND EXISTS(SELECT 1 FROM public.crm_leads l
    WHERE l.id=crm_visits.lead_id AND l.agency_id=crm_visits.agency_id)
);
DROP POLICY IF EXISTS "CRM scoped update" ON public.crm_visits;
CREATE POLICY "CRM scoped update" ON public.crm_visits FOR UPDATE TO authenticated
USING (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))
WITH CHECK (
  (public.crm_is_manager(agency_id) OR public.crm_can_read_lead(lead_id))
  AND EXISTS(SELECT 1 FROM public.crm_leads l
    WHERE l.id=crm_visits.lead_id AND l.agency_id=crm_visits.agency_id)
);

COMMENT ON TABLE public.crm_leads IS
  'Leads privados por imobiliária. Somente gestor cria/distribui; corretor só visualiza/atualiza os que lhe foram atribuídos.';
COMMIT;
