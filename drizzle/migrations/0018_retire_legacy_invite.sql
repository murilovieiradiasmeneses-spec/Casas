-- 0018: Retire the legacy invitation RPC that called gen_random_bytes
-- without the extensions schema and produced a broken UI error.
-- Direct authorization is the only supported broker onboarding path.
CREATE OR REPLACE FUNCTION public.crm_create_broker_invite(
  _agency uuid, _email text, _name text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  RAISE EXCEPTION 'Convites antigos descontinuados. Autorize o e-mail em CRM > Equipe e compartilhe o link da imobiliária.';
END $$;
REVOKE ALL ON FUNCTION public.crm_create_broker_invite(uuid,text,text) FROM PUBLIC,anon,authenticated;
