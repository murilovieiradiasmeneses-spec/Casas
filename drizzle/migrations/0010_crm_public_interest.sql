-- 0010: lead público de interesse em imóvel publicado, com consentimento explícito.
-- A função aceita dados mínimos, não fornece acesso à tabela privada.
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS consent_at timestamptz;
CREATE OR REPLACE FUNCTION public.crm_validate_lead_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.assigned_agent_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.crm_salespeople s
  WHERE s.id=NEW.assigned_agent_id AND s.agency_id=NEW.agency_id AND s.active
 ) THEN RAISE EXCEPTION 'Corretor inválido ou de outra empresa'; END IF;
 IF TG_OP='UPDATE' AND NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id
   AND NOT public.crm_is_manager(NEW.agency_id) THEN
  RAISE EXCEPTION 'Somente gestor transfere leads'; END IF;
 IF TG_OP='INSERT' AND NOT public.crm_is_manager(NEW.agency_id) THEN
  IF coalesce(pg_catalog.current_setting('casas.public_lead_submission',true),'')='yes'
    AND NEW.source='site' AND NEW.stage='novo' AND NEW.assigned_agent_id IS NULL
    AND NEW.consent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.crm_salespeople s
    WHERE s.id=NEW.assigned_agent_id AND s.user_id=auth.uid() AND s.active) THEN
    RAISE EXCEPTION 'Corretor cadastra apenas leads próprios';
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.crm_capture_interest(
  _property_id uuid, _name text, _phone text, _email text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE agency uuid; normalized text;
BEGIN
 IF _name IS NULL OR length(btrim(_name)) NOT BETWEEN 2 AND 160
    OR length(coalesce(_email,''))>254 THEN
   RAISE EXCEPTION 'Dados inválidos'; END IF;
 normalized:=pg_catalog.regexp_replace(coalesce(_phone,''),'[^0-9]','','g');
 IF length(normalized) NOT BETWEEN 10 AND 15
    OR (_email IS NOT NULL AND _email<>'' AND _email !~* '^[^ @]+@[^ @]+\.[^ @]+$') THEN
   RAISE EXCEPTION 'Informe um telefone ou e-mail válido'; END IF;
 SELECT p.agency_id INTO agency FROM public.properties p
 JOIN public.agencies a ON a.id=p.agency_id
 WHERE p.id=_property_id AND p.published=true AND a.active=true;
 IF agency IS NULL THEN RAISE EXCEPTION 'Imóvel indisponível'; END IF;
 -- Serializa uma submissão por imóvel+telefone e inibe envios repetidos em 1 hora.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(_property_id::text||normalized));
 IF EXISTS (SELECT 1 FROM public.crm_leads l
   WHERE l.agency_id=agency AND l.property_id=_property_id
     AND pg_catalog.regexp_replace(l.phone,'[^0-9]','','g')=normalized
     AND l.source='site' AND l.created_at>now()-interval '1 hour') THEN
   RETURN true;
 END IF;
 PERFORM pg_catalog.set_config('casas.public_lead_submission','yes',true);
 INSERT INTO public.crm_leads(agency_id,property_id,name,phone,email,source,stage,notes,consent_at)
 VALUES(agency,_property_id,btrim(_name),normalized,
    nullif(lower(btrim(coalesce(_email,''))),''),'site','novo',
    'Solicitou contato pela página pública do imóvel',now());
 PERFORM pg_catalog.set_config('casas.public_lead_submission','',true);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.crm_capture_interest(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_capture_interest(uuid,text,text,text)
 TO anon,authenticated;
COMMENT ON FUNCTION public.crm_capture_interest(uuid,text,text,text) IS
 'Recebe consentimento explícito do formulário. Antiduplicidade por imóvel+telefone na última hora; adicionar proteção anti-bot antes de operar em grande escala.';
