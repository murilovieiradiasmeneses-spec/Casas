-- 0021: reliable self-service broker access diagnosis across multiple tenant companies.
-- Only return company links belonging to the current, authenticated account.
-- This avoids interpreting an inactive tenancy as "no wallet" and does not grant access.
CREATE OR REPLACE FUNCTION public.crm_my_broker_portfolios()
RETURNS TABLE(
  id uuid,
  agency_id uuid,
  name text,
  agency_name text,
  agency_slug text,
  agency_active boolean,
  status text,
  assigned_leads bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT s.id,s.agency_id,s.name,a.name,a.slug,a.active,
    CASE WHEN NOT a.active THEN 'empresa_suspensa'
         WHEN s.active THEN 'ativo' ELSE 'desativado' END::text AS status,
    (SELECT count(*) FROM public.crm_leads l WHERE l.assigned_agent_id=s.id) AS assigned_leads
  FROM public.crm_salespeople s
  JOIN public.agencies a ON a.id=s.agency_id
  WHERE s.user_id=auth.uid()
  UNION ALL
  SELECT NULL::uuid,b.agency_id,b.name,a.name,a.slug,a.active,
    CASE WHEN NOT a.active THEN 'empresa_suspensa' ELSE 'pendente' END::text,
    0::bigint
  FROM public.crm_broker_authorizations b
  JOIN public.agencies a ON a.id=b.agency_id
  JOIN auth.users u ON u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL
    AND lower(u.email)=b.email
  WHERE b.revoked_at IS NULL AND b.activated_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.crm_salespeople s
      WHERE s.agency_id=b.agency_id AND s.user_id=auth.uid()
    )
  ORDER BY agency_name,agency_slug
$$;
REVOKE ALL ON FUNCTION public.crm_my_broker_portfolios() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_my_broker_portfolios() TO authenticated;
COMMENT ON FUNCTION public.crm_my_broker_portfolios() IS
 'Lists own active/inactive/pending CRM company links for current auth user; does not allow activation or reveal other users.';
