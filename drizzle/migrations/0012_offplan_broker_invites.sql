-- CASAS white-label: property launch phase, flexible prices and secure self-serve broker invitations.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_off_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_display_type text NOT NULL DEFAULT 'price',
  ADD COLUMN IF NOT EXISTS income_min numeric(12,2),
  ADD COLUMN IF NOT EXISTS income_max numeric(12,2);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='properties_display_mode_check') THEN
  ALTER TABLE public.properties ADD CONSTRAINT properties_display_mode_check CHECK(
    price_display_type IN ('price','income_range','consultation')
    AND (
       (price_display_type='price' AND price > 0 AND income_min IS NULL AND income_max IS NULL)
       OR (price_display_type='consultation' AND price=0 AND income_min IS NULL AND income_max IS NULL)
       OR (price_display_type='income_range' AND price=0 AND income_min > 0
         AND income_max >= income_min)
    )
  );
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS properties_off_plan_index
 ON public.properties(agency_id,is_off_plan) WHERE published=true;

CREATE TABLE IF NOT EXISTS public.crm_broker_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
 email text NOT NULL CHECK (length(btrim(email)) BETWEEN 5 AND 254),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
 token_hash text UNIQUE NOT NULL CHECK (length(token_hash)=64),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 used_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.crm_broker_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_broker_invitations FROM anon,authenticated;
GRANT ALL ON public.crm_broker_invitations TO service_role;
CREATE INDEX IF NOT EXISTS crm_invites_tenant_pending ON public.crm_broker_invitations(agency_id,expires_at)
 WHERE used_at IS NULL AND revoked_at IS NULL;

-- Secret token is only returned once to the person generating the invite.
CREATE OR REPLACE FUNCTION public.crm_create_broker_invite(_agency uuid,_email text,_name text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE secret text; normalized text; pending_count int;
BEGIN
 IF NOT public.crm_is_owner(_agency) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 normalized:=lower(btrim(coalesce(_email,'')));
 IF normalized !~* '^[^ @]+@[^ @]+\.[^ @]+$' OR length(normalized)>254 OR
   length(btrim(coalesce(_name,''))) NOT BETWEEN 2 AND 120 THEN
   RAISE EXCEPTION 'Nome ou e-mail inválidos';
 END IF;
 PERFORM 1 FROM public.agencies WHERE id=_agency AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 IF EXISTS(SELECT 1 FROM public.crm_salespeople WHERE agency_id=_agency AND lower(email)=normalized AND active)
 THEN RAISE EXCEPTION 'Este corretor já possui acesso'; END IF;
 UPDATE public.crm_broker_invitations SET revoked_at=now()
 WHERE agency_id=_agency AND lower(email)=normalized AND used_at IS NULL AND revoked_at IS NULL;
 SELECT count(*)::int INTO pending_count FROM public.crm_broker_invitations
 WHERE agency_id=_agency AND used_at IS NULL AND revoked_at IS NULL AND expires_at>now();
 IF public.crm_count_seats(_agency)+pending_count>=public.crm_max_users(_agency) THEN
  RAISE EXCEPTION 'Limite de convites e usuários atingido. Evolua o plano ou aguarde o vencimento dos convites';
 END IF;
 secret:=encode(gen_random_bytes(24),'hex');
 INSERT INTO public.crm_broker_invitations(agency_id,email,name,token_hash,created_by)
 VALUES(_agency,normalized,btrim(_name),
   encode(sha256(convert_to(secret,'UTF8')),'hex'),auth.uid());
 RETURN secret;
END $$;

-- A person with an invitation can check only the matching invite information.
CREATE OR REPLACE FUNCTION public.crm_invite_details(_token text)
 RETURNS TABLE(agency_name text,email text,broker_name text,expires_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT a.name,i.email,i.name,i.expires_at
 FROM public.crm_broker_invitations i
 JOIN public.agencies a ON a.id=i.agency_id
 WHERE length(_token)=48
 AND i.token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex')
 AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now()
 AND a.active=true
 LIMIT 1
$$;

-- Redeem the invitation only for the confirmed email in Supabase Auth;
-- locks serialize seat checks and prevents duplicate redemptions.
CREATE OR REPLACE FUNCTION public.crm_redeem_broker_invite(_token text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE invited public.crm_broker_invitations%ROWTYPE; current_email text;
BEGIN
 IF auth.uid() IS NULL OR length(coalesce(_token,''))<>48 THEN RAISE EXCEPTION 'Entre com sua conta para continuar'; END IF;
 SELECT lower(email) INTO current_email FROM auth.users
 WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF current_email IS NULL THEN RAISE EXCEPTION 'Confirme seu e-mail antes de ativar o acesso'; END IF;
 SELECT * INTO invited FROM public.crm_broker_invitations
 WHERE token_hash=encode(sha256(convert_to(_token,'UTF8')),'hex');
 IF invited.id IS NULL THEN RAISE EXCEPTION 'Convite inválido'; END IF;
 PERFORM 1 FROM public.agencies WHERE id=invited.agency_id AND active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imobiliária indisponível'; END IF;
 SELECT * INTO invited FROM public.crm_broker_invitations WHERE id=invited.id FOR UPDATE;
 IF invited.used_at IS NOT NULL OR invited.revoked_at IS NOT NULL OR invited.expires_at<=now()
 THEN RAISE EXCEPTION 'Convite expirado ou utilizado'; END IF;
 IF current_email<>invited.email THEN RAISE EXCEPTION 'Entre com o e-mail convidado para usar este acesso'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.agency_members WHERE agency_id=invited.agency_id AND user_id=auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.crm_salespeople WHERE agency_id=invited.agency_id AND user_id=auth.uid() AND active)
 AND public.crm_count_seats(invited.agency_id)>=public.crm_max_users(invited.agency_id)
 THEN RAISE EXCEPTION 'Limite de usuários atingido'; END IF;
 INSERT INTO public.crm_salespeople(agency_id,user_id,name,email,active)
 VALUES(invited.agency_id,auth.uid(),invited.name,invited.email,true)
 ON CONFLICT(agency_id,user_id) DO UPDATE SET name=excluded.name,email=excluded.email,active=true;
 UPDATE public.crm_broker_invitations SET used_at=now() WHERE id=invited.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.crm_create_broker_invite(uuid,text,text),
 public.crm_invite_details(text),public.crm_redeem_broker_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_create_broker_invite(uuid,text,text),
 public.crm_redeem_broker_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_invite_details(text) TO anon,authenticated;
