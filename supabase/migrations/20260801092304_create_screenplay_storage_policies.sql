/*
# WhittleScript — Screenplay Storage Policies

RLS policies for the 'screenplays' storage bucket. Writers can upload,
read, and delete their own files (organized by user_id prefix).
*/

-- Storage objects policies for 'screenplays' bucket
DROP POLICY IF EXISTS "screenplays_storage_read_own" ON storage.objects;
CREATE POLICY "screenplays_storage_read_own" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'screenplays' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "screenplays_storage_insert_own" ON storage.objects;
CREATE POLICY "screenplays_storage_insert_own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'screenplays' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "screenplays_storage_update_own" ON storage.objects;
CREATE POLICY "screenplays_storage_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'screenplays' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'screenplays' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "screenplays_storage_delete_own" ON storage.objects;
CREATE POLICY "screenplays_storage_delete_own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'screenplays' AND (storage.foldername(name))[1] = auth.uid()::text);
