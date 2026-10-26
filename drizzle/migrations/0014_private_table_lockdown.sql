-- 0014: Enforce public-safe reads and remove excessive grants.
-- Apply only after the app reads public_* views (migration 0013).
BEGIN;

-- The public must not query base tables containing private property addresses
-- or inactive agencies. Authenticated managers retain base table access via RLS.
DROP POLICY IF EXISTS "Agencies public read" ON public.agencies;
DROP POLICY IF EXISTS "Agencies private owner read" ON public.agencies;
CREATE POLICY "Agencies private owner read" ON public.agencies
  FOR SELECT TO authenticated USING (public.can_manage_agency(id));

DROP POLICY IF EXISTS "Public reads active published listings" ON public.properties;

REVOKE ALL ON TABLE public.agencies,public.properties FROM PUBLIC,anon;
REVOKE ALL ON TABLE public.agency_members,public.user_roles,
  public.crm_salespeople,public.crm_settings FROM PUBLIC,anon;
-- Image metadata may be read anonymously, subject to the existing RLS policy
-- that checks both published property and active agency.
REVOKE ALL ON TABLE public.property_images FROM PUBLIC,anon;
GRANT SELECT ON TABLE public.property_images TO anon,authenticated;

-- CRMs must not be accessible without a logged-in broker/manager.
REVOKE ALL ON TABLE public.crm_leads,public.crm_deals,public.crm_visits,
  public.crm_broker_invitations,public.agency_billing FROM PUBLIC,anon;

-- Prevent extra structural database privileges not required for app users.
REVOKE TRUNCATE,REFERENCES,TRIGGER ON ALL TABLES IN SCHEMA public
  FROM anon,authenticated;

-- Restore only intended grants to the authenticated client role.
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.properties TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.agencies TO authenticated;
GRANT SELECT ON TABLE public.agency_members,public.user_roles TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.property_images TO authenticated;
GRANT SELECT ON TABLE public.crm_salespeople TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.crm_leads,public.crm_deals,public.crm_visits TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.crm_settings TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.agency_billing TO authenticated;

-- Protect tenant data via RLS, even for authenticated non-members.
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- The two read-only projections remain accessible to all visitors.
GRANT SELECT ON public.public_property_listings,public.public_agency_profiles TO anon,authenticated;
COMMIT;
