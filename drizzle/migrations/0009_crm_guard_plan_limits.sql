-- 0009 CRM: impedir redução indevida de limite de usuários por SQL direto.
CREATE OR REPLACE FUNCTION public.crm_validate_plan_seats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.max_users < public.crm_count_seats(NEW.agency_id) THEN
  RAISE EXCEPTION 'O novo plano não suporta os usuários ativos. Desative usuários antes';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_validate_plan_seats ON public.crm_settings;
CREATE TRIGGER crm_validate_plan_seats BEFORE INSERT OR UPDATE ON public.crm_settings
 FOR EACH ROW EXECUTE FUNCTION public.crm_validate_plan_seats();
