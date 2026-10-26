
-- Restrict suspended accounts and prevent tenant owners from changing billing/control fields.
CREATE OR REPLACE FUNCTION public.can_manage_agency(_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.agency_members m
      JOIN public.agencies a ON a.id = m.agency_id
      WHERE m.agency_id = _agency_id AND m.user_id = auth.uid() AND a.active = true)
$$;
CREATE OR REPLACE FUNCTION public.can_edit_brand(_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.agency_members m
      JOIN public.agencies a ON a.id = m.agency_id
      WHERE m.agency_id = _agency_id AND m.user_id = auth.uid()
        AND m.role = 'owner' AND a.active = true)
$$;
-- Apply an immutable-owner guard to control fields, regardless of client-side forms.
CREATE OR REPLACE FUNCTION public.protect_agency_controls()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.active IS DISTINCT FROM OLD.active
       OR NEW.custom_domain IS DISTINCT FROM OLD.custom_domain
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Only platform admin may change agency control fields';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_agency_controls ON public.agencies;
CREATE TRIGGER protect_agency_controls BEFORE UPDATE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.protect_agency_controls();
