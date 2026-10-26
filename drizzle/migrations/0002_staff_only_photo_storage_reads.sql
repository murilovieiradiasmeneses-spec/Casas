DROP POLICY IF EXISTS "Read photos of published listings or own agency" ON storage.objects;
CREATE POLICY "Agency staff read own property photos"
 ON storage.objects FOR SELECT TO authenticated
 USING(
   bucket_id='property-images'
   AND (select auth.uid()) IS NOT NULL
   AND public.can_manage_property_image_path(name)
 );