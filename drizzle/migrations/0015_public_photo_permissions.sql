-- 0015: Ensure media access still works when raw property/agency tables
-- are no longer queryable by anon visitors.
CREATE OR REPLACE FUNCTION public.is_published_active_property(_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS(
   SELECT 1 FROM public.properties p
   JOIN public.agencies a ON a.id=p.agency_id
   WHERE p.id=_property_id AND p.published IS TRUE AND a.active IS TRUE
 )
$$;

CREATE OR REPLACE FUNCTION public.can_read_public_property_photo(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT EXISTS(
   SELECT 1 FROM public.property_images i
   JOIN public.properties p ON p.id=i.property_id
   JOIN public.agencies a ON a.id=p.agency_id
   WHERE i.url=_path AND p.published IS TRUE AND a.active IS TRUE
 ) OR EXISTS(
   SELECT 1 FROM public.properties p
   JOIN public.agencies a ON a.id=p.agency_id
   WHERE p.cover_image_url=_path AND p.published IS TRUE AND a.active IS TRUE
 )
$$;
REVOKE ALL ON FUNCTION public.is_published_active_property(uuid),
 public.can_read_public_property_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_active_property(uuid),
 public.can_read_public_property_photo(text) TO anon,authenticated;

DROP POLICY IF EXISTS "Public reads published active listing images" ON public.property_images;
CREATE POLICY "Public reads published active listing images"
 ON public.property_images FOR SELECT TO anon,authenticated
 USING(public.is_published_active_property(property_id));

DROP POLICY IF EXISTS "Read photos of published listings or own agency"
 ON storage.objects;
CREATE POLICY "Read photos of published listings or own agency"
 ON storage.objects FOR SELECT TO anon,authenticated
 USING(
    bucket_id='property-images'
    AND (
      public.can_read_public_property_photo(name)
      OR public.can_manage_property_image_path(name)
    )
 );
